---
name: write-paper-blog
description: Generate rigorous, Chinese-first Markdown technical blogs from AI/ML papers, PDFs, arXiv pages, paper notes, or extracted paper text. Use when Codex needs to turn a research paper into an evidence-grounded explainer that preserves important technical details, uses diagrams/examples/tables, interprets experiments, marks genuinely notable article-value tags, and includes critical limitations and extensions without forcing a fixed section template.
---

# Write Paper Blog

## Overview

Create an adaptive Markdown blog package from a research paper. Preserve the paper's important technical content while reorganizing it into a clearer reader path with examples, diagrams, evidence interpretation, and independent critique.

Use the research basis in `references/blog-structure-study.md` if you need to justify or revise the article structure. Use `references/article-quality-contract.md` as the non-negotiable output contract.

## Workflow

1. Ingest the paper.
   - Prefer the original PDF or official arXiv/OpenReview/project page.
   - Extract title, authors, venue/year, abstract, figures/tables, method sections, experiments, limitations, appendices, and code/project links.
   - If the paper source is incomplete, state what is missing and avoid filling gaps with guesses.

2. Build a paper map before writing.
   - Identify paper type: method, system, benchmark, survey, theory, application, dataset, position, or hybrid.
   - Create a claim ledger: each major claim, its supporting evidence, and any missing or weak evidence.
   - List must-preserve details: equations, algorithms, architecture choices, data construction, training/inference settings, metrics, baselines, ablations, and failure cases.
   - Identify possible `value_tags` as concrete people, institutions, labs, model families, product lines, or benchmark names only when the paper has clear notability signals that matter to readers.
   - Identify topical `tags` from reusable technical concepts, not from one-off proper nouns unless the noun names a broadly reusable technical family.
   - Select key original figures and tables that should be cropped from the paper, cleaned up if needed, and inserted near the relevant explanation.

3. Choose an adaptive outline.
   - Do not force the paper into a fixed section schema.
   - Choose the order that best teaches this specific paper.
   - Still satisfy the golden skeleton in `references/article-quality-contract.md`: orientation, problem frame, contribution map, mechanism reconstruction, evidence reading, critical boundary review, and synthesis.

4. Generate a Markdown article package.
   - Resolve the output root from the repo config `.as/config.yaml` key `knowledge_base.personal_path` before writing files.
   - Store the generated package under `{knowledge_base.personal_path}/{YYYYMM}/{paper-name}/`, where `YYYYMM` is the target month in four-digit year plus two-digit month format such as `202606`, and `paper-name` is a filesystem-safe slug derived from the paper title.
   - Use the current generation month for `YYYYMM` unless the user explicitly requests a different target month.
   - If `.as/config.yaml` or `knowledge_base.personal_path` is unavailable, ask the user for the personal knowledge base path before writing the package.
   - Write `article.md` with YAML frontmatter.
   - If writing or updating `state.json`, treat it as Web UI state, not as part of the article content contract. Keep the schema extensible: preserve unknown fields and any existing user-owned fields unless the user explicitly asks to change them.
   - Article generation may set content-processing state such as `status: "summarized"`, `unreadUpdates: 0`, `updatedAt`, and a generation event. It must not infer user-owned reading, recommendation, or triage decisions such as `readAt`, `recommended`, `recommendedAt`, "marked read/recommended" reading events, or high/low `priority` unless explicitly requested in the same turn.
   - Write primarily in Simplified Chinese unless the user explicitly requests another language. Preserve original English names for papers, models, datasets, methods, institutions, and standard terms when translation would reduce precision.
   - Include `tags` for generic technical topics and `value_tags` for selective concrete article-value signals.
   - Put generated images and cropped original paper figures/tables under `assets/` and reference them with relative paths.
   - Crop key original paper figures/tables to the useful region, avoiding full-page screenshots unless page context is essential.
   - Render dense PDF figures/tables at high resolution before cropping. Target at least 1800 px output width for dense architecture diagrams, multi-panel charts, and tables; use at least 1200 px only for simple low-detail visuals. Do not upscale a low-resolution crop to satisfy the width target.
   - Keep axes, legends, labels, module names, and evidence-critical numbers readable after the image is displayed in the Web UI. Re-render at a higher scale or split the figure into multiple focused crops when small text remains hard to read.
   - Avoid clipping meaningful figure content. Remove original paper captions only when the article provides its own nearby caption and source attribution.
   - Include at least one real local image reference in `article.md` using `![...](assets/...)`, with a matching file under `assets/`, unless the source genuinely has no useful visual material and the article explicitly states that reason.
   - Use Mermaid for portable flowcharts when exact paper figures are unavailable or when a simplified process diagram is clearer, but Mermaid-only diagrams do not satisfy the local image requirement for the current Web UI.
   - When a Mermaid diagram is essential, either render/export it to a local image or pair it with a cropped/generated local image that will render in the Web UI.
   - Prefer concise tables for contribution maps, experiment summaries, metric comparisons, and limitation audits.

