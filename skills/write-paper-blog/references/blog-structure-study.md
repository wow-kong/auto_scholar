# Blog Structure Study

This study supports the initial structure contract for `write-paper-blog`.

## Table of Contents

- [Method](#method)
- [Source Mix](#source-mix)
- [Annotated Dimension Counts](#annotated-dimension-counts)
- [Representative Sample List](#representative-sample-list)
- [HN High-Interaction Calibration](#hn-high-interaction-calibration)
- [Conclusions for the Skill](#conclusions-for-the-skill)

## Method

- Candidate pool: 120+ AI/ML technical articles gathered from Hacker News high-interaction results, Hugging Face blog likes, research lab blogs, edited research venues, and long-running independent engineering blogs.
- Structural annotation sample: 58 article-style samples after filtering out raw PDFs, pure videos, GitHub repo landing pages, course pages, and short product announcements.
- Annotation focus: article opening, reader promise, problem framing, outline style, mechanism explanation, examples, visuals, code, experiment interpretation, caveats, references, and critical stance.
- Quality signals used: community interaction, platform likes, author/site reputation, editorial gatekeeping, technical depth, and usefulness for a reusable paper-to-blog skill.

## Source Mix

| Source type | Candidate role | Examples |
|---|---|---|
| Edited explainers | High clarity and durable mental models | Distill, Colah, Jay Alammar |
| Research lab blogs | Current research claims and caveats | Anthropic, OpenAI, Google Research, Google DeepMind, Meta AI |
| Engineering blogs | Production constraints and tradeoffs | Chip Huyen, Eugene Yan, Simon Willison, Hugging Face |
| Community high-interaction | Broader reader validation | Hacker News high points/comments, Hugging Face high likes |
| Research threads | Deep mechanism reconstruction | Transformer Circuits, mechanistic interpretability articles |

## Annotated Dimension Counts

N = 58 structurally annotated articles.

| Dimension | Count | Interpretation |
|---|---:|---|
| Clear problem/motivation frame | 56 | Nearly universal; strong articles tell readers why the topic matters before details. |
| Upfront promise or compressed summary | 53 | Most strong articles establish a reading contract early. |
| Conceptual overview before deep details | 50 | Good articles usually give the whole shape before equations or implementation. |
| Mechanism walkthrough | 50 | Technical depth usually appears as stepwise reconstruction, not paper-section paraphrase. |
| Visual aid, table, or diagram | 49 | Visual structure is a core tool, especially for models, systems, and evals. |
| Concrete example or case study | 45 | Examples are common when the mechanism is abstract or multi-step. |
| Evidence/result interpretation | 43 | High-quality research writing explains what results prove and do not prove. |
| Limitations, tradeoffs, or failure modes | 41 | Stronger articles avoid pure advocacy and discuss boundaries. |
| Source trail or references | 46 | Durable technical posts provide a path to original sources. |
| Code, pseudo-code, or reproducibility hook | 29 | Common in engineering/tutorial posts; less common in surveys and research commentary. |
| Taxonomy or comparison table | 31 | Common in survey, benchmark, and systems articles. |
| Explicit audience/prerequisite note | 24 | Less universal, but useful for generated paper blogs. |

## Representative Sample List

The following 58 samples shaped the initial contract.

1. Colah - Understanding LSTM Networks - https://colah.github.io/posts/2015-08-Understanding-LSTMs/
2. Andrej Karpathy - The Unreasonable Effectiveness of Recurrent Neural Networks - https://karpathy.github.io/2015/05/21/rnn-effectiveness/
3. Jay Alammar - The Illustrated Transformer - https://jalammar.github.io/illustrated-transformer/
4. Jay Alammar - The Illustrated Stable Diffusion - https://jalammar.github.io/illustrated-stable-diffusion/
5. Jay Alammar - The Illustrated Retrieval Transformer - https://jalammar.github.io/illustrated-retrieval-transformer/
6. Distill - Feature Visualization - https://distill.pub/2017/feature-visualization/
7. Distill - The Building Blocks of Interpretability - https://distill.pub/2018/building-blocks/
8. Distill - Zoom In: An Introduction to Circuits - https://distill.pub/2020/circuits/zoom-in/
9. Distill - A Visual Exploration of Gaussian Processes - https://distill.pub/2019/visual-exploration-gaussian-processes/
10. Distill - Open Questions about Generative Adversarial Networks - https://distill.pub/2019/gan-open-problems/
11. Lilian Weng - LLM Powered Autonomous Agents - https://lilianweng.github.io/posts/2023-06-23-agent/
12. Lilian Weng - Prompt Engineering - https://lilianweng.github.io/posts/2023-03-15-prompt-engineering/
13. Lilian Weng - Extrinsic Hallucinations in LLMs - https://lilianweng.github.io/posts/2024-07-07-hallucination/
14. Lilian Weng - The Transformer Family Version 2.0 - https://lilianweng.github.io/posts/2023-01-27-the-transformer-family-v2/
15. Lilian Weng - Large Transformer Model Inference Optimization - https://lilianweng.github.io/posts/2023-01-10-inference-optimization/
16. Lilian Weng - Diffusion Models for Video Generation - https://lilianweng.github.io/posts/2024-04-12-diffusion-video/
17. Lilian Weng - Reward Hacking in Reinforcement Learning - https://lilianweng.github.io/posts/2024-11-28-reward-hacking/
18. Lilian Weng - Why We Think - https://lilianweng.github.io/posts/2025-05-01-thinking/
19. Anthropic - Tracing the thoughts of a large language model - https://www.anthropic.com/research/tracing-thoughts-language-model
20. Transformer Circuits - A Mathematical Framework for Transformer Circuits - https://transformer-circuits.pub/2021/framework/index.html
21. Transformer Circuits - In-context Learning and Induction Heads - https://transformer-circuits.pub/2022/in-context-learning-and-induction-heads/index.html
22. Transformer Circuits - Toy Models of Superposition - https://transformer-circuits.pub/2022/toy_model/index.html
23. Transformer Circuits - Towards Monosemanticity - https://transformer-circuits.pub/2023/monosemantic-features/index.html
24. Transformer Circuits - Scaling Monosemanticity - https://transformer-circuits.pub/2024/scaling-monosemanticity/index.html
25. Transformer Circuits - Circuit Tracing - https://transformer-circuits.pub/2025/attribution-graphs/methods.html
26. Transformer Circuits - On the Biology of a Large Language Model - https://transformer-circuits.pub/2025/attribution-graphs/biology.html
27. Transformer Circuits - Interpretability Dreams - https://transformer-circuits.pub/2023/interpretability-dreams/index.html
28. Transformer Circuits - Distributed Representations: Composition and Superposition - https://transformer-circuits.pub/2023/superposition-composition/index.html
29. Eugene Yan - Task-Specific LLM Evals that Do and Don't Work - https://eugeneyan.com/writing/evals/
30. Eugene Yan - Patterns for Building LLM-based Systems and Products - https://eugeneyan.com/writing/llm-patterns/
31. Eugene Yan - Evaluating the Effectiveness of LLM-Evaluators - https://eugeneyan.com/writing/llm-evaluators/
32. Eugene Yan - How to Generate and Use Synthetic Data for Finetuning - https://eugeneyan.com/writing/synthetic/
33. Eugene Yan - Evaluation and Hallucination Detection for Abstractive Summaries - https://eugeneyan.com/writing/abstractive/
34. Eugene Yan - Some Intuition on Attention and the Transformer - https://eugeneyan.com/writing/attention/
35. Chip Huyen - Building LLM Applications for Production - https://huyenchip.com/2023/04/11/llm-engineering.html
36. Chip Huyen - Open Challenges in LLM Research - https://huyenchip.com/2023/08/16/llm-research-open-challenges.html
37. Chip Huyen - RLHF: Reinforcement Learning from Human Feedback - https://huyenchip.com/2023/05/02/rlhf.html
38. Chip Huyen - Multimodality and Large Multimodal Models - https://huyenchip.com/2023/10/10/multimodal.html
39. Chip Huyen - Agents - https://huyenchip.com/2025/01/07/agents.html
40. Chip Huyen - Common Pitfalls When Building Generative AI Applications - https://huyenchip.com/2025/01/16/ai-engineering-pitfalls.html
41. Sebastian Ruder - Transfer Learning - https://www.ruder.io/transfer-learning/
42. Sebastian Ruder - An Overview of Instruction Tuning Data - https://www.ruder.io/an-overview-of-instruction-tuning-data/
43. Sebastian Ruder - Recent Advances in Language Model Fine-tuning - https://www.ruder.io/recent-advances-lm-fine-tuning/
44. Sebastian Ruder - The State of Multilingual AI - https://www.ruder.io/state-of-multilingual-ai/
45. Hugging Face - Stable Diffusion with Diffusers - https://huggingface.co/blog/stable_diffusion
46. Hugging Face - Illustrating Reinforcement Learning from Human Feedback - https://huggingface.co/blog/rlhf
47. Hugging Face - Code a Simple RAG from Scratch - https://huggingface.co/blog/ngxson/make-your-own-rag
48. Hugging Face - KV Caching Explained - https://huggingface.co/blog/not-lain/kv-caching
49. Hugging Face - ColPali: Efficient Document Retrieval with Vision Language Models - https://huggingface.co/blog/manu/colpali
50. Hugging Face - Preference Tuning LLMs with Direct Preference Optimization Methods - https://huggingface.co/blog/pref-tuning
51. Hugging Face - Introduction to State Space Models - https://huggingface.co/blog/lbourdois/get-on-the-ssm-train
52. Simon Willison - Large Language Models are Having Their Stable Diffusion Moment - https://simonwillison.net/2023/Mar/11/llama/
53. Simon Willison - Prompt Injection and Jailbreaking - https://simonwillison.net/tags/prompt-injection/
54. Peter Bloem - Transformers from Scratch - http://www.peterbloem.nl/blog/transformers
55. E2E ML - Transformers from Scratch - https://e2eml.school/transformers.html
56. Google Research - Transformers in Music Recommendation - https://research.google/blog/transformers-in-music-recommendation/
57. Lightning AI - How to Finetune GPT-like LLMs on a Custom Dataset - https://lightning.ai/pages/blog/how-to-finetune-gpt-like-large-language-models-on-a-custom-dataset/
58. Francois Chollet - The Limitations of Deep Learning - https://blog.keras.io/the-limitations-of-deep-learning.html

## HN High-Interaction Calibration

Examples from the Hacker News candidate pass:

| Article | HN points | HN comments | Why it matters |
|---|---:|---:|---|
| Anthropic - Tracing the thoughts of a large language model | 1072 | 394 | High community interest plus explicit findings and limitations. |
| Meta - Code Llama | 970 | 501 | Model release writing with benchmarks, capabilities, and ecosystem implications. |
| Simon Willison - LLMs are having their Stable Diffusion moment | 811 | 369 | Independent high-discussion analysis of a field shift. |
| Jay Alammar - The Illustrated Transformer | 500 | 88 | Durable visual explainer for a canonical architecture. |
| Eugene Yan - Task-specific LLM evals | 182 | 46 | Practical eval article with evidence, critique, and implementation examples. |

HN popularity was used as a discovery signal, not as a proxy for correctness.

## Conclusions for the Skill

1. A fixed section schema is too brittle. High-quality posts vary by paper type and author intent.
2. A fixed responsibility skeleton is robust. The same functions recur across strong articles: orient, frame, map claims, reconstruct mechanism, interpret evidence, critique boundaries, synthesize transfer.
3. The generated blog should be a teaching artifact, not a paper summary. It should reorder the paper when that improves comprehension.
4. Technical fidelity requires a claim ledger and must-preserve detail list before writing.
5. Critique must be first-class. Strong articles frequently discuss limitations, tradeoffs, or open problems.
6. Visual explanation is not decoration. Diagrams, examples, pseudo-code, and tables should be used when they reduce cognitive load.
