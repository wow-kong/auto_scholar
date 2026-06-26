import { createServer } from "node:http";
import {
  createReadStream,
  existsSync,
  readFileSync,
  readdirSync,
  renameSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { dirname, extname, isAbsolute, join, normalize, relative, resolve, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const repoRoot = resolve(root, "..");
const configPath = resolve(repoRoot, ".as/config.yaml");
const host = process.env.HOST ?? "127.0.0.1";
const port = Number(process.env.PORT ?? 5173);
const DEFAULT_PERSONAL_KB_PATH = "../my_autoscholar";
const PAPER_STATE_FILE = "state.json";
const STATUS_VALUES = new Set(["tracking", "reading", "summarized", "archived"]);
const PRIORITY_VALUES = new Set(["high", "medium", "low"]);
const ASSET_EXTENSIONS = new Set([".gif", ".jpeg", ".jpg", ".png", ".svg", ".webp"]);

const mime = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
};

const server = createServer((req, res) => {
  const url = new URL(req.url ?? "/", `http://${req.headers.host ?? `${host}:${port}`}`);

  if (url.pathname === "/api/config.json") {
    const config = readRepoConfig();
    res.writeHead(200, {
      "cache-control": "no-store",
      "content-type": "application/json; charset=utf-8",
    });
    res.end(JSON.stringify(config, null, 2));
    return;
  }

  if (url.pathname === "/api/papers.json") {
    const config = readRepoConfig();
    const payload = readKnowledgeBasePapers(config);
    res.writeHead(200, {
      "cache-control": "no-store",
      "content-type": "application/json; charset=utf-8",
    });
    res.end(JSON.stringify(payload, null, 2));
    return;
  }

  if (url.pathname === "/api/paper-state" && req.method === "POST") {
    handlePaperStateUpdate(req, res);
    return;
  }

  if (url.pathname.startsWith("/api/kb-assets/")) {
    serveKnowledgeBaseAsset(url, res);
    return;
  }

  const pathname = url.pathname === "/" ? "/index.html" : url.pathname;
  const safePath = normalize(pathname).replace(/^(\.\.[/\\])+/, "");
  const filePath = resolve(join(root, safePath));

  if (!filePath.startsWith(root) || !existsSync(filePath) || !statSync(filePath).isFile()) {
    res.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    res.end("Not found");
    return;
  }

  res.writeHead(200, {
    "cache-control": "no-store",
    "content-type": mime[extname(filePath)] ?? "application/octet-stream",
  });
  createReadStream(filePath).pipe(res);
});

if (isDirectRun()) {
  server.listen(port, host, () => {
    console.log(`Auto Scholar webui: http://${host}:${port}`);
  });
}

function isDirectRun() {
  return Boolean(process.argv[1]) && import.meta.url === pathToFileURL(resolve(process.argv[1])).href;
}

function readRepoConfig() {
  let parsed = {};
  let error = "";

  try {
    if (existsSync(configPath)) {
      parsed = parseSimpleYaml(readFileSync(configPath, "utf8"));
    } else {
      error = "missing .as/config.yaml; using defaults";
    }
  } catch (err) {
    error = `failed to read .as/config.yaml: ${err.message}`;
  }

  const personalKnowledgeBasePath =
    parsed?.knowledge_base?.personal_path ??
    parsed?.personal_knowledge_base_path ??
    DEFAULT_PERSONAL_KB_PATH;

  return {
    configSource: ".as/config.yaml",
    personalKnowledgeBasePath,
    paperReadPath: personalKnowledgeBasePath,
    error,
  };
}

function readKnowledgeBasePapers(config) {
  const knowledgeBaseRoot = resolve(repoRoot, config.paperReadPath);
  const payload = {
    configSource: config.configSource,
    paperReadPath: config.paperReadPath,
    knowledgeBaseRoot,
    papers: [],
    error: "",
  };

  try {
    if (!existsSync(knowledgeBaseRoot) || !statSync(knowledgeBaseRoot).isDirectory()) {
      payload.error = `knowledge base path not found: ${config.paperReadPath}`;
      return payload;
    }

    const monthDirs = readdirSync(knowledgeBaseRoot, { withFileTypes: true })
      .filter((entry) => entry.isDirectory() && /^\d{6}$/.test(entry.name))
      .map((entry) => entry.name)
      .sort()
      .reverse();

    for (const month of monthDirs) {
      const monthPath = join(knowledgeBaseRoot, month);
      const paperDirs = readdirSync(monthPath, { withFileTypes: true })
        .filter((entry) => entry.isDirectory())
        .map((entry) => entry.name)
        .sort();

      for (const slug of paperDirs) {
        const articlePath = join(monthPath, slug, "article.md");
        if (!existsSync(articlePath) || !statSync(articlePath).isFile()) continue;
        payload.papers.push(readArticlePaper(articlePath, month, slug, config.paperReadPath));
      }
    }
  } catch (err) {
    payload.error = `failed to scan knowledge base: ${err.message}`;
  }

  return payload;
}

function readArticlePaper(articlePath, month, slug, paperReadPath) {
  const markdown = readFileSync(articlePath, "utf8");
  const { metadata, body } = parseArticleMarkdown(markdown);
  const paperState = readPaperState(dirname(articlePath));
  const title = metadata.title || metadata.paper_title || extractHeading(body) || slug;
  const paperTitle = metadata.paper_title || title;
  const tags = normalizeArray(metadata.tags);
  const valueTags = normalizeArray(metadata.value_tags);
  const authors = normalizeArray(metadata.authors);
  const venueYear = metadata.venue_year || "Knowledge Base";
  const yearMatch = String(venueYear).match(/\b(20\d{2}|19\d{2})\b/);
  const updatedAt = statSync(articlePath).mtime.toISOString().slice(0, 10);
  const localPath = `${paperReadPath}/${month}/${slug}/article.md`;
  const readingEvents = Array.isArray(paperState.readingEvents) ? paperState.readingEvents : [];

  return {
    id: `kb-${month}-${slug}`,
    title,
    paperTitle,
    authors,
    venue: String(venueYear).replace(/\b(20\d{2}|19\d{2})\b/, "").trim() || "Knowledge Base",
    year: yearMatch ? Number(yearMatch[1]) : Number(month.slice(0, 4)),
    collectionId: deriveCollectionId(tags, title),
    status: paperState.status || "summarized",
    priority: paperState.priority || (valueTags.length ? "high" : "medium"),
    score: valueTags.length ? 92 : 86,
    updatedAt,
    addedAt: updatedAt,
    unreadUpdates: Number(paperState.unreadUpdates ?? 0),
    topics: tags.map(normalizeTopic).filter(Boolean),
    source: "knowledge base",
    links: normalizeSourceLinks(metadata),
    abstract: extractLead(body),
    keyClaims: extractBullets(body),
    timeline: [
      ...readingEvents,
      { date: updatedAt, text: `从 ${localPath} 读取。` },
    ],
    readingEvents,
    readAt: paperState.readAt || "",
    recommended: Boolean(paperState.recommended),
    recommendedAt: paperState.recommendedAt || "",
    markdown: rewriteMarkdownAssetLinks(body.trim(), month, slug),
    localPath,
    stateKey: `${month}/${slug}`,
    origin: "knowledge-base",
  };
}

async function handlePaperStateUpdate(req, res) {
  try {
    const body = await readRequestJson(req);
    const paperId = String(body.paperId ?? "");
    const config = readRepoConfig();
    const paperDir = resolveKnowledgeBasePaperDir(body, config);

    if (!paperDir) {
      res.writeHead(404, { "content-type": "application/json; charset=utf-8" });
      res.end(JSON.stringify({ error: "knowledge-base paper not found" }));
      return;
    }

    const currentState = readPaperState(paperDir);
    const nextState = sanitizePaperState({
      ...currentState,
      ...(body.state ?? {}),
      updatedAt: new Date().toISOString(),
    });
    writePaperState(paperDir, nextState);

    res.writeHead(200, {
      "cache-control": "no-store",
      "content-type": "application/json; charset=utf-8",
    });
    res.end(JSON.stringify({ paperId, state: nextState }, null, 2));
  } catch (err) {
    res.writeHead(400, { "content-type": "application/json; charset=utf-8" });
    res.end(JSON.stringify({ error: String(err?.message ?? err) }));
  }
}

function readRequestJson(req) {
  return new Promise((resolveBody, rejectBody) => {
    let body = "";
    req.setEncoding("utf8");
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 64_000) {
        rejectBody(new Error("request body too large"));
        req.destroy();
      }
    });
    req.on("end", () => {
      try {
        resolveBody(body ? JSON.parse(body) : {});
      } catch (err) {
        rejectBody(new Error(`invalid JSON: ${err.message}`));
      }
    });
    req.on("error", rejectBody);
  });
}

