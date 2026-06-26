# Article Quality Contract

Use this file as the non-negotiable contract for generated paper explainer blogs. The article can use any section names and order, but it must satisfy these responsibilities.

## Golden Skeleton

The article must contain these seven functions in some form:

1. Orientation pact
   - Tell readers what the paper is about, why it matters, what they will understand, and what background is assumed.
   - Include a compact paper fact sheet when useful.

2. Problem frame
   - Explain the task, setting, pain point, and why existing approaches are insufficient.
   - Distinguish real problem motivation from author rhetoric.

3. Contribution and claim map
   - Separate what the paper contributes, what it claims, and what evidence supports each claim.
   - Use a table when the paper has multiple contributions or experiments.

4. Mechanism reconstruction
   - Rebuild the method, system, benchmark, theory, or dataset in a clearer order than the original paper if needed.
   - Preserve important technical details: inputs, outputs, modules, equations, algorithms, data, training, inference, metrics, baselines, ablations, and implementation assumptions.

5. Evidence reading
   - Explain what experiments, proofs, analyses, or case studies demonstrate.
   - Say what is not demonstrated, especially when claims are broader than evidence.

6. Critical boundary review
   - Include limitations, failure cases, hidden costs, questionable assumptions, metric/data weaknesses, and deployment concerns.
   - Do not flatter the paper by default. Be fair, specific, and evidence-based.

7. Synthesis and transfer
   - Summarize the lasting idea.
   - Explain who should care, how the idea may be reused, and what extensions or follow-up experiments are plausible.

## Adaptive Structure Rules

Choose structure by paper type:

- Method paper: problem -> intuition -> method overview -> module walkthrough -> training/inference -> experiments -> critique.
- System paper: user/engineering constraint -> architecture -> data/control flow -> tradeoffs -> metrics -> operations risks.
- Benchmark paper: evaluation gap -> task/data design -> metrics -> findings -> bias and validity threats.
- Survey paper: field map -> taxonomy axes -> representative families -> disputes/open gaps -> practical reading path.
- Theory paper: setup -> assumptions -> theorem intuition -> proof sketch -> implications -> fragility of assumptions.
- Dataset paper: data motivation -> collection/filtering/annotation -> statistics -> evaluation use -> bias/licensing/coverage risks.
- Application paper: real-world task -> adaptation choices -> results -> operational costs -> transfer limits.

The order above is a default, not a mandate. The article should use the order that best teaches this paper.

## Explanation Aids

Use aids only when they clarify, but do not skip them for complex papers:

- Use one overview diagram when the method/system has more than two interacting parts.
- Use Mermaid flowcharts for portable process explanations.
- Use a concrete running example when a mechanism is abstract.
- Use pseudo-code when the paper's algorithm is easier to understand procedurally.
- Use tables for contributions, baselines, metrics, ablations, limitations, and claim evidence.
- Use variable tables for important formulas.

## Markdown Requirements

- Write the article primarily in Simplified Chinese unless the user explicitly requests another language.
- Keep canonical English names for papers, models, datasets, methods, institutions, metrics, and terms when Chinese translation would reduce precision.
- Use YAML frontmatter with title, paper title, authors, venue/year if available, source links, topical `tags`, selective `value_tags`, and reading level.
- Store local images under `assets/` and reference them with relative paths.
- Include at least one real local image reference with `![...](assets/...)` when the paper has useful figures, tables, or visualizable mechanisms. Mermaid-only diagrams do not count as local image assets in the current Web UI.
- For raster images, target at least 1800 px width for dense architecture diagrams, multi-panel plots, and tables; use at least 1200 px only for simple visuals. Do not upscale low-resolution images to meet these thresholds.
- Do not embed base64 images.
- Preserve source figure/table attribution.
- Prefer portable Markdown plus Mermaid; use raw HTML only for features Markdown cannot express.

## Value Tags

Use `value_tags` for selective concrete article-value signals, not for topical classification.

Allowed values are concrete names, not category labels. Examples:

- `Meta`
- `Stanford University`
- `DeepMind`
- `Claude Code`
- `SWE-bench`
- `AlphaFold`

Apply them conservatively:

- Use a person's name only for authors with broad field recognition relevant to the paper's value.
- Use an institution, company, or lab name only when that affiliation materially affects reader interest or credibility, not for routine affiliation listing.
- Use a model/product/benchmark family name only when the paper belongs to, introduces, analyzes, or materially extends a recognized family.
- Keep `value_tags: []` when no signal is strong enough.
- If a value tag is present, the orientation section must briefly name the evidence behind it.
- Never use category labels such as `顶级高校`, `顶级企业`, `名人作者`, `知名实验室`, or `知名模型/产品系列` as tag values.

Use topical `tags` for reusable technical concepts:

- Prefer broadly reusable labels that connect articles about similar methods, domains, or evaluation problems.
- Avoid one-off paper-specific phrases unless they name an established technical area.
- Do not duplicate concrete `value_tags` in `tags`.

## Original Figures and Tables

- Preserve key original figures and tables when they carry important technical structure or evidence.
- Crop original figures/tables to the relevant region and place them near the article section that explains them.
- Render PDF pages at high scale before cropping, especially for dense diagrams or plots with small labels. Avoid full-page screenshots unless page context is essential.
- Keep labels, legends, axes, module names, and evidence-critical numbers readable at the article's normal display width.
- Do not accept blurry, low-resolution, or visibly clipped crops. Re-render at higher resolution, split dense figures into multiple crops, or recreate a clean explanatory diagram when the original figure is not readable.
- Give each original figure/table a clear caption and mention that it is from the paper.
- Use generated Mermaid diagrams as companion explanations, not as replacements for important original figures/tables or as substitutes for local image assets.

## Fidelity Checks

Before finalizing, verify:

- Read the whole article end to end as a reader. Fix unclear flow, missing transitions, dangling terminology, unexplained table categories, and places where a reader could not understand the method without returning to the paper.
- Every core contribution is represented.
- Every major claim has either supporting evidence or an explicit caveat.
- Experiments are interpreted, not merely copied.
- Important implementation details from appendices are not silently lost.
- Method variants, baselines, ablations, and data-generation paths are explicitly related to each other. Do not present a table or procedure that requires the reader to infer which rows belong to which paper category.
- Details that determine the mechanism or evidence, such as sample counts, candidate pools, selection rules, prompt/conditioning setup, training stages, evaluation splits, and failure cases, remain attached to the explanation that depends on them.
- Critical analysis is distinguishable from author claims.
- The article is Chinese-first unless another language was requested.
- `value_tags` are concrete names supported by explicit evidence and are not generic prestige labels.
- `tags` are reusable technical categories rather than one-off prestige or affiliation labels.
- Key original paper figures/tables are cropped, legible, attributed, and placed near the relevant explanation.
- Every local image reference in `article.md` points to an existing file under `assets/`.
- Every local image has been opened and visually checked for readability, dimensions, and clean cropping; dense raster figures meet the 1800 px width target unless there is a documented reason.
- The article is rich but not padded with generic background.

## Revision Discipline

When updating an existing generated article after user feedback:

- Preserve `title`, `paper_title`, `source_links`, output directory names, and user-facing state unless the feedback explicitly targets those fields.
- Keep the edit scope tied to the criticized content and any directly necessary consistency fixes.
- Re-run the full fidelity checks after the revision, not only the structural review script.
