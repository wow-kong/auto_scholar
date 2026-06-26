# AGENTS.md

Guidance for Codex and other coding agents working in this repository.

## Project Overview

`auto_scholar` is a paper-oriented research automation workspace. The repo is still early-stage and currently has two main surfaces:

- `skills/`: repo-local skill workflow files routed by this `AGENTS.md` for paper article generation and paper tag cleanup.
- `webui/`: a lightweight frontend scaffold for paper tracking, paper intake, and Markdown paper-note reading.

Keep changes small, explicit, and easy to extend. Prefer scaffolding stable contracts over adding speculative complexity.

## Repository Configuration

Local repository configuration lives in `.as/config.yaml`. This file is machine-specific and ignored by git.

Current local config keys:

- `knowledge_base.personal_path`: personal knowledge base path. The Web UI uses this same value as its paper-reading path.

## Development Commands

Run the Web UI from `webui/`:

```bash
cd webui
node scripts/serve.mjs
```

The default local URL is:

```text
http://127.0.0.1:5173
```

Validate the static frontend scaffold:

```bash
cd webui
node scripts/check-js.mjs
node scripts/smoke-test.mjs
```

Check JavaScript syntax when touching frontend scripts:

```bash
cd webui
node scripts/check-js.mjs
```

If the default shell has no `node`, use the Codex desktop bundled Node runtime when available.

## Web UI Notes

- The current Web UI is intentionally dependency-light and uses browser-native JavaScript, CSS, and localStorage.
- `webui/src/data/papers.js` currently contains mock seed papers, not extracted real paper data.
- User-created papers in the UI are stored in browser localStorage and are not written back to the repo.
- Prefer preserving the zero-install flow until a real backend/API contract exists.
- If adding dependencies later, document the package manager, lockfile, and build/test commands in both `README.md` and this file.
- Keep responsive layout checks in mind. Long paper titles and metadata must not cause horizontal overflow on mobile.

## Skill Notes

- When the user asks to turn a research paper, PDF, arXiv/OpenReview page, paper note, or extracted paper text into a Chinese technical blog/article, read and follow `skills/write-paper-blog/SKILL.md` before acting.
- When the user asks to audit, clean, merge, normalize, deduplicate, or safely rewrite paper article `tags` / `value_tags` in a Markdown knowledge base, read and follow `skills/clean-paper-tags/SKILL.md` before acting.
- Keep workflow details and constraints inside each skill's `SKILL.md`; do not duplicate or override them here.
- When modifying a skill itself, read its `SKILL.md` and any referenced files required by the change before editing.

## Coding Style

- Default to ASCII in new code and docs unless the file already requires Chinese or another character set.
- Keep comments sparse and useful.
- Prefer structured data and small helper functions over ad hoc string handling when the scope grows.
- Keep UI text concise and action-oriented.
- Avoid broad refactors while the repo is still small; preserve existing file boundaries unless there is a clear reason to split.

## Verification Expectations

For Web UI changes, at minimum run:

```bash
cd webui
node scripts/check-js.mjs
node scripts/smoke-test.mjs
```

When touching layout or interactions, also open the local page and check:

- overview route loads
- tracking filters work
- intake form can add a paper
- reader renders Markdown
- mobile viewport has no horizontal overflow
- browser console has no errors

For skill changes, follow the relevant skill's own verification instructions.

## Git Hygiene

- The worktree may contain user or prior-agent changes. Do not revert unrelated edits.
- Check `git status --short --branch` before and after substantial edits.
- Keep generated artifacts, local caches, `node_modules/`, and `webui/dist/` out of commits.
- Before every commit or push, review the files involved in the current feature end to end. Clean up stale, invalid, or unused files/functions/styles, optimize inefficient, unreasonable, or vulnerable logic, and only commit/push after the review and verification show no known blocking issues.
- Do not commit unless the user explicitly asks.