function resolveKnowledgeBasePaperDir(requestBody, config) {
  const knowledgeBaseRoot = resolve(repoRoot, config.paperReadPath);
  const stateKeyDir = resolvePaperDirFromStateKey(requestBody?.stateKey, knowledgeBaseRoot);
  if (stateKeyDir) return stateKeyDir;

  const localPathDir = resolvePaperDirFromLocalPath(requestBody?.localPath, knowledgeBaseRoot);
  if (localPathDir) return localPathDir;

  const match = /^kb-(\d{6})-(.+)$/.exec(String(requestBody?.paperId ?? ""));
  if (!match) return null;
  return validPaperDir(resolve(knowledgeBaseRoot, match[1], match[2]), knowledgeBaseRoot);
}

function resolvePaperDirFromStateKey(stateKey, knowledgeBaseRoot) {
  const match = /^(\d{6})\/([^/]+)$/.exec(String(stateKey ?? ""));
  if (!match) return null;
  return validPaperDir(resolve(knowledgeBaseRoot, match[1], match[2]), knowledgeBaseRoot);
}

function resolvePaperDirFromLocalPath(localPath, knowledgeBaseRoot) {
  const text = String(localPath ?? "");
  if (!text.endsWith("/article.md")) return null;
  const resolved = resolve(repoRoot, text);
  return validPaperDir(dirname(resolved), knowledgeBaseRoot);
}

