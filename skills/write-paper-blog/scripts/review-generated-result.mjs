import { existsSync, readFileSync, statSync } from "node:fs";
import { dirname, extname, resolve } from "node:path";

const targets = process.argv.slice(2);

if (targets.length === 0) {
  console.error(
    "Usage: node skills/write-paper-blog/scripts/review-generated-result.mjs <paper-dir-or-article.md> [...]",
  );
  process.exit(1);
}

const userStateEventPatterns = [
  /标记为已读/,
  /重新标记为未读/,
  /标记为推荐/,
  /取消推荐/,
  /星标/,
];

let failures = 0;

for (const target of targets) {
  const paperDir = resolvePaperDir(target);
  const label = paperDir || resolve(target);
  const failuresBeforeTarget = failures;

  if (!paperDir) {
    fail(label, "target must be an existing paper directory or article.md file");
    continue;
  }

  const articlePath = resolve(paperDir, "article.md");
  if (!existsSync(articlePath) || !statSync(articlePath).isFile()) {
    fail(label, "missing article.md");
    continue;
  }

  const article = readFileSync(articlePath, "utf8");
  reviewArticle(article, articlePath, paperDir);
  reviewState(paperDir, label);

  if (failures === failuresBeforeTarget) {
    console.log(`${paperDir}: ok`);
  }
}

if (failures > 0) {
  process.exit(1);
}

function reviewArticle(article, articlePath, paperDir) {
  const frontmatter = parseFrontmatter(article);
  if (!frontmatter) {
    fail(articlePath, "article.md must start with YAML frontmatter");
    return;
  }

  check(hasFrontmatterKey(frontmatter, "title"), articlePath, "frontmatter should include title");
  check(hasFrontmatterKey(frontmatter, "paper_title"), articlePath, "frontmatter should include paper_title");
  check(hasFrontmatterKey(frontmatter, "source_links"), articlePath, "frontmatter should include source_links");
  check(hasFrontmatterKey(frontmatter, "tags"), articlePath, "frontmatter should include tags");
  check(hasFrontmatterKey(frontmatter, "value_tags"), articlePath, "frontmatter should include value_tags");

  const imageRefs = [...article.matchAll(/!\[[^\]]*\]\((assets\/[^)]+)\)/g)].map((match) => match[1]);
  check(imageRefs.length > 0, articlePath, "article should reference at least one local image under assets/");

  for (const ref of imageRefs) {
    const imagePath = resolve(paperDir, ref);
    check(imagePath.startsWith(`${resolve(paperDir, "assets")}/`), articlePath, `image must stay under assets/: ${ref}`);
    check(existsSync(imagePath) && statSync(imagePath).isFile(), articlePath, `referenced image does not exist: ${ref}`);
    reviewImageDimensions(imagePath, articlePath, ref);
  }
}

function reviewImageDimensions(imagePath, articlePath, ref) {
  if (extname(imagePath).toLowerCase() !== ".png") return;

  const image = readFileSync(imagePath);
  if (image.length < 24 || image.toString("ascii", 1, 4) !== "PNG") return;

  const width = image.readUInt32BE(16);
  const height = image.readUInt32BE(20);
  check(width >= 1200, articlePath, `local PNG image is below 1200px wide (${width}x${height}): ${ref}`);
}

function reviewState(paperDir, label) {
  const statePath = resolve(paperDir, "state.json");
  if (!existsSync(statePath)) return;

  let state;
  try {
    state = JSON.parse(readFileSync(statePath, "utf8"));
  } catch (err) {
    fail(label, `invalid state.json: ${err.message}`);
    return;
  }

  check(!["high", "low"].includes(state.priority), label, "generated state must not assign high/low triage priority");
  check(state.readAt === undefined || state.readAt === "", label, "generated state must not mark the paper as read");
  check(state.recommended === undefined || state.recommended === false, label, "generated state must not mark the paper as recommended");
  check(state.recommendedAt === undefined || state.recommendedAt === "", label, "generated state must not set recommendedAt");

  const readingEvents = Array.isArray(state.readingEvents) ? state.readingEvents : [];
  for (const event of readingEvents) {
    const text = String(event?.text ?? "");
    check(
      !userStateEventPatterns.some((pattern) => pattern.test(text)),
      label,
      `generated state must not include user-state event: ${JSON.stringify(text)}`,
    );
  }
}

function parseFrontmatter(article) {
  const match = /^---\n([\s\S]*?)\n---\n?/.exec(article);
  return match?.[1] || "";
}

function hasFrontmatterKey(frontmatter, key) {
  return new RegExp(`(^|\\n)${escapeRegExp(key)}:\\s*(.*)?($|\\n)`).test(frontmatter);
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function resolvePaperDir(target) {
  const resolved = resolve(target);
  if (!existsSync(resolved)) return "";
  const stat = statSync(resolved);
  if (stat.isDirectory()) return resolved;
  if (stat.isFile() && resolved.endsWith("/article.md")) return dirname(resolved);
  return "";
}

function check(condition, label, message) {
  if (condition) return;
  fail(label, message);
}

function fail(label, message) {
  failures += 1;
  console.error(`${label}: ${message}`);
}
