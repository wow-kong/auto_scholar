# Tag Taxonomy Reference

Use this reference when consolidating open-ended paper labels into stable filter buckets.

## Principles

- `tags` describe reusable technical topics, methods, tasks, or evidence types.
- Cleanup `value_tags` describe coarse filterable entity/value families such as model families, benchmark families, venues, or labs.
- Keep generated article-specific names out of `tags` unless the name is also a reusable research family.
- Merge wording variants aggressively when they would support the same future filter.
- Keep a more specific tag only when it changes retrieval behavior for future reading.

## Common Main Tags

Reasoning and efficiency:

- `LLM Reasoning`
- `Chain-of-Thought`
- `Test-Time Compute`
- `Reasoning Efficiency`
- `Reasoning Compression`
- `Latent Reasoning`
- `Adaptive Computation`
- `Mathematical Reasoning`
- `Multi-Hop Reasoning`
- `Question Answering`

Training and optimization:

- `Reinforcement Learning`
- `Fine-Tuning`
- `Self-Distillation`
- `Self-Training`
- `Scaling Laws`
- `Sample Efficiency`
- `Theoretical Analysis`

Agents and systems:

- `LLM Agents`
- `Agent Runtime`
- `Agent Skills`
- `Agent Safety`
- `Code Agents`
- `Tool Use`
- `Multi-Agent Systems`
- `Memory and State`

Retrieval, representation, and interpretability:

- `RAG and QA`
- `Text Embeddings`
- `Representation Learning`
- `Information Retrieval`
- `Mechanistic Interpretability`
- `Parametric Knowledge`
- `Faithfulness`

Model and infrastructure:

- `Model Architecture`
- `Language Model Pretraining`
- `Sparse Attention`
- `Long Context`
- `Systems`
- `Multimodal Models`
- `Multimodal Reasoning`
- `World Models`
- `Embodied AI`

Evidence and article type:

- `Evaluation`
- `Survey`
- `Benchmark`

Prefer `Evaluation` over `Benchmark` when benchmark names are only evidence sources. Keep `Benchmark` when benchmark construction or benchmark methodology is the paper's central contribution.

## Common Synonym Merges

- `Inference Efficiency`, `Efficient Inference`, `Efficient Reasoning`, `Token Budget`, `Token Budgeting`, `Length Control`, `Overthinking` -> usually `Reasoning Efficiency`, often also `Test-Time Compute`.
- `CoT Compression`, `Reasoning Compression`, `Context Compression`, `Token Pruning`, `Token Complexity`, `Gist Token` -> `Reasoning Compression` when the article is about shorter or denser reasoning traces.
- `Continuous Representations`, `Dense Representations`, `Latent Dynamics` in reasoning papers -> `Latent Reasoning`; in representation papers -> `Representation Learning`.
- `LLM Agent`, `Agent Harness`, `Agent Runtime`, `Protocols`, `Planning` -> `LLM Agents`, with `Agent Runtime`, `Memory and State`, or `Tool Use` only when central.
- `Agent Skills`, `Skill Library`, `Skill Extraction`, `Skills` -> `Agent Skills`.
- `Parametric Memory`, `LLM Memory`, `Closed-Book QA`, `Factuality` -> choose among `Parametric Knowledge`, `Memory and State`, and `Question Answering` based on the paper.
- `Proof Generation`, `Verifier`, `Search`, `Best-of-N`, `Test-Time Scaling` -> usually `Mathematical Reasoning`, `Search and Verification`, and/or `Test-Time Compute`.
- `Finetuning`, `Fine-Tuning`, `Instruction Tuning`, `LoRA`, `Distillation`, `Post-Training` -> choose `Fine-Tuning` plus `Self-Distillation` when distillation is central.
- `Sparse Attention`, `KV Cache`, `GPU Kernel`, `Long Context`, `Systems` -> preserve the specific systems tag when it is central, otherwise use `Model Architecture` or `Systems`.

## Common Value Tags

Model families:

- `OpenAI Models`
- `Claude Models`
- `DeepSeek Models`
- `Qwen Models`
- `Llama Models`
- `Gemini Models`
- `Mistral Models`
- `MiniMax Models`

Benchmark families:

- `Math Benchmarks`
- `Code Benchmarks`
- `QA Benchmarks`
- `Agent Benchmarks`
- `Embedding Benchmarks`

Institutions, venues, and systems:

- `Industry AI Labs`
- `NLP/ML Venues`
- `OpenAI Systems`

## Value Tag Merge Examples

- `GPT-4o`, `GPT-4.1`, `GPT-5.1`, `GPT-5.2`, `o3-mini`, `GPT-4o-mini`, `OpenAI o1` -> `OpenAI Models`.
- `Claude 3.5 Sonnet`, `Claude 3.7 Sonnet` -> `Claude Models`.
- `DeepSeek-R1` and its distill variants -> `DeepSeek Models`.
- `Qwen`, `Qwen2.5`, `Qwen3`, `QwQ-32B-Preview` -> `Qwen Models`.
- `Llama`, `LLaMA`, `Llama 2`, `Llama 3.1` -> `Llama Models`.
- `MiniMax`, `MiniMax-M3` -> `MiniMax Models`.
- `AIME`, `HMMT`, `GSM8K`, `MATH-500`, `IMOProofBench`, `IMOAnswerBench`, `IMO 2025`, `USAMO 2026` -> `Math Benchmarks`.
- `SWE-bench`, `Terminal-Bench`, `LiveCodeBench` -> `Code Benchmarks`.
- `HotpotQA`, `MuSiQue`, `TAT-QA`, `ConFiQA` -> `QA Benchmarks`.
- `ALFWorld`, `WebShop`, `ATBench`, `CL-bench` -> `Agent Benchmarks`.
- `MTEB` -> `Embedding Benchmarks`.
- `ACL 2025 Findings`, `EMNLP 2025`, `EMNLP 2025 Oral`, `COLM 2025`, `TMLR 2025` -> `NLP/ML Venues`.
- Company or lab names such as `Alibaba`, `Tencent AI Lab`, `Google Research`, `Meta`, `Shanghai AI Laboratory` -> `Industry AI Labs` when the exact organization is not needed as a filter.

## Review Checklist

- Every article has at least one `tags` entry unless it is intentionally out of scope.
- Each article usually has 3-6 main tags after cleanup.
- Each article usually has 0-3 cleanup `value_tags` after aggregation.
- Top tags should reveal real library themes rather than spelling or naming variants.
- A singleton tag should survive only if it represents a future reusable query.
