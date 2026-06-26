export const collections = [
  {
    id: "agentic-rag",
    name: "Agentic RAG",
    owner: "paper club",
    color: "blue",
    description: "面向工具调用、检索规划、多轮反思的论文池。",
  },
  {
    id: "evaluation",
    name: "Evaluation",
    owner: "benchmark",
    color: "emerald",
    description: "自动化评测、LLM-as-judge、数据质量和可复现实验。",
  },
  {
    id: "systems",
    name: "Systems",
    owner: "infra",
    color: "amber",
    description: "推理系统、检索服务、数据流水线和工程化落地。",
  },
];

export const statusLabels = {
  tracking: "追踪中",
  reading: "精读中",
  summarized: "已总结",
  archived: "已归档",
};

export const priorityLabels = {
  high: "高",
  medium: "中",
  low: "低",
};

export const topicOptions = [
  "agent",
  "retrieval",
  "evaluation",
  "systems",
  "benchmark",
  "survey",
  "alignment",
];

export const seedPapers = [
  {
    id: "paper-agentic-rag-survey",
    title: "Surveying Agentic Retrieval-Augmented Generation Workflows",
    authors: ["Lin Chen", "Maya Patel", "Jun Wu"],
    venue: "arXiv",
    year: 2026,
    collectionId: "agentic-rag",
    status: "tracking",
    priority: "high",
    score: 92,
    updatedAt: "2026-06-16",
    addedAt: "2026-06-10",
    unreadUpdates: 3,
    recommended: true,
    recommendedAt: "2026-06-16",
    readingEvents: [
      { date: "2026-06-16", text: "标记为推荐/星标。" },
      { date: "2026-06-14", text: "完成 taxonomy 首轮整理。" },
    ],
    topics: ["agent", "retrieval", "survey"],
    source: "arXiv watchlist",
    links: {
      arxiv: "https://arxiv.org/",
      pdf: "https://arxiv.org/pdf/",
      repo: "https://github.com/",
    },
    abstract:
      "A structured survey of retrieval-augmented agents that separates query planning, tool routing, memory, and verifier loops.",
    keyClaims: [
      "将 RAG agent 拆成 planner, retriever, worker, verifier 四层后更容易比较系统。",
      "长任务场景里, verifier 的收益大于单纯增加 top-k 检索。",
      "缺少可复现实验日志仍然是该方向最大的评估短板。",
    ],
    timeline: [
      { date: "2026-06-16", text: "新增附录: 多跳检索失败案例。" },
      { date: "2026-06-14", text: "作者发布实验配置草案。" },
      { date: "2026-06-10", text: "加入 Auto Scholar 追踪。" },
    ],
    markdown: `# Surveying Agentic RAG Workflows

## TL;DR

这篇论文把 Agentic RAG 拆成 **planner / retriever / worker / verifier** 四个可组合模块。它适合作为 auto_scholar 的综述入口, 因为分类足够清晰, 也暴露了目前评测口径不统一的问题。

## 关键贡献

- 给出 agentic RAG 的任务流 taxonomy。
- 对比单步检索、多轮检索、工具路由和反思验证。
- 汇总可复现实验所需的日志字段。

## 值得追踪的问题

1. verifier 带来的收益是否来自额外 token budget, 还是来自结构化检查?
2. planner 失败时, 系统有没有可恢复路径?
3. 是否能复用到论文写作和文献综述场景?

## 复现实验笔记

| Module | Observable | Risk |
| --- | --- | --- |
| Planner | query plan | 计划过拟合 benchmark |
| Retriever | retrieved chunks | citation drift |
| Verifier | critique trace | judge bias |

> 当前适合先做阅读卡片, 再决定是否进入工程验证。`,
  },
  {
    id: "paper-judge-calibration",
    title: "Calibrating LLM-as-Judge for Literature Review Pipelines",
    authors: ["Ava Moreno", "Tao Zhang"],
    venue: "ACL Findings",
    year: 2026,
    collectionId: "evaluation",
    status: "reading",
    priority: "high",
    score: 88,
    updatedAt: "2026-06-15",
    addedAt: "2026-06-09",
    unreadUpdates: 1,
    readingEvents: [
      { date: "2026-06-15", text: "读完实验设置, 待补 bias cases。" },
      { date: "2026-06-12", text: "记录 judge calibration rubric。" },
    ],
    topics: ["evaluation", "benchmark", "alignment"],
    source: "conference digest",
    links: {
      arxiv: "https://arxiv.org/",
      pdf: "https://aclanthology.org/",
      repo: "https://github.com/",
    },
    abstract:
      "A calibration recipe for judge prompts used in literature review automation, with disagreement analysis across paper types.",
    keyClaims: [
      "对 judge 输出做置信度校准后, paper ranking 更稳定。",
      "综述类论文和系统类论文需要不同 rubric。",
      "人工少量标注可以显著降低 topic bias。",
    ],
    timeline: [
      { date: "2026-06-15", text: "读完实验设置, 待补 bias cases。" },
      { date: "2026-06-11", text: "加入 Evaluation collection。" },
    ],
    markdown: `# Calibrating LLM-as-Judge for Literature Review Pipelines

## 结论

论文主张不要把 LLM judge 当成单一打分器, 而应该把它看成 **rubric + calibration + disagreement audit** 的组合。

## Rubric 维度

- Novelty: 是否真的有新方法或新问题定义。
- Evidence: 论文是否给出足够实验或理论支撑。
- Relevance: 是否匹配当前研究主题。
- Actionability: 是否值得加入后续复现或工程验证。

## 对 auto_scholar 的启发

可以把每篇论文的 Markdown 卡片补充一个 \`judge_audit\` 区块, 记录自动判断和人工修正之间的差异。

## 风险

校准集如果只来自热门方向, 会放大热门方向偏置。`,
  },
  {
    id: "paper-paper-memory",
    title: "Paper Memory: Persistent Notes for Research Agents",
    authors: ["Noah Singh", "Elaine Park", "Qiao Li"],
    venue: "NeurIPS Workshop",
    year: 2025,
    collectionId: "systems",
    status: "summarized",
    priority: "medium",
    score: 81,
    updatedAt: "2026-06-13",
    addedAt: "2026-06-03",
    unreadUpdates: 0,
    readAt: "2026-06-13",
    readingEvents: [
      { date: "2026-06-13", text: "标记为已读。" },
      { date: "2026-06-07", text: "补充 memory schema 对照。" },
    ],
    topics: ["systems", "agent", "retrieval"],
    source: "lab reading list",
    links: {
      arxiv: "https://arxiv.org/",
      pdf: "https://papers.nips.cc/",
      repo: "https://github.com/",
    },
    abstract:
      "A storage model for research agents that maintains claims, evidence, and follow-up tasks as first-class memory objects.",
    keyClaims: [
      "论文笔记应存结构化 claim, 不只是摘要。",
      "引用证据需要和原文位置绑定。",
      "研究 agent 的记忆应支持遗忘和冲突解决。",
    ],
    timeline: [
      { date: "2026-06-13", text: "已生成中文总结。" },
      { date: "2026-06-07", text: "补充 memory schema 对照。" },
    ],
    markdown: `# Paper Memory: Persistent Notes for Research Agents

## 一句话

这篇更像系统设计蓝图: 把论文阅读过程中的 claim、evidence、question 和 action item 全部对象化。

## 数据模型

\`\`\`json
{
  "claim": "Verifier improves retrieval quality",
  "evidence": ["section 4.2", "table 3"],
  "confidence": 0.74,
  "next_action": "replicate on local benchmark"
}
\`\`\`

## 可复用点

- Markdown 展示层可以先承载结构化块。
- 后续 API 层可以把 paper note 保存成 JSON。
- 同一篇论文的多轮阅读记录需要 timeline。`,
  },
  {
    id: "paper-citation-graphs",
    title: "Citation Graph Signals for Fast Literature Triage",
    authors: ["Iris Khan", "Victor Huang"],
    venue: "WWW",
    year: 2025,
    collectionId: "evaluation",
    status: "archived",
    priority: "low",
    score: 74,
    updatedAt: "2026-06-01",
    addedAt: "2026-05-27",
    unreadUpdates: 0,
    readAt: "2026-06-01",
    readingEvents: [
      { date: "2026-06-01", text: "标记为已读并归档为背景材料。" },
    ],
    topics: ["evaluation", "systems"],
    source: "manual import",
    links: {
      arxiv: "https://arxiv.org/",
      pdf: "https://dl.acm.org/",
      repo: "https://github.com/",
    },
    abstract:
      "A lightweight triage method that combines citation neighborhoods, author overlap, and venue signals.",
    keyClaims: [
      "引用图适合做 triage, 不适合直接做质量判断。",
      "新论文需要冷启动补偿, 否则会被系统性低估。",
    ],
    timeline: [
      { date: "2026-06-01", text: "归档为背景材料。" },
      { date: "2026-05-27", text: "从阅读清单导入。" },
    ],
    markdown: `# Citation Graph Signals for Fast Literature Triage

## 读后判断

适合做背景特征, 但不能作为自动收录的唯一标准。

## 可以借鉴

- 用相邻论文解释推荐原因。
- 对新论文做冷启动补偿。
- 在 UI 中展示引用路径, 帮助用户快速判断关系。`,
  },
];
