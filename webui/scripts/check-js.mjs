#!/usr/bin/env node

import { readdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const webuiRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const searchRoots = ["src", "scripts"].map((dir) => join(webuiRoot, dir));
const files = searchRoots.flatMap((dir) => findJavaScriptFiles(dir)).sort();

for (const file of files) {
  const result = spawnSync(process.execPath, ["--check", file], {
    stdio: "inherit",
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

console.log(`Checked ${files.length} JavaScript files`);

function findJavaScriptFiles(dir) {
  const files = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...findJavaScriptFiles(fullPath));
    } else if (entry.isFile() && [".js", ".mjs"].includes(extname(entry.name))) {
      files.push(fullPath);
    }
  }
  return files;
}