function validPaperDir(paperDir, knowledgeBaseRoot) {
  if (!isInsideDirectory(paperDir, knowledgeBaseRoot)) return null;
  if (!existsSync(join(paperDir, "article.md")) || !statSync(join(paperDir, "article.md")).isFile()) {
    return null;
  }
  return paperDir;
}

function writePaperState(paperDir, nextState) {
  const statePath = join(paperDir, PAPER_STATE_FILE);
  const tmpPath = join(paperDir, `.${PAPER_STATE_FILE}.${process.pid}.tmp`);
  writeFileSync(tmpPath, `${JSON.stringify(nextState, null, 2)}\n`, "utf8");
  renameSync(tmpPath, statePath);
}

function readPaperState(paperDir) {
  const statePath = join(paperDir, PAPER_STATE_FILE);
  try {
    if (!existsSync(statePath) || !statSync(statePath).isFile()) return {};
    return sanitizePaperState(JSON.parse(readFileSync(statePath, "utf8")));
  } catch {
    return {};
  }
}

function sanitizePaperState(value) {
  const state = {};
  if (STATUS_VALUES.has(value?.status)) state.status = value.status;
  if (PRIORITY_VALUES.has(value?.priority)) state.priority = value.priority;
  state.unreadUpdates = Math.max(0, Math.round(Number(value?.unreadUpdates ?? 0) || 0));
  state.readAt = normalizeDate(value?.readAt);
  state.recommended = Boolean(value?.recommended);
  state.recommendedAt = state.recommended ? normalizeDate(value?.recommendedAt) : "";
  state.readingEvents = normalizeTimeline(value?.readingEvents);
  state.updatedAt = normalizeTimestamp(value?.updatedAt);
  return state;
}

function normalizeTimeline(value) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => ({
      date: normalizeDate(item?.date),
      text: String(item?.text ?? "").trim().slice(0, 240),
    }))
    .filter((item) => item.date && item.text)
    .slice(0, 40);
}

