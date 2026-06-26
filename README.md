# auto_scholar

`auto_scholar` is a workspace for paper-oriented research automation.

## v0.1 scope

This release is a local-first, zero-install scaffold for reading and triaging generated paper notes. It is suitable for personal use while the backend/API contract is still forming.

Included surfaces:

- repo-local skills for generating Chinese-first paper articles and cleaning paper tags
- Web UI paper tracking with read/recommend/archive state
- Markdown reader for `article.md` packages under the configured knowledge base
- local image serving for article assets under each paper package's `assets/` directory

Out of scope for v0.1:

- multi-user sync
- writing newly collected Web UI intake papers back to the repository
- authentication or remote deployment

## Configuration

Local repository configuration lives in `.as/config.yaml`, which is intentionally ignored by git.

```yaml
knowledge_base:
  personal_path: ../my_autoscholar
```

The Web UI reads `knowledge_base.personal_path` as the Markdown paper library root.

## Web UI

The first frontend scaffold lives in `webui/`. It is intentionally dependency-light so the repo has a usable interface before the backend contract is finalized.

Current surfaces:

- paper tracking: status, priority, unread updates, filters
- paper intake: collect a new paper into a collection with seed metadata
- markdown reader: render structured paper notes, claims, tables, code blocks, and timeline

Run locally:

```bash
cd webui
node scripts/serve.mjs
```

Then open `http://127.0.0.1:5173`.

Validate the static scaffold:

```bash
cd webui
node scripts/check-js.mjs
node scripts/smoke-test.mjs
```

If npm is available, `npm test` runs the same checks. The smoke test covers the Markdown renderer, article metadata parsing, asset path rewriting, and the local server's config/paper APIs.
