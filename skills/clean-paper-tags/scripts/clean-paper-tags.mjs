#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';

const SEQUENCE_FIELDS = ['tags', 'value_tags'];

function usage() {
  return `Usage:
  node skills/clean-paper-tags/scripts/clean-paper-tags.mjs --root <kb-root> [--json]
  node skills/clean-paper-tags/scripts/clean-paper-tags.mjs --root <kb-root> --write-plan /tmp/tag-plan.json
  node skills/clean-paper-tags/scripts/clean-paper-tags.mjs --root <kb-root> --plan /tmp/tag-plan.json [--require-complete] [--apply] [--json]

Options:
  --root <path>          Knowledge-base root containing **/article.md files.
  --plan <path>          JSON cleanup plan with articles[].path or articles[].slug.
  --write-plan <path>    Export current tags/value_tags as a starter JSON plan.
  --apply                Write planned tag changes. Without this, run a dry-run.
  --require-complete     Require the plan to cover every article under --root.
  --json                 Print machine-readable JSON.
  --help                 Show this help.`;
}

function parseArgs(argv) {
  const opts = {
    root: null,
    plan: null,
    writePlan: null,
    apply: false,
    requireComplete: false,
    json: false,
    help: false,
  };
  const positional = [];

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--root') {
      opts.root = argv[++i];
    } else if (arg === '--plan') {
      opts.plan = argv[++i];
    } else if (arg === '--write-plan') {
      opts.writePlan = argv[++i];
    } else if (arg === '--apply') {
      opts.apply = true;
    } else if (arg === '--require-complete') {
      opts.requireComplete = true;
    } else if (arg === '--json') {
      opts.json = true;
    } else if (arg === '--help' || arg === '-h') {
      opts.help = true;
    } else if (arg.startsWith('--')) {
      throw new Error(`Unknown option: ${arg}`);
    } else {
      positional.push(arg);
    }
  }

  if (!opts.root && positional.length > 0) {
    opts.root = positional[0];
  }
  return opts;
}

function toPosix(relPath) {
  return relPath.split(path.sep).join('/');
}

function ensureInsideRoot(root, filePath) {
  const resolved = path.resolve(root, filePath);
  const rootWithSep = path.resolve(root) + path.sep;
  if (resolved !== path.resolve(root) && !resolved.startsWith(rootWithSep)) {
    throw new Error(`Path escapes root: ${filePath}`);
  }
  return resolved;
}

function findArticleFiles(root) {
  const files = [];

  function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.name === '.git' || entry.name === 'node_modules') {
        continue;
      }
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (entry.isFile() && entry.name === 'article.md') {
        files.push(fullPath);
      }
    }
  }

  walk(root);
  return files.sort();
}

function extractFrontMatter(text, filePath) {
  const match = text.match(/^---(\r?\n)([\s\S]*?)(\r?\n)---(\r?\n?)/);
  if (!match) {
    throw new Error(`Missing YAML front matter: ${filePath}`);
  }
  return {
    frontMatter: match[2].replace(/\r\n/g, '\n'),
    newline: match[1],
    closingNewline: match[4],
    body: text.slice(match[0].length),
  };
}

function serializeArticle(frontMatter, body, newline = '\n', closingNewline = '\n') {
  const serializedFrontMatter = frontMatter.replace(/\n/g, newline);
  return `---${newline}${serializedFrontMatter}${newline}---${closingNewline}${body}`;
}