function normalizeDate(value) {
  const text = String(value ?? "").trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : "";
}

function normalizeTimestamp(value) {
  const text = String(value ?? "").trim();
  return text || new Date().toISOString();
}

function serveKnowledgeBaseAsset(url, res) {
  let parts;
  try {
    parts = url.pathname
      .split("/")
      .map((part) => decodeURIComponent(part))
      .filter(Boolean);
  } catch {
    sendNotFound(res);
    return;
  }

  const [, , month, slug, ...assetParts] = parts;

  if (
    !/^\d{6}$/.test(month ?? "") ||
    !slug ||
    assetParts.length === 0 ||
    assetParts[0] !== "assets" ||
    !ASSET_EXTENSIONS.has(extname(assetParts.at(-1) ?? "").toLowerCase())
  ) {
    sendNotFound(res);
    return;
  }

  const config = readRepoConfig();
  const knowledgeBaseRoot = resolve(repoRoot, config.paperReadPath);
  const paperRoot = resolve(knowledgeBaseRoot, month, slug);
  const assetsRoot = resolve(paperRoot, "assets");
  const assetPath = resolve(paperRoot, ...assetParts);

  if (!isInsideDirectory(assetPath, assetsRoot) || !existsSync(assetPath) || !statSync(assetPath).isFile()) {
    sendNotFound(res);
    return;
  }

  res.writeHead(200, {
    "cache-control": "no-store",
    "content-type": mime[extname(assetPath)] ?? "application/octet-stream",
  });
  createReadStream(assetPath).pipe(res);
}

function sendNotFound(res) {
  res.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
  res.end("Not found");
}

function isInsideDirectory(childPath, parentPath) {
  const relativePath = relative(parentPath, childPath);
  return (
    Boolean(relativePath) &&
    relativePath !== ".." &&
    !relativePath.startsWith(`..${sep}`) &&
    !isAbsolute(relativePath)
  );
}

function rewriteMarkdownAssetLinks(markdown, month, slug) {
  return markdown.replace(/(!\[[^\]]*\]\()((?!https?:\/\/|data:|\/)[^)]+)(\))/g, (_match, prefix, path, suffix) => {
    const encodedPath = path
      .split("/")
      .map((part) => encodeURIComponent(part))
      .join("/");
    return `${prefix}/api/kb-assets/${encodeURIComponent(month)}/${encodeURIComponent(slug)}/${encodedPath}${suffix}`;
  });
}

function parseArticleMarkdown(markdown) {
  const match = /^---\n([\s\S]*?)\n---\n?([\s\S]*)$/.exec(markdown);
  if (!match) return { metadata: {}, body: markdown };
  return {
    metadata: parseSimpleYaml(match[1]),
    body: match[2],
  };
}

function normalizeArray(value) {
  if (Array.isArray(value)) return value.map(String).filter(Boolean);
  if (!value) return [];
  return [String(value)];
}

function normalizeSourceLinks(metadata) {
  const sourceLinks =
    metadata.source_links &&
    typeof metadata.source_links === "object" &&
    !Array.isArray(metadata.source_links)
      ? { ...metadata.source_links }
      : {};

  for (const [legacyKey, linkKey] of [
    ["source_pdf", "pdf"],
    ["project", "project"],
    ["code", "code"],
  ]) {
    const value = String(metadata[legacyKey] ?? "").trim();
    if (value && !sourceLinks[linkKey]) sourceLinks[linkKey] = value;
  }

  return Object.fromEntries(
    Object.entries(sourceLinks)
      .map(([key, value]) => [String(key), String(value ?? "").trim()])
      .filter(([, value]) => value),
  );
}

