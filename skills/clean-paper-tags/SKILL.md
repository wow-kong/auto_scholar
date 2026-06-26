---
name: clean-paper-tags
description: Audit, normalize, and safely rewrite open-ended tags/value_tags in Markdown paper knowledge bases. Use when Codex needs to consolidate redundant paper article labels, build a reusable tag taxonomy, update only article.md YAML front matter tag fields, preserve all other article content, and report before/after tag distributions in auto_scholar-style libraries.
---

# Clean Paper Tags

## Overview

Clean redundant open-ended paper labels into a smaller, reusable taxonomy. This skill is for already-generated Markdown paper articles that store `tags` and `value_tags` in YAML front matter, especially `auto_scholar` knowledge-base packages.

Use the bundled script for scanning, dry-runs, applying a cleanup plan, and verifying that only `tags` and `value_tags` changed.

## Workflow

1. Resolve the knowledge-base root.
   - Prefer the path explicitly provided by the user.
   - In `auto_scholar`, read `.as/config.yaml` and use `knowledge_base.personal_path` when the user says "personal knowledge base".
   - Target `article.md` files under the chosen root unless the user narrows the scope.

2. Audit the current distribution.

   ```bash
   node skills/clean-paper-tags/scripts/clean-paper-tags.mjs --root <kb-root>
   ```

   For machine-readable output:

   ```bash
   node skills/clean-paper-tags/scripts/clean-paper-tags.mjs --root <kb-root> --json
   ```

3. Design the cleanup plan.
   - Read `references/tag-taxonomy.md` before deciding mappings.
   - Keep `tags` as reusable technical topics, methods, or task families.
   - Use cleanup `value_tags` as coarse filterable entity/value families when the user asks for aggregated distributions.
   - Deduplicate within each article.
   - Prefer removing one-off proper nouns from `tags`; preserve them in article text rather than using them as taxonomy buckets.
   - Do not invent a tag that is not supported by the paper title, existing tags, or article content.

4. Write a JSON plan outside the article tree.

   ```json
   {
     "articles": [
       {
         "path": "202606/example-paper/article.md",
         "tags": ["LLM Reasoning", "Evaluation"],
         "value_tags": ["Qwen Models"]
       }
     ]
   }
   ```

   Use `path` relative to the knowledge-base root. `slug` is also accepted when each article directory name is unique.

   To export the current labels as a starter plan:

   ```bash
   node skills/clean-paper-tags/scripts/clean-paper-tags.mjs --root <kb-root> --write-plan /tmp/tag-plan.json
   ```

5. Dry-run the plan before writing.

   ```bash
   node skills/clean-paper-tags/scripts/clean-paper-tags.mjs --root <kb-root> --plan /tmp/tag-plan.json --require-complete
   ```

   Review changed article count, before/after unique tag counts, and the top tag distribution. If the cleanup is partial by design, omit `--require-complete`.

6. Apply after the dry-run is clean.

   ```bash
   node skills/clean-paper-tags/scripts/clean-paper-tags.mjs --root <kb-root> --plan /tmp/tag-plan.json --require-complete --apply
   ```

   The script rewrites only the `tags:` and `value_tags:` front matter blocks. It aborts if masking those two blocks shows any other article content would change.

7. Verify and report.
   - Re-run the audit after applying.
   - Report article count, missing-tag count, unique `tags` before/after, unique `value_tags` before/after, and the new top distribution.
   - State that only `tags` and `value_tags` were rewritten if the script completed successfully.

## Cleanup Rules

- Preserve the concept boundary between article topical `tags`, cleanup-oriented `value_tags`, Web UI state, and article body text.
- Do not edit article prose, titles, authors, links, `reading_level`, assets, or `state.json` unless the user explicitly asks.
- Use title case English labels for taxonomy stability unless the existing knowledge base clearly uses another convention.
- Keep the taxonomy compact enough for filtering. If many tags are singletons, merge them into broader families unless the singleton is a genuinely reusable research area.
- Leave `value_tags: []` when no useful aggregate value/entity family remains after cleanup.
- Treat generated plans as reviewable intermediate artifacts. Do not leave them inside the knowledge base unless the user asks.

## Resources

- `scripts/clean-paper-tags.mjs`: audit, export starter plans, dry-run cleanup plans, apply tag-only rewrites, and validate masked content preservation.
- `references/tag-taxonomy.md`: recommended aggregation buckets and synonym merges for AI/ML paper libraries.
