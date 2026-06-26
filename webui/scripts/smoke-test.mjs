import { readFile } from "node:fs/promises";
import { strict as assert } from "node:assert";
import { spawn } from "node:child_process";
import { createServer as createNetServer } from "node:net";
import { seedPapers, collections } from "../src/data/papers.js";
import { renderMarkdown } from "../src/lib/markdown.js";
import { parseSimpleYaml, rewriteMarkdownAssetLinks } from "./serve.mjs";

const index = await readFile(new URL("../index.html", import.meta.url), "utf8");

assert(index.includes("./src/main.js"), "index.html should load the app entrypoint");
assert(index.includes("./src/styles.css"), "index.html should load app styles");
assert(seedPapers.length >= 3, "seed data should include multiple papers");
assert(collections.length >= 3, "seed data should include collections");

const html = renderMarkdown(seedPapers[0].markdown);
assert(html.includes("<h1>"), "markdown renderer should create headings");
assert(html.includes("<table>"), "markdown renderer should render simple tables");
assert(!html.includes("<script"), "markdown renderer should escape raw HTML");

const imageHtml = renderMarkdown("![overview](/api/kb-assets/202606/example/assets/fig.png)");
assert(imageHtml.includes("<img"), "markdown renderer should render knowledge-base images");
assert(imageHtml.includes('loading="lazy"'), "markdown images should lazy-load");

const tableWithCodePipe = renderMarkdown(`
| Objective | Attention |
|---|---|
| \`P(x_a | x_q)\` | PrefixLM |
`);
assert(
  tableWithCodePipe.includes("<td><code>P(x_a | x_q)</code></td><td>PrefixLM</td>"),
  "markdown tables should not split pipes inside inline code spans",
);

const mermaidHtml = renderMarkdown(`
\`\`\`mermaid
flowchart TD
  A[Paper] --> B[Blog]
\`\`\`
`);
assert(mermaidHtml.includes('data-mermaid-diagram'), "mermaid fences should render as diagram containers");
assert(mermaidHtml.includes("A[Paper] --&gt; B[Blog]"), "mermaid source should stay escaped before client render");

const metadata = parseSimpleYaml(`
title: "Hash # Inside Title"
authors: [Alice, "Bob Li"]
tags: [LLM Agent, RAG]
value_tags: []
source_links:
  pdf: "https://example.test/paper.pdf#page=2"
`);
assert.equal(metadata.title, "Hash # Inside Title", "YAML parser should preserve # inside quoted scalars");
assert.deepEqual(metadata.authors, ["Alice", "Bob Li"], "YAML parser should support inline arrays");
assert.deepEqual(metadata.tags, ["LLM Agent", "RAG"], "YAML parser should parse inline tag arrays");
assert.deepEqual(metadata.value_tags, [], "YAML parser should parse empty inline arrays");
assert.equal(
  metadata.source_links.pdf,
  "https://example.test/paper.pdf#page=2",
  "YAML parser should preserve nested links with fragments",
);

const rewrittenMarkdown = rewriteMarkdownAssetLinks("![fig](assets/fig 1.png)", "202606", "example-paper");
assert(
  rewrittenMarkdown.includes("/api/kb-assets/202606/example-paper/assets/fig%201.png"),
  "asset link rewriting should encode local asset paths",
);

await reviewServerEndpoints();

console.log("Smoke test passed");

async function reviewServerEndpoints() {
  const port = await getFreePort();
  const child = spawn(process.execPath, [new URL("./serve.mjs", import.meta.url).pathname], {
    env: { ...process.env, HOST: "127.0.0.1", PORT: String(port) },
    stdio: ["ignore", "ignore", "pipe"],
  });
  let stderr = "";
  child.stderr.on("data", (chunk) => {
    stderr += String(chunk);
  });
  const exitPromise = new Promise((resolve) => child.once("exit", resolve));

  try {
    const baseUrl = `http://127.0.0.1:${port}`;
    const config = await fetchJson(`${baseUrl}/api/config.json`);
    assert.equal(config.configSource, ".as/config.yaml", "config API should return repository config metadata");

    const papers = await fetchJson(`${baseUrl}/api/papers.json`);
    assert(Array.isArray(papers.papers), "papers API should return a papers array");
    if (papers.papers.length > 0) {
      assert("paperTitle" in papers.papers[0], "papers API should expose original paper titles");
    }

    const forbiddenAsset = await fetch(`${baseUrl}/api/kb-assets/202606/example-paper/state.json`);
    assert.equal(forbiddenAsset.status, 404, "asset API should reject non-assets paths");
  } finally {
    child.kill();
    await exitPromise;
  }

  assert.equal(stderr.trim(), "", "dev server should not write errors during smoke test");
}

async function fetchJson(url) {
  const response = await retryFetch(url);
  assert.equal(response.ok, true, `${url} should return HTTP 200`);
  return response.json();
}

async function retryFetch(url) {
  const deadline = Date.now() + 3000;
  let lastError;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url);
      return response;
    } catch (err) {
      lastError = err;
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
  }
  throw lastError;
}

function getFreePort() {
  return new Promise((resolve, reject) => {
    const server = createNetServer();
    server.on("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      const port = typeof address === "object" && address ? address.port : 0;
      server.close(() => resolve(port));
    });
  });
}