function normalizeTopic(value) {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function deriveCollectionId(tags, title) {
  const haystack = `${tags.join(" ")} ${title}`.toLowerCase();
  if (haystack.includes("evaluation") || haystack.includes("benchmark") || haystack.includes("cl-bench")) {
    return "evaluation";
  }
  if (haystack.includes("system") || haystack.includes("attention") || haystack.includes("kernel")) {
    return "systems";
  }
  return "agentic-rag";
}

function extractHeading(markdown) {
  return /^#\s+(.+)$/m.exec(markdown)?.[1]?.trim() ?? "";
}

function extractLead(markdown) {
  const withoutTitle = markdown.replace(/^#\s+.+\n+/, "");
  const paragraph = withoutTitle
    .split(/\n{2,}/)
    .map((part) => part.trim())
    .find((part) =>
      part &&
      !part.startsWith("#") &&
      !part.startsWith("|") &&
      !part.startsWith("```") &&
      !part.startsWith("- "),
    );
  return paragraph ? paragraph.replace(/\s+/g, " ").slice(0, 260) : "来自个人知识库的论文博客。";
}

function extractBullets(markdown) {
  const bullets = [...markdown.matchAll(/^- (.+)$/gm)]
    .map((match) => match[1].trim())
    .filter((text) => text.length > 12)
    .slice(0, 4);
  if (bullets.length) return bullets;
  return ["已生成结构化论文解读。"];
}

function parseSimpleYaml(source) {
  const data = {};
  let currentKey = null;

  for (const rawLine of source.split(/\r?\n/)) {
    const lineWithoutComment = stripYamlComment(rawLine);
    if (!lineWithoutComment.trim()) continue;

    const topLevelMatch = /^([A-Za-z0-9_-]+):\s*(.*?)\s*$/.exec(lineWithoutComment);
    if (topLevelMatch) {
      currentKey = topLevelMatch[1];
      data[currentKey] = topLevelMatch[2] ? parseScalar(topLevelMatch[2]) : [];
      continue;
    }

    const listMatch = /^\s{2}-\s*(.*?)\s*$/.exec(lineWithoutComment);
    if (listMatch && currentKey) {
      if (!Array.isArray(data[currentKey])) data[currentKey] = [];
      data[currentKey].push(parseScalar(listMatch[1]));
      continue;
    }

    const nestedMatch = /^\s{2}([A-Za-z0-9_-]+):\s*(.*?)\s*$/.exec(lineWithoutComment);
    if (nestedMatch && currentKey) {
      if (
        Array.isArray(data[currentKey]) ||
        typeof data[currentKey] !== "object" ||
        data[currentKey] === null
      ) {
        data[currentKey] = {};
      }
      data[currentKey][nestedMatch[1]] = parseScalar(nestedMatch[2]);
    }
  }

  return data;
}

function parseScalar(value) {
  const trimmed = value.trim();
  const inlineArray = parseInlineArray(trimmed);
  if (inlineArray) return inlineArray;
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function stripYamlComment(line) {
  let quote = "";
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if ((char === '"' || char === "'") && line[index - 1] !== "\\") {
      quote = quote === char ? "" : quote || char;
    }
    if (char === "#" && !quote && /\s/.test(line[index - 1] ?? "")) {
      return line.slice(0, index).trimEnd();
    }
  }
  return line;
}

function parseInlineArray(value) {
  if (value === "[]") return [];
  if (!value.startsWith("[") || !value.endsWith("]")) return null;

  const items = [];
  let current = "";
  let quote = "";
  const inner = value.slice(1, -1);
  for (let index = 0; index < inner.length; index += 1) {
    const char = inner[index];
    if ((char === '"' || char === "'") && inner[index - 1] !== "\\") {
      quote = quote === char ? "" : quote || char;
      current += char;
      continue;
    }
    if (char === "," && !quote) {
      pushInlineArrayItem(items, current);
      current = "";
      continue;
    }
    current += char;
  }
  pushInlineArrayItem(items, current);
  return items;
}

function pushInlineArrayItem(items, value) {
  const item = parseScalarWithoutInlineArray(value);
  if (item) items.push(item);
}

function parseScalarWithoutInlineArray(value) {
  const trimmed = value.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

export {
  parseSimpleYaml,
  readKnowledgeBasePapers,
  readRepoConfig,
  rewriteMarkdownAssetLinks,
  server,
};