5. Verify fidelity and readability.
   - After writing the full draft, do a holistic read-through of `article.md` as a reader, not only as a checklist. Revise the article before finalizing if the explanation is hard to follow, section transitions are abrupt, tables are missing category/context columns, or method variants are introduced without showing how they relate.
   - Check every major paper claim is represented or intentionally omitted with a reason.
   - Check the article separates author claims, demonstrated evidence, and your critique.
   - Check the Chinese prose is natural and not a literal translation of the paper.
   - Check method and system explanations are reconstructable from the article alone: named variants, data-generation paths, training stages, baselines, ablations, metrics, and table groups must be explicitly mapped instead of assumed from the paper.
   - Check critical details have not been lost when reorganizing the paper: sample counts, prompt/conditioning setup, candidate-selection rules, training/inference distinctions, evaluation splits, and caveats must stay attached to the claim they support.
   - Check `value_tags` are empty unless there is evidence for genuine reader-facing notability.
   - Check `value_tags` contain concrete names such as `Meta`, `Stanford University`, `GPT-5`, or `AlphaFold`, not category names such as `顶级企业`.
   - Check `tags` are reusable technical categories such as `LLM Agent`, `RAG`, `RLHF`, `Benchmark`, or `Mechanistic Interpretability`.
   - Check key original paper figures/tables are cropped, legible, attributed, and placed near the explanation that uses them.
   - Check examples, diagrams, and tables explain the mechanism rather than decorating the article.
   - Check `article.md` contains at least one `![...](assets/...)` reference and every referenced local image file exists.
   - Open every local image before finalizing. Verify actual pixel dimensions, confirm dense visuals meet the width target above, and reject blurry, clipped, or low-information crops.
   - If the Web UI is running, verify the Markdown image path is rewritten to `/api/kb-assets/...` and that the asset URL returns the expected image type.
   - Check Markdown links and image paths are portable.
   - When revising an existing generated article in response to user feedback, keep `title`, `paper_title`, `source_links`, output directory name, and unrelated `state.json` fields unchanged unless the user explicitly asks to change them. Limit edits to the criticized content and any directly necessary consistency fixes.
   - Run `node skills/write-paper-blog/scripts/review-generated-result.mjs <paper-dir>` against every generated paper directory before finalizing. The review script checks package structure, local image references, basic PNG dimensions, and known user-state fields. Additional future `state.json` dimensions are allowed when they are not user-owned reading, recommendation, or triage decisions.

## Writing Rules

- Optimize for reader understanding, not for mimicking the paper's original order.
- Preserve important technical information; simplify language, not substance.
- Include concrete examples for non-trivial mechanisms.
- Explain formulas with variable tables and plain-language interpretation when formulas matter.
- Interpret experiments: say what the evidence supports, what it does not support, and where the setup may be biased.
- Include a critical section with limitations, questionable assumptions, hidden costs, failure modes, and possible extensions.
- Avoid hype. Do not present author claims as facts unless the paper's evidence supports them.
- Avoid redundant background unless it is required for the target reader to understand the paper.
- Keep source attribution explicit for paper facts, figures, tables, and external references.

## Value Tags

Use `value_tags` in frontmatter for concrete article-value signals, separate from topical `tags`.

Allowed entity types include:

- notable individual authors or maintainers
- notable universities
- notable companies
- notable research labs
- notable model/product/benchmark families

Rules:

- Add the concrete name, not the category name. Use `Meta`, `Stanford University`, `DeepMind`, `Claude Code`, `SWE-bench`, or `AlphaFold`; do not use `顶级企业`, `顶级高校`, `知名实验室`, or `知名模型/产品系列` as tag values.
- Add a value tag only when the signal is genuinely useful for judging why the article is worth reading, sharing, or prioritizing.
- Do not add a tag merely because any author has an affiliation with a university or company.
- Prefer leaving `value_tags: []` empty when the signal is weak, incidental, ambiguous, or not central to the paper.
- Mention the concrete evidence in the article orientation when a value tag is used, such as the notable author, institution, lab, model family, or product line.

Use `tags` for reusable technical concepts:

- Prefer general labels that connect this article to future articles on similar topics.
- Prefer `LLM Agent`, `Agent Harness`, `Code Agent`, `Tool Use`, `Multi-Agent Systems`, `Benchmark`, `Evaluation`, `Software Engineering`, `GUI Agent`, or `Embodied Agent` over narrow labels that only identify this paper.
- Do not duplicate `value_tags` in `tags`.

## Output Shape

Default output package:

```text
{knowledge_base.personal_path}/{YYYYMM}/{paper-name}/
|-- article.md
|-- state.json        # optional Web UI state, when needed
`-- assets/
    |-- fig-01-overview.png
    `-- fig-02-method-flow.png
```

Example when `knowledge_base.personal_path` is `../my_autoscholar` and the target month is June 2026:

```text
../my_autoscholar/202606/{paper-name}/article.md
```

Use `assets/blog-template.md` as a starting point only. Rename, merge, reorder, or remove sections when the paper demands a different explanation path, but do not violate the quality contract.

## Resources

- `references/article-quality-contract.md`: hard output contract and adaptive outline rules.
- `references/blog-structure-study.md`: evidence from the high-quality blog survey and dimension statistics.
- `assets/blog-template.md`: flexible Markdown article starter.
- `scripts/review-generated-result.mjs`: generated package review checks for `article.md`, local assets, PNG dimensions, and user-owned state fields.