function unquote(value) {
  const trimmed = value.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function parseInlineArray(raw) {
  const trimmed = raw.trim();
  if (trimmed === '[]') {
    return [];
  }
  if (!trimmed.startsWith('[') || !trimmed.endsWith(']')) {
    return null;
  }
  const inner = trimmed.slice(1, -1).trim();
  if (!inner) {
    return [];
  }
  return inner.split(',').map((item) => unquote(item)).filter(Boolean);
}

function parseSequence(frontMatter, field, filePath) {
  const lines = frontMatter.split('\n');
  for (let i = 0; i < lines.length; i += 1) {
    const match = lines[i].match(new RegExp(`^${field}:\\s*(.*)$`));
    if (!match) {
      continue;
    }

    const inline = parseInlineArray(match[1]);
    if (inline) {
      return inline;
    }
    if (match[1].trim()) {
      return [unquote(match[1])].filter(Boolean);
    }

    const values = [];
    for (let j = i + 1; j < lines.length; j += 1) {
      const item = lines[j].match(/^\s*-\s*(.*)$/);
      if (!item) {
        break;
      }
      values.push(unquote(item[1]));
    }
    return values;
  }
  throw new Error(`Missing ${field}: ${filePath}`);
}

function parseScalar(frontMatter, field) {
  const line = frontMatter.split('\n').find((candidate) => candidate.startsWith(`${field}:`));
  if (!line) {
    return '';
  }
  return unquote(line.slice(field.length + 1));
}

function uniqueStrings(values, label) {
  if (!Array.isArray(values)) {
    throw new Error(`${label} must be an array`);
  }
  const seen = new Set();
  const result = [];
  for (const raw of values) {
    if (typeof raw !== 'string') {
      throw new Error(`${label} must contain only strings`);
    }
    const value = raw.trim();
    if (!value) {
      continue;
    }
    if (value.includes('\n')) {
      throw new Error(`${label} value contains a newline: ${value}`);
    }
    if (!seen.has(value)) {
      seen.add(value);
      result.push(value);
    }
  }
  return result;
}

function renderSequence(field, values) {
  if (values.length === 0) {
    return [`${field}: []`];
  }
  return [`${field}:`, ...values.map((value) => `  - ${value}`)];
}

function replaceSequence(frontMatter, field, values) {
  const lines = frontMatter.split('\n');
  const out = [];
  let replaced = false;

  for (let i = 0; i < lines.length; i += 1) {
    if (lines[i].startsWith(`${field}:`)) {
      out.push(...renderSequence(field, values));
      replaced = true;
      i += 1;
      while (i < lines.length && /^\s*-\s*/.test(lines[i])) {
        i += 1;
      }
      i -= 1;
    } else {
      out.push(lines[i]);
    }
  }

  if (!replaced) {
    throw new Error(`Missing ${field} field while replacing`);
  }
  return out.join('\n');
}

function maskArticle(text, filePath) {
  const { frontMatter, body, newline, closingNewline } = extractFrontMatter(text, filePath);
  let masked = frontMatter;
  for (const field of SEQUENCE_FIELDS) {
    masked = replaceSequence(masked, field, [`__${field.toUpperCase()}__`]);
  }
  return serializeArticle(masked, body, newline, closingNewline);
}

function readArticle(root, filePath) {
  const text = fs.readFileSync(filePath, 'utf8');
  const { frontMatter } = extractFrontMatter(text, filePath);
  const relPath = toPosix(path.relative(root, filePath));
  return {
    filePath,
    path: relPath,
    slug: path.basename(path.dirname(filePath)),
    title: parseScalar(frontMatter, 'paper_title') || parseScalar(frontMatter, 'title'),
    tags: parseSequence(frontMatter, 'tags', filePath),
    value_tags: parseSequence(frontMatter, 'value_tags', filePath),
  };
}

function countValues(articles, field) {
  const counts = new Map();
  for (const article of articles) {
    for (const tag of new Set(article[field])) {
      if (!tag) {
        continue;
      }
      counts.set(tag, (counts.get(tag) || 0) + 1);
    }
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
}

function stats(articles) {
  const tagCounts = countValues(articles, 'tags');
  const valueTagCounts = countValues(articles, 'value_tags');
  const tagAssignments = articles.reduce((sum, article) => sum + new Set(article.tags).size, 0);
  const valueTagAssignments = articles.reduce((sum, article) => sum + new Set(article.value_tags).size, 0);

  return {
    article_count: articles.length,
    missing_tags: articles.filter((article) => article.tags.length === 0).map((article) => article.path),
    unique_tags: tagCounts.length,
    unique_value_tags: valueTagCounts.length,
    total_tag_assignments: tagAssignments,
    total_value_tag_assignments: valueTagAssignments,
    avg_tags_per_article: articles.length ? Number((tagAssignments / articles.length).toFixed(2)) : 0,
    avg_value_tags_per_article: articles.length ? Number((valueTagAssignments / articles.length).toFixed(2)) : 0,
    top_tags: tagCounts.slice(0, 40),
    top_value_tags: valueTagCounts.slice(0, 40),
  };
}

function exportPlan(articles) {
  return {
    articles: articles.map((article) => ({
      path: article.path,
      title: article.title,
      tags: article.tags,
      value_tags: article.value_tags,
    })),
  };
}

function readPlan(planPath) {
  const parsed = JSON.parse(fs.readFileSync(planPath, 'utf8'));
  const entries = Array.isArray(parsed) ? parsed : parsed.articles;
  if (!Array.isArray(entries)) {
    throw new Error('Plan must be an array or an object with an articles array');
  }
  return entries;
}

function indexArticles(articles) {
  const byPath = new Map();
  const bySlug = new Map();
  for (const article of articles) {
    byPath.set(article.path, article);
    const current = bySlug.get(article.slug) || [];
    current.push(article);
    bySlug.set(article.slug, current);
  }
  return { byPath, bySlug };
}

function resolvePlanEntries(entries, articles, root, requireComplete) {
  const { byPath, bySlug } = indexArticles(articles);
  const seen = new Set();
  const planned = [];

  for (const [index, entry] of entries.entries()) {
    if (!entry || typeof entry !== 'object') {
      throw new Error(`Plan entry ${index} must be an object`);
    }

    let article = null;
    if (entry.path) {
      const normalized = toPosix(path.normalize(entry.path));
      ensureInsideRoot(root, normalized);
      article = byPath.get(normalized);
      if (!article) {
        throw new Error(`Plan path does not match an article: ${entry.path}`);
      }
    } else if (entry.slug) {
      const matches = bySlug.get(entry.slug) || [];
      if (matches.length !== 1) {
        throw new Error(`Plan slug is not unique or missing: ${entry.slug}`);
      }
      article = matches[0];
    } else {
      throw new Error(`Plan entry ${index} needs path or slug`);
    }

    if (seen.has(article.path)) {
      throw new Error(`Duplicate plan entry for ${article.path}`);
    }
    seen.add(article.path);

    planned.push({
      article,
      tags: uniqueStrings(entry.tags, `${article.path}.tags`),
      value_tags: uniqueStrings(entry.value_tags, `${article.path}.value_tags`),
    });
  }

  if (requireComplete && seen.size !== articles.length) {
    const missing = articles.filter((article) => !seen.has(article.path)).map((article) => article.path);
    throw new Error(`Plan does not cover every article. Missing: ${missing.join(', ')}`);
  }

  return planned;
}

function sameArray(a, b) {
  return a.length === b.length && a.every((value, index) => value === b[index]);
}

function plannedArticles(articles, planned) {
  const replacements = new Map(planned.map((item) => [item.article.path, item]));
  return articles.map((article) => {
    const target = replacements.get(article.path);
    if (!target) {
      return article;
    }
    return {
      ...article,
      tags: target.tags,
      value_tags: target.value_tags,
    };
  });
}

function applyPlan(planned) {
  const changes = [];
  for (const item of planned) {
    const { article, tags, value_tags: valueTags } = item;
    if (sameArray(article.tags, tags) && sameArray(article.value_tags, valueTags)) {
      continue;
    }

    const text = fs.readFileSync(article.filePath, 'utf8');
    const { frontMatter, body, newline, closingNewline } = extractFrontMatter(text, article.filePath);
    let newFrontMatter = replaceSequence(frontMatter, 'tags', tags);
    newFrontMatter = replaceSequence(newFrontMatter, 'value_tags', valueTags);
    const newText = serializeArticle(newFrontMatter, body, newline, closingNewline);

    if (maskArticle(text, article.filePath) !== maskArticle(newText, article.filePath)) {
      throw new Error(`Refusing to write non-tag changes: ${article.path}`);
    }

    fs.writeFileSync(article.filePath, newText);
    changes.push({
      path: article.path,
      old_tags: article.tags,
      new_tags: tags,
      old_value_tags: article.value_tags,
      new_value_tags: valueTags,
    });
  }
  return changes;
}

function planChanges(planned) {
  return planned
    .filter((item) => !sameArray(item.article.tags, item.tags) || !sameArray(item.article.value_tags, item.value_tags))
    .map((item) => ({
      path: item.article.path,
      old_tags: item.article.tags,
      new_tags: item.tags,
      old_value_tags: item.article.value_tags,
      new_value_tags: item.value_tags,
    }));
}

function printText(result) {
  console.log(`Root: ${result.root}`);
  console.log(`Articles: ${result.before.article_count}`);
  if (result.mode) {
    console.log(`Mode: ${result.mode}`);
  }
  if (typeof result.changed_count === 'number') {
    console.log(`Changed articles: ${result.changed_count}`);
  }
  console.log(`Main tags: ${result.before.unique_tags}${result.after ? ` -> ${result.after.unique_tags}` : ''}`);
  console.log(`Value tags: ${result.before.unique_value_tags}${result.after ? ` -> ${result.after.unique_value_tags}` : ''}`);
  console.log(`Average main tags/article: ${result.before.avg_tags_per_article}${result.after ? ` -> ${result.after.avg_tags_per_article}` : ''}`);
  console.log(`Average value tags/article: ${result.before.avg_value_tags_per_article}${result.after ? ` -> ${result.after.avg_value_tags_per_article}` : ''}`);

  const topTags = (result.after || result.before).top_tags.slice(0, 20);
  const topValueTags = (result.after || result.before).top_value_tags.slice(0, 20);
  console.log('\nTop tags:');
  for (const [tag, count] of topTags) {
    console.log(`  ${tag}: ${count}`);
  }
  console.log('\nTop value_tags:');
  for (const [tag, count] of topValueTags) {
    console.log(`  ${tag}: ${count}`);
  }

  if (result.before.missing_tags.length > 0 || (result.after && result.after.missing_tags.length > 0)) {
    console.log('\nMissing tags:');
    for (const item of (result.after || result.before).missing_tags) {
      console.log(`  ${item}`);
    }
  }
}

function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (opts.help) {
    console.log(usage());
    return;
  }
  if (!opts.root) {
    throw new Error(`Missing --root\n\n${usage()}`);
  }

  const root = path.resolve(opts.root);
  if (!fs.existsSync(root) || !fs.statSync(root).isDirectory()) {
    throw new Error(`Root is not a directory: ${root}`);
  }

  const articles = findArticleFiles(root).map((filePath) => readArticle(root, filePath));
  const before = stats(articles);

  if (opts.writePlan) {
    const outputPath = path.resolve(opts.writePlan);
    fs.writeFileSync(outputPath, `${JSON.stringify(exportPlan(articles), null, 2)}\n`);
    const result = {
      root,
      mode: 'write-plan',
      plan_path: outputPath,
      before,
    };
    if (opts.json) {
      console.log(JSON.stringify(result, null, 2));
    } else {
      printText(result);
      console.log(`\nWrote plan: ${outputPath}`);
    }
    return;
  }

  let result = { root, mode: 'audit', before };

  if (opts.plan) {
    const entries = readPlan(opts.plan);
    const planned = resolvePlanEntries(entries, articles, root, opts.requireComplete);
    const afterArticles = plannedArticles(articles, planned);
    const changes = opts.apply ? applyPlan(planned) : planChanges(planned);
    result = {
      root,
      mode: opts.apply ? 'apply' : 'dry-run',
      plan_path: path.resolve(opts.plan),
      require_complete: opts.requireComplete,
      changed_count: changes.length,
      changes,
      before,
      after: stats(afterArticles),
    };
  }

  if (opts.json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    printText(result);
    if (result.mode === 'dry-run') {
      console.log('\nDry-run only. Re-run with --apply to write changes.');
    }
  }
}

try {
  main();
} catch (error) {
  console.error(`Error: ${error.message}`);
  process.exitCode = 1;
}
