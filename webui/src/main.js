import {
  collections,
  priorityLabels,
  seedPapers,
  statusLabels,
} from "./data/papers.js";
import { escapeHtml, renderMarkdown } from "./lib/markdown.js";

const STORAGE_KEY = "auto-scholar.webui.papers.v1";
const DEFAULT_REPO_CONFIG = {
  configSource: ".as/config.yaml",
  personalKnowledgeBasePath: "../my_autoscholar",
  paperReadPath: "../my_autoscholar",
  error: "",
  loaded: false,
};
const SEED_PAPER_IDS = new Set(seedPapers.map((paper) => paper.id));
const ROUTES = [
  { id: "overview", label: "总览", hint: "今日状态" },
  { id: "tracking", label: "追踪", hint: "更新与优先级" },
  { id: "library", label: "收录", hint: "导入与分组" },
  { id: "reader", label: "阅读", hint: "Markdown 论文卡" },
];
const PAPER_STATE_FILTERS = [
  ["all", "全部"],
  ["unread", "未读"],
  ["read", "已读"],
  ["recommended", "推荐"],
  ["archived", "已归档"],
];
const MIN_TOPIC_FILTER_COUNT = 2;
const MAX_TOPIC_FILTERS = 18;
const OVERVIEW_ACTIVITY_WEEKS = 13;
const OVERVIEW_TOPIC_LIMIT = 16;
const ACTIVITY_WEEKDAY_LABELS = ["周一", "周二", "周三", "周四", "周五", "周六", "周日"];
const MERMAID_IMPORT_URL = "https://cdn.jsdelivr.net/npm/mermaid@10.9.3/dist/mermaid.esm.min.mjs";

let mermaidModulePromise = null;
let mermaidRenderSequence = 0;

const state = {
  route: parseRoute(),
  query: "",
  topic: "all",
  statusFilters: [],
  collection: "all",
  selectedId: seedPapers[0].id,
  papers: seedPapers.map(normalizePaper),
  papersSource: "mock data",
  repoConfig: { ...DEFAULT_REPO_CONFIG },
  actionMessage: "",
  readerQueueScrollTop: 0,
  intakeDraft: getDefaultIntakeDraft(),
};

const app = document.querySelector("#app");

setupEvents();
render();
initData();

window.addEventListener("hashchange", () => {
  state.route = parseRoute();
  render();
});

window.addEventListener("resize", syncReaderPanelHeight);

async function initData() {
  await loadRepoConfig();
  await loadKnowledgeBasePapers();
  render();
}

async function loadRepoConfig() {
  try {
    const response = await fetch("/api/config.json", { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const config = await response.json();
    const personalKnowledgeBasePath =
      config.personalKnowledgeBasePath || DEFAULT_REPO_CONFIG.personalKnowledgeBasePath;
    state.repoConfig = {
      ...DEFAULT_REPO_CONFIG,
      ...config,
      personalKnowledgeBasePath,
      paperReadPath: config.paperReadPath || personalKnowledgeBasePath,
      loaded: true,
    };
  } catch (err) {
    state.repoConfig = {
      ...DEFAULT_REPO_CONFIG,
      error: String(err?.message ?? err),
      loaded: false,
    };
  }
}

async function loadKnowledgeBasePapers() {
  try {
    const response = await fetch("/api/papers.json", { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const payload = await response.json();
    const knowledgeBasePapers = Array.isArray(payload.papers)
      ? payload.papers.map(normalizePaper)
      : [];
    const localPapers = loadLocalUserPapers().map(normalizePaper);

    if (knowledgeBasePapers.length > 0) {
      state.papers = dedupePapers([...knowledgeBasePapers, ...localPapers]);
      state.papersSource = `${knowledgeBasePapers.length} knowledge-base articles`;
    } else {
      state.papers = dedupePapers([...localPapers, ...seedPapers.map(normalizePaper)]);
      state.papersSource = payload.error || "mock data";
    }
  } catch (err) {
    const localPapers = loadLocalUserPapers().map(normalizePaper);
    state.papers = dedupePapers([...localPapers, ...seedPapers.map(normalizePaper)]);
    state.papersSource = `mock data (${String(err?.message ?? err)})`;
  }

  if (!state.papers.some((paper) => paper.id === state.selectedId)) {
    state.selectedId = sortPapersForDisplay(state.papers)[0]?.id ?? "";
  }
}

function parseRoute() {
  const route = window.location.hash.replace("#", "");
  return ROUTES.some((item) => item.id === route) ? route : "overview";
}

function loadLocalUserPapers() {
  try {
    const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "null");
    if (Array.isArray(saved)) return saved.filter(isLocalUserPaper);
  } catch {
    // Ignore invalid user storage and fall back to knowledge-base or seed data.
  }
  return [];
}

function savePapers() {
  window.localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(state.papers.filter(isLocalUserPaper)),
  );
}

function isLocalUserPaper(paper) {
  if (!paper) return false;
  return paper.origin === "local" &&
    !SEED_PAPER_IDS.has(paper.id) &&
    !String(paper.id ?? "").startsWith("kb-");
}

function dedupePapers(papers) {
  const seen = new Set();
  return papers.filter((paper) => {
    if (!paper?.id || seen.has(paper.id)) return false;
    seen.add(paper.id);
    return true;
  });
}

function normalizePaper(paper) {
  const readAt = normalizeDate(paper.readAt);
  const recommendedAt = normalizeDate(paper.recommendedAt);
  const readingEvents = Array.isArray(paper.readingEvents) ? paper.readingEvents : [];
  return {
    ...paper,
    authors: paper.authors ?? [],
    links: paper.links ?? {},
    topics: paper.topics ?? [],
    keyClaims: paper.keyClaims ?? [],
    timeline: paper.timeline ?? [],
    readingEvents,
    unreadUpdates: Number(paper.unreadUpdates ?? 0),
    score: Number(paper.score ?? 60),
    readAt,
    recommended: Boolean(paper.recommended),
    recommendedAt,
    markdown: paper.markdown ?? buildDefaultMarkdown(paper),
  };
}

function setupEvents() {
  app.addEventListener("scroll", (event) => {
    if (!(event.target instanceof Element) || !event.target.matches(".reader-list .paper-stack")) return;
    state.readerQueueScrollTop = event.target.scrollTop;
  }, true);

  app.addEventListener("click", async (event) => {
    const target = event.target.closest("[data-action], [data-select-paper], [data-topic-filter], [data-status-filter]");
    if (!target) return;

    if (target.dataset.topicFilter) {
      state.topic = state.topic === target.dataset.topicFilter ? "all" : target.dataset.topicFilter;
      render();
      return;
    }

    if (target.dataset.statusFilter) {
      toggleStatusFilter(target.dataset.statusFilter);
      render();
      return;
    }

    if (target.dataset.selectPaper) {
      const selectedId = target.dataset.selectPaper;
      state.readerQueueScrollTop = getReaderQueueScrollTop();
      state.selectedId = selectedId;
      if (target.dataset.openReader === "true") {
        window.location.hash = "reader";
      } else if (selectReaderPaperInPlace(selectedId)) {
        return;
      } else {
        render();
      }
      return;
    }

    const action = target.dataset.action;
    const id = target.dataset.paperId;

    if (action === "clear-filters") {
      state.query = "";
      state.topic = "all";
      state.statusFilters = [];
      state.collection = "all";
      render();
      return;
    }

    if (action === "toggle-read" && id) {
      await updatePaper(id, (paper) => {
        const nextReadAt = isPaperRead(paper) ? "" : today();
        return withReadingEvent({
          ...paper,
          readAt: nextReadAt,
          unreadUpdates: nextReadAt ? 0 : paper.unreadUpdates,
        }, nextReadAt ? "标记为已读。" : "重新标记为未读。");
      }, { persist: true });
      return;
    }

    if (action === "toggle-recommend" && id) {
      await updatePaper(id, (paper) => {
        const recommended = !paper.recommended;
        return withReadingEvent({
          ...paper,
          recommended,
          recommendedAt: recommended ? today() : "",
        }, recommended ? "标记为推荐/星标。" : "取消推荐/星标。");
      }, { persist: true });
      return;
    }

    if (action === "cycle-priority" && id) {
      const next = { high: "medium", medium: "low", low: "high" };
      await updatePaper(id, (paper) => ({ ...paper, priority: next[paper.priority] ?? "medium" }), {
        persist: true,
      });
      return;
    }

    if (action === "archive" && id) {
      await updatePaper(id, (paper) => ({
        ...paper,
        status: paper.status === "archived" ? "summarized" : "archived",
        unreadUpdates: 0,
      }), { persist: true });
    }
  });

  app.addEventListener("input", (event) => {
    const target = event.target;
    if (target.closest("#paperIntakeForm") && target.name) {
      state.intakeDraft[target.name] = target.value;
      return;
    }

    if (target.id !== "paperSearch") return;
    const cursor = target.selectionStart;
    state.query = target.value;
    render();
    const input = document.querySelector("#paperSearch");
    input?.focus();
    input?.setSelectionRange(cursor, cursor);
  });

  app.addEventListener("change", (event) => {
    const target = event.target;
    if (target.closest("#paperIntakeForm") && target.name) {
      state.intakeDraft[target.name] = target.value;
      return;
    }
    if (target.id === "collectionFilter") state.collection = target.value;
    if (target.matches("[data-status-select]")) {
      updatePaper(target.dataset.statusSelect, (paper) => ({
        ...paper,
        status: target.value,
        unreadUpdates: target.value === "archived" ? 0 : paper.unreadUpdates,
      }), { persist: true });
      return;
    }
    render();
  });

  app.addEventListener("submit", (event) => {
    if (event.target.id !== "paperIntakeForm") return;
    event.preventDefault();
    const form = new FormData(event.target);
    const title = String(form.get("title") ?? "").trim();
    if (!title) return;
    const topics = String(form.get("topics") ?? "")
      .split(",")
      .map((topic) => topic.trim())
      .filter(Boolean);
    const paper = normalizePaper({
      id: `paper-${Date.now()}`,
      title,
      authors: splitAuthors(String(form.get("authors") ?? "")),
      venue: String(form.get("venue") ?? "unknown").trim() || "unknown",
      year: Number(form.get("year") || new Date().getFullYear()),
      collectionId: String(form.get("collectionId") ?? collections[0].id),
      status: "tracking",
      priority: String(form.get("priority") ?? "medium"),
      score: 68,
      updatedAt: today(),
      addedAt: today(),
      unreadUpdates: 1,
      topics: topics.length ? topics : ["paper"],
      source: "webui intake",
      origin: "local",
      links: { arxiv: String(form.get("url") ?? "").trim() },
      abstract: String(form.get("abstract") ?? "").trim() || "待补充摘要。",
      keyClaims: ["待完成首轮阅读。"],
      timeline: [{ date: today(), text: "通过 Web UI 收录。" }],
    });
    state.papers = [paper, ...state.papers];
    state.selectedId = paper.id;
    state.intakeDraft = getDefaultIntakeDraft();
    savePapers();
    window.location.hash = "reader";
    render();
  });
}

async function updatePaper(id, updater, options = {}) {
  const before = state.papers.find((paper) => paper.id === id);
  if (!before) return;
  const nextPaper = normalizePaper(updater(before));

  state.actionMessage = "";
  state.papers = state.papers.map((paper) => (paper.id === id ? nextPaper : paper));
  savePapers();
  render();

  if (!options.persist || !isKnowledgeBasePaper(nextPaper)) return;

  try {
    const persisted = await persistKnowledgeBasePaperState(nextPaper);
    state.papers = state.papers.map((paper) =>
      paper.id === id ? normalizePaper({ ...paper, ...persisted }) : paper,
    );
  } catch (err) {
    state.papers = state.papers.map((paper) => (paper.id === id ? before : paper));
    state.actionMessage = `保存失败: ${String(err?.message ?? err)}`;
  }
  render();
}

function splitAuthors(value) {
  return value
    .split(",")
    .map((author) => author.trim())
    .filter(Boolean);
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function normalizeDate(value) {
  const text = String(value ?? "").trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : "";
}

function getDefaultIntakeDraft() {
  return {
    title: "",
    authors: "",
    venue: "",
    year: String(new Date().getFullYear()),
    collectionId: collections[0]?.id ?? "",
    priority: "medium",
    topics: "",
    url: "",
    abstract: "",
  };
}

function isKnowledgeBasePaper(paper) {
  return paper?.origin === "knowledge-base" && String(paper.id ?? "").startsWith("kb-");
}

function isPaperRead(paper) {
  return Boolean(normalizeDate(paper?.readAt));
}

function isPaperArchived(paper) {
  return paper?.status === "archived";
}

function isPaperComplete(paper) {
  return isPaperRead(paper) || isPaperArchived(paper);
}

function withReadingEvent(paper, text) {
  const event = { date: today(), text };
  return {
    ...paper,
    readingEvents: [event, ...(paper.readingEvents ?? [])].slice(0, 40),
    timeline: [event, ...(paper.timeline ?? [])],
  };
}

async function persistKnowledgeBasePaperState(paper) {
  const response = await fetch("/api/paper-state", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      paperId: paper.id,
      stateKey: paper.stateKey,
      localPath: paper.localPath,
      state: {
        status: paper.status,
        priority: paper.priority,
        unreadUpdates: paper.unreadUpdates,
        readAt: paper.readAt,
        recommended: paper.recommended,
        recommendedAt: paper.recommendedAt,
        readingEvents: paper.readingEvents,
      },
    }),
  });

  const responseText = await response.text();
  const payload = parseJsonResponse(responseText);
  if (!response.ok) {
    throw new Error(payload.error || buildHttpError(response, responseText));
  }
  return payload.state ?? {};
}

function parseJsonResponse(text) {
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    return {};
  }
}

function buildHttpError(response, responseText) {
  const detail = responseText.trim().slice(0, 120);
  if (response.status === 404 && detail === "Not found") {
    return "当前 Web UI 服务缺少 /api/paper-state，请重启 node scripts/serve.mjs";
  }
  return detail ? `HTTP ${response.status}: ${detail}` : `HTTP ${response.status}`;
}

function render() {
  const selected = getSelectedPaper();
  const readerQueueScrollTop = getReaderQueueScrollTop() || state.readerQueueScrollTop;
  app.innerHTML = `
    <div class="app-shell">
      <aside class="sidebar">
        <a class="brand" href="#overview" aria-label="Auto Scholar home">
          <img src="./public/auto-scholar-mark.svg" alt="" />
          <span>
            <strong>Auto Scholar</strong>
            <small>Research workspace</small>
          </span>
        </a>
        <nav class="nav-list" aria-label="Primary navigation">
          ${ROUTES.map(renderNavItem).join("")}
        </nav>
        <div class="sidebar-footer">
          <span class="sync-dot"></span>
          <span title="${escapeHtml(state.repoConfig.configSource)}">${escapeHtml(state.papersSource)} · ${escapeHtml(state.repoConfig.paperReadPath)}</span>
        </div>
      </aside>
      <main class="workspace workspace-${state.route}">
        ${renderTopbar(selected)}
        ${state.actionMessage ? `<div class="status-note" role="status">${escapeHtml(state.actionMessage)}</div>` : ""}
        ${renderRoute()}
      </main>
    </div>
  `;
  syncReaderPanelHeight();
  restoreReaderQueueScroll(readerQueueScrollTop);
  renderMermaidDiagrams(app);
}

function getReaderQueueScrollTop() {
  if (state.route !== "reader") return 0;
  return app.querySelector(".reader-list .paper-stack")?.scrollTop ?? 0;
}

function restoreReaderQueueScroll(scrollTop) {
  if (state.route !== "reader" || scrollTop <= 0) return;
  state.readerQueueScrollTop = scrollTop;
  const applyScroll = () => {
    const stack = app.querySelector(".reader-list .paper-stack");
    if (!stack) return;
    stack.scrollTop = scrollTop;
  };
  applyScroll();
  window.requestAnimationFrame(applyScroll);
  window.setTimeout(applyScroll, 0);
}

function syncReaderPanelHeight() {
  if (state.route !== "reader") return;
  const layout = app.querySelector(".reader-layout");
  if (!layout) return;
  const { top } = layout.getBoundingClientRect();
  const panelHeight = Math.max(320, window.innerHeight - top - 32);
  layout.style.setProperty("--reader-panel-height", `${panelHeight}px`);
}

function selectReaderPaperInPlace(paperId) {
  if (state.route !== "reader") return false;
  const paper = state.papers.find((item) => item.id === paperId);
  const stack = app.querySelector(".reader-list .paper-stack");
  const paperPanel = app.querySelector(".reader-paper");
  if (!paper || !stack || !paperPanel) return false;

  stack.querySelectorAll(".reader-item").forEach((item) => {
    item.classList.toggle("is-selected", item.dataset.selectPaper === paper.id);
  });

  paperPanel.outerHTML = renderReaderPaper(paper);
  const nextPaperPanel = app.querySelector(".reader-paper");
  if (nextPaperPanel) {
    nextPaperPanel.scrollTop = 0;
    renderMermaidDiagrams(nextPaperPanel);
  }

  const currentTitle = app.querySelector("[data-current-paper-title]");
  if (currentTitle) {
    currentTitle.textContent = paper.title;
    currentTitle.parentElement?.setAttribute("title", paper.title);
  }

  return true;
}

function renderMermaidDiagrams(root) {
  const blocks = [...root.querySelectorAll("[data-mermaid-diagram]")]
    .filter((block) => !block.dataset.mermaidRendered);
  if (!blocks.length) return;

  loadMermaid()
    .then((mermaid) => Promise.all(blocks.map((block) => renderMermaidBlock(block, mermaid))))
    .catch((err) => {
      mermaidModulePromise = null;
      console.warn("Mermaid library could not be loaded.", err);
    });
}

function loadMermaid() {
  if (!mermaidModulePromise) {
    mermaidModulePromise = import(MERMAID_IMPORT_URL).then((module) => {
      const mermaid = module.default ?? module;
      mermaid.initialize({
        startOnLoad: false,
        securityLevel: "strict",
        theme: "base",
        flowchart: {
          htmlLabels: false,
        },
        sequence: {
          mirrorActors: false,
        },
      });
      return mermaid;
    });
  }
  return mermaidModulePromise;
}

async function renderMermaidBlock(block, mermaid) {
  if (!block.isConnected || block.dataset.mermaidRendered) return;
  const source = block.querySelector(".mermaid-source code")?.textContent.trim();
  if (!source) return;

  block.dataset.mermaidRendered = "pending";
  try {
    mermaidRenderSequence += 1;
    const renderId = `auto-scholar-mermaid-${mermaidRenderSequence}`;
    const { svg, bindFunctions } = await mermaid.render(renderId, source);
    if (!block.isConnected) return;
    block.innerHTML = `<div class="mermaid-rendered">${svg}</div>`;
    block.dataset.mermaidRendered = "true";
    bindFunctions?.(block);
  } catch (err) {
    block.dataset.mermaidRendered = "error";
    block.classList.add("is-error");
    console.warn("Mermaid diagram could not be rendered.", err);
  }
}

function renderNavItem(route) {
  const active = state.route === route.id ? "is-active" : "";
  return `
    <a class="nav-item ${active}" href="#${route.id}">
      <span class="nav-icon">${route.id.slice(0, 1).toUpperCase()}</span>
      <span>
        <strong>${route.label}</strong>
        <small>${escapeHtml(getNavHint(route))}</small>
      </span>
    </a>
  `;
}

function getNavHint(route) {
  const stats = getStats();
  if (route.id === "tracking") return `${stats.unread} 条更新`;
  if (route.id === "reader") return `${stats.read}/${stats.total} 已读 · ${stats.recommended} 推荐`;
  return route.hint;
}

function renderTopbar(selected) {
  const stats = getStats();
  const showCollectionFilter = state.route !== "reader";
  const toolbarClass = state.route === "reader" ? "paper-toolbar is-reader-toolbar" : "paper-toolbar";
  return `
    <header class="topbar">
      <div class="topbar-heading">
        <p class="eyebrow">auto_scholar / webui</p>
        <h1>${getRouteTitle()}</h1>
      </div>
      ${state.route === "overview" ? "" : `
      <div class="${toolbarClass}" aria-label="Paper workspace controls">
        <div class="toolbar-primary">
          <label class="toolbar-search">
            <span>搜索</span>
            <input id="paperSearch" value="${escapeHtml(state.query)}" placeholder="标题、作者、主题" />
          </label>
          <div class="toolbar-selects ${showCollectionFilter ? "" : "is-status-only"}" aria-label="Paper filters">
            ${renderToolbarStatusFilters()}
            ${showCollectionFilter ? renderToolbarSelect("分组", "collectionFilter", [
              ["all", "全部"],
              ...collections.map((item) => [item.id, item.name]),
            ], state.collection) : ""}
          </div>
        </div>
        <div class="toolbar-meta">
          <div class="toolbar-summary" aria-label="Paper stats">
            <span><strong>${stats.total}</strong>论文</span>
            <span><strong>${stats.read}</strong>已读</span>
            <span><strong>${stats.recommended}</strong>推荐</span>
          </div>
          <div class="toolbar-context">
            <div title="${escapeHtml(selected.title)}">
              <span>当前</span>
              <strong data-current-paper-title>${escapeHtml(selected.title)}</strong>
            </div>
            <div title="${escapeHtml(state.repoConfig.paperReadPath)}">
              <span>路径</span>
              <strong>${escapeHtml(state.repoConfig.paperReadPath)}</strong>
            </div>
          </div>
        </div>
      </div>
      `}
    </header>
  `;
}

function renderTopicCloud() {
  const topics = getTopicCloudItems();
  const activeTopic = getVisibleTopicFilter(topics);
  return `
    <div class="reader-topic-cloud" aria-label="主题筛选">
      <div class="topic-cloud-head">
        <span>高频主题</span>
        <small>${MIN_TOPIC_FILTER_COUNT}+ papers</small>
      </div>
      <div class="topic-cloud-items">
        ${renderTopicCloudButton({ topic: "all", count: state.papers.length }, activeTopic)}
        ${topics.map((topic) => renderTopicCloudButton(topic, activeTopic)).join("")}
      </div>
    </div>
  `;
}

function renderTopicCloudButton(item, activeTopic) {
  const active = activeTopic === item.topic ? "is-active" : "";
  const label = item.topic === "all" ? "全部" : item.topic;
  return `
    <button class="topic-chip ${active}" type="button" data-topic-filter="${escapeHtml(item.topic)}" aria-pressed="${activeTopic === item.topic}">
      <span>${escapeHtml(label)}</span>
      <small>${item.count}</small>
    </button>
  `;
}

function renderToolbarSelect(label, id, options, currentValue) {
  return `
    <label class="toolbar-select">
      <span>${label}</span>
      <select id="${id}">
        ${options.map(([value, optionLabel]) => `<option value="${escapeHtml(value)}" ${selected(currentValue, value)}>${escapeHtml(optionLabel)}</option>`).join("")}
      </select>
    </label>
  `;
}

function renderToolbarStatusFilters() {
  const activeFilters = getActiveStatusFilters();
  const allActive = activeFilters.length === 0;
  return `
    <fieldset class="toolbar-status-filter">
      <legend>状态</legend>
      <div class="toolbar-status-options" aria-label="状态筛选">
        ${PAPER_STATE_FILTERS.map(([value, label]) => {
          const isActive = value === "all" ? allActive : activeFilters.includes(value);
          return `
            <button
              class="status-filter-button ${isActive ? "is-active" : ""}"
              type="button"
              data-status-filter="${escapeHtml(value)}"
              aria-pressed="${isActive}"
            >
              ${escapeHtml(label)}
            </button>
          `;
        }).join("")}
      </div>
    </fieldset>
  `;
}

function getRouteTitle() {
  return {
    overview: "论文工作台",
    tracking: "论文追踪",
    library: "论文收录",
    reader: "Markdown 阅读",
  }[state.route];
}

function renderRoute() {
  if (state.route === "tracking") return renderTrackingPage();
  if (state.route === "library") return renderLibraryPage();
  if (state.route === "reader") return renderReaderPage();
  return renderOverviewPage();
}

function renderOverviewPage() {
  const stats = getStats();
  const attentionPapers = getAttentionPapers().slice(0, 4);

  return `
    <section class="overview-dashboard">
      <div class="metric-band overview-metrics">
        ${renderMetric("收录论文", stats.total, "tracking")}
        ${renderMetric("完成比例", `${stats.completionRate}%`, "summarized")}
        ${renderMetric("待读论文", stats.unreadPapers, "unread")}
        ${renderMetric("更新提醒", stats.unread, "recommended")}
      </div>

      <div class="overview-content-grid">
        <div class="overview-column">
          ${renderCollectionReadinessPanel(stats)}
          ${renderCollectionCoveragePanel()}
        </div>
        <div class="overview-column">
          ${renderReadingTrackPanel()}
          ${renderAttentionPanel(attentionPapers)}
          ${renderRecentSignalsPanel()}
        </div>
      </div>
    </section>
  `;
}

function renderCollectionReadinessPanel(stats) {
  const readSegments = getReadStateSegments();
  const topics = getTopicItems({ limit: OVERVIEW_TOPIC_LIMIT });
  const visibleTopics = topics.slice(0, 14);
  const activeTopic = getVisibleTopicFilter(topics);
  const maxTopicCount = topics[0]?.count ?? 1;

  return `
    <section class="panel overview-status-panel">
      <div class="section-head">
        <div>
          <p class="eyebrow">status</p>
          <h2>收录与阅读状态</h2>
        </div>
      </div>
      <div class="read-progress-bar" aria-label="阅读状态分布">
        ${renderProgressSegments(readSegments, stats.total)}
      </div>
      <div class="read-status-grid">
        ${readSegments.map((item) => `
          <div class="read-status-item status-${item.tone}">
            <span>${escapeHtml(item.label)}</span>
            <strong>${item.count}</strong>
          </div>
        `).join("")}
      </div>
      ${topics.length ? `
        <div class="status-topic-block">
          <div class="status-topic-head">
            <h3>高频 topic</h3>
          </div>
          <div class="overview-topic-cloud" aria-label="论文 topic 云">
            ${visibleTopics.map((item) => renderOverviewTopicChip(item, activeTopic, maxTopicCount)).join("")}
          </div>
        </div>
      ` : ""}
    </section>
  `;
}

function renderProgressSegments(segments, total) {
  const visibleSegments = segments.filter((item) => item.count > 0);
  if (!visibleSegments.length) {
    return `<span class="progress-segment segment-empty" style="--share: 100%;"></span>`;
  }

  return visibleSegments.map((item) => `
    <span
      class="progress-segment segment-${item.tone}"
      style="--share: ${formatShare(item.count, total)}%;"
      title="${escapeHtml(item.label)}: ${item.count}"
    ></span>
  `).join("");
}

function renderOverviewTopicChip(item, activeTopic, maxCount) {
  const active = activeTopic === item.topic ? "is-active" : "";
  const strength = Math.max(28, Math.round((item.count / maxCount) * 100));
  return `
    <button
      class="topic-chip overview-topic-chip ${active}"
      type="button"
      data-topic-filter="${escapeHtml(item.topic)}"
      style="--topic-strength: ${strength};"
      aria-pressed="${activeTopic === item.topic}"
    >
      <span>#${escapeHtml(item.topic)}</span>
      <small>${item.count}</small>
    </button>
  `;
}

function renderReadingTrackPanel() {
  const activity = getReadingActivity(OVERVIEW_ACTIVITY_WEEKS);

  return `
    <section class="panel reading-track-panel">
      <div class="section-head">
        <div>
          <p class="eyebrow">activity</p>
          <h2>阅读活跃日历</h2>
        </div>
        <a class="text-link" href="#reader">进入阅读器</a>
      </div>
      <div class="activity-body">
        <div class="activity-calendar">
          <div class="activity-months" style="--weeks: ${activity.weeks};" aria-hidden="true">
            ${activity.monthLabels.map((item) => `
              <span class="activity-month" style="--column: ${item.column};">${escapeHtml(item.label)}</span>
            `).join("")}
          </div>
          <div class="activity-calendar-grid">
            <div class="activity-weekdays" aria-hidden="true">
              ${ACTIVITY_WEEKDAY_LABELS.map((label) => `<span>${label}</span>`).join("")}
            </div>
            <div
              class="activity-heatmap"
              style="--weeks: ${activity.weeks};"
              role="img"
              aria-label="近 ${activity.weeks} 周阅读活跃"
            >
              ${activity.days.map((day) => `
                <span
                  class="activity-cell level-${day.level}"
                  title="${escapeHtml(formatActivityDateLabel(day.date))}: ${day.count} 篇已读论文"
                  aria-label="${escapeHtml(formatActivityDateLabel(day.date))}: ${day.count} 篇已读论文"
                ></span>
              `).join("")}
            </div>
          </div>
          <div class="activity-legend" aria-hidden="true">
            <span>少</span>
            <span class="activity-cell level-1"></span>
            <span class="activity-cell level-2"></span>
            <span class="activity-cell level-3"></span>
            <span>多</span>
          </div>
        </div>
        <div class="activity-week-card">
          ${renderWeeklyActivityChart(activity)}
        </div>
      </div>
      <div class="activity-stats">
        ${renderMiniStat("活跃天", activity.activeDays)}
        ${renderMiniStat("已读论文", activity.totalPapers)}
        ${renderMiniStat("连续", activity.streak)}
      </div>
    </section>
  `;
}

function renderWeeklyActivityChart(activity) {
  const days = getRecentActivityDays(activity, 7);
  const maxCount = Math.max(1, ...days.map((day) => day.count));
  const total = days.reduce((sum, day) => sum + day.count, 0);
  return `
    <div class="week-chart-head">
      <h3>近 7 天阅读</h3>
      <strong>${total} 篇</strong>
    </div>
    <div class="week-chart-bars" aria-label="近 7 天阅读论文数量">
      ${days.map((day) => `
        <div class="week-bar-item" title="${escapeHtml(formatActivityDateLabel(day.date))}: ${day.count} 篇已读论文">
          <strong>${day.count}</strong>
          <span class="week-bar-track" aria-hidden="true">
            <span style="--bar: ${formatShare(day.count, maxCount)}%;"></span>
          </span>
          <small>${escapeHtml(formatWeekdayShort(day.date))}</small>
        </div>
      `).join("")}
    </div>
  `;
}

function getRecentActivityDays(activity, count) {
  const todayKey = getTodayKey();
  return activity.days.filter((day) => day.date <= todayKey).slice(-count);
}

function renderAttentionPanel(papers) {
  return `
    <section class="panel attention-panel">
      <div class="section-head">
        <div>
          <p class="eyebrow">queue</p>
          <h2>下一步处理</h2>
        </div>
        <a class="text-link" href="#tracking">查看追踪</a>
      </div>
      <div class="paper-stack">
        ${papers.length ? papers.map((paper) => renderPaperRow(paper, { compact: true })).join("") : renderEmpty("当前没有待处理论文")}
      </div>
    </section>
  `;
}

function renderCollectionCoveragePanel() {
  const total = state.papers.length;
  return `
    <section class="panel collection-coverage-panel">
      <div class="section-head">
        <div>
          <p class="eyebrow">collections</p>
          <h2>分组覆盖</h2>
        </div>
        <a class="text-link" href="#library">收录新论文</a>
      </div>
      <div class="collection-coverage-list">
        ${collections.map((collection) => renderCollectionCoverageItem(collection, total)).join("")}
      </div>
    </section>
  `;
}

function renderCollectionCoverageItem(collection, total) {
  const papers = state.papers.filter((paper) => paper.collectionId === collection.id);
  const read = papers.filter(isPaperRead).length;
  const unreadUpdates = papers.reduce((sum, paper) => sum + paper.unreadUpdates, 0);
  return `
    <article class="collection-coverage-item collection-${collection.color}">
      <div>
        <strong>${escapeHtml(collection.name)}</strong>
        <span>${papers.length} 篇 · ${read} 已读 · ${unreadUpdates} 更新</span>
      </div>
      <div class="coverage-meter" aria-hidden="true">
        <span style="--share: ${formatShare(papers.length, total)}%;"></span>
      </div>
    </article>
  `;
}

function renderRecentSignalsPanel() {
  const signals = getRecentSignals(6);
  return `
    <section class="panel recent-signals-panel">
      <div class="section-head">
        <div>
          <p class="eyebrow">timeline</p>
          <h2>最近动态</h2>
        </div>
      </div>
      <div class="signal-list">
        ${signals.length ? signals.map((item) => `
          <button class="signal-item" type="button" data-select-paper="${escapeHtml(item.paperId)}" data-open-reader="true">
            <span>${escapeHtml(item.date)}</span>
            <strong>${escapeHtml(item.title)}</strong>
            <small>${escapeHtml(item.text)}</small>
          </button>
        `).join("") : renderEmpty("暂无动态")}
      </div>
    </section>
  `;
}

function renderMiniStat(label, value) {
  return `
    <div class="mini-stat">
      <span>${escapeHtml(label)}</span>
      <strong>${value}</strong>
    </div>
  `;
}

function renderTrackingPage() {
  const papers = getFilteredPapers();
  return `
    <section class="panel">
      <div class="section-head">
        <div>
          <p class="eyebrow">signals</p>
          <h2>追踪列表</h2>
        </div>
        <button class="ghost-button" type="button" data-action="clear-filters">清空筛选</button>
      </div>
      <div class="paper-stack">
        ${papers.length ? papers.map((paper) => renderPaperRow(paper)).join("") : renderEmpty("没有匹配论文")}
      </div>
    </section>
  `;
}

function renderLibraryPage() {
  const intake = state.intakeDraft;
  return `
    <section class="library-layout">
      <form class="panel intake-form" id="paperIntakeForm">
        <div class="section-head">
          <div>
            <p class="eyebrow">intake</p>
            <h2>收录新论文</h2>
          </div>
        </div>
        <label>标题<input name="title" required value="${escapeHtml(intake.title)}" placeholder="输入论文标题" /></label>
        <label>作者<input name="authors" value="${escapeHtml(intake.authors)}" placeholder="Author A, Author B" /></label>
        <div class="form-grid">
          <label>会议/来源<input name="venue" value="${escapeHtml(intake.venue)}" placeholder="arXiv / ACL / NeurIPS" /></label>
          <label>年份<input name="year" type="number" min="1990" max="2100" value="${escapeHtml(intake.year)}" /></label>
        </div>
        <div class="form-grid">
          <label>Collection
            <select name="collectionId">
              ${collections.map((item) => `<option value="${item.id}" ${selected(intake.collectionId, item.id)}>${item.name}</option>`).join("")}
            </select>
          </label>
          <label>优先级
            <select name="priority">
              ${Object.entries(priorityLabels).map(([value, label]) => `<option value="${value}" ${selected(intake.priority, value)}>${label}</option>`).join("")}
            </select>
          </label>
        </div>
        <label>主题<input name="topics" value="${escapeHtml(intake.topics)}" placeholder="agent, retrieval, evaluation" /></label>
        <label>链接<input name="url" type="url" value="${escapeHtml(intake.url)}" placeholder="https://arxiv.org/abs/..." /></label>
        <label>摘要<textarea name="abstract" rows="4" placeholder="先记录一句话, 后续再补完整笔记">${escapeHtml(intake.abstract)}</textarea></label>
        <button class="primary-button" type="submit"><span>+</span> 收录并开始追踪</button>
        <p class="config-note">论文读取路径: <code>${escapeHtml(state.repoConfig.paperReadPath)}</code></p>
      </form>

      <div class="panel">
        <div class="section-head">
          <div>
            <p class="eyebrow">collections</p>
            <h2>论文分组</h2>
          </div>
        </div>
        <div class="collection-grid">
          ${collections.map(renderCollection).join("")}
        </div>
      </div>
    </section>

    <section class="panel">
      <div class="section-head">
        <div>
          <p class="eyebrow">catalog</p>
          <h2>已收录论文</h2>
        </div>
        <a class="text-link" href="#reader">进入阅读器</a>
      </div>
      <div class="paper-stack">
        ${sortPapersForDisplay(state.papers).map((paper) => renderPaperRow(paper, { compact: true })).join("")}
      </div>
    </section>
  `;
}

function renderReaderPage() {
  const selected = getSelectedPaper();
  const related = getFilteredPapers({ includeTopic: true, includeCollection: false });
  return `
    <section class="reader-layout">
      <aside class="panel reader-list">
        <div class="section-head">
          <div>
            <p class="eyebrow">papers</p>
            <h2>阅读队列</h2>
          </div>
        </div>
        ${renderTopicCloud()}
        <div class="paper-stack">
          ${related.map((paper) => renderReaderItem(paper)).join("")}
        </div>
      </aside>
      ${renderReaderPaper(selected)}
    </section>
  `;
}

function renderReaderPaper(selected) {
  const paperTitle = String(selected.paperTitle ?? "").trim();
  const showPaperTitle = paperTitle && paperTitle !== String(selected.title ?? "").trim();
  return `
    <article class="panel reader-paper">
      <div class="reader-title">
        <div>
          <p class="eyebrow">${escapeHtml(selected.venue)} · ${selected.year}</p>
          <h2>${escapeHtml(selected.title)}</h2>
          ${
            showPaperTitle
              ? `<p class="reader-original-title">${escapeHtml(paperTitle)}</p>`
              : ""
          }
          <p>${escapeHtml(selected.authors.join(", ") || "Unknown authors")}</p>
        </div>
        <div class="reader-actions">
          ${renderReadButton(selected)}
          ${renderRecommendButton(selected)}
          <button class="reader-action-button ${selected.status === "archived" ? "is-archived" : ""}" type="button" title="${selected.status === "archived" ? "取消归档" : "归档"}" aria-pressed="${selected.status === "archived"}" data-action="archive" data-paper-id="${selected.id}">
            <span class="reader-action-icon">▣</span>
            <span>归档</span>
          </button>
        </div>
      </div>
      <div class="reader-meta">
        ${renderReadBadge(selected)}
        ${selected.recommended ? renderBadge("推荐", "recommended") : ""}
        ${renderArchiveBadge(selected)}
        ${renderBadge(`P${priorityLabels[selected.priority]}`, `priority-${selected.priority}`)}
        ${selected.topics.map((topic) => renderBadge(`#${topic}`, "topic")).join("")}
      </div>
      ${renderSourceLinks(selected)}
      <div class="markdown-body">${renderMarkdown(selected.markdown)}</div>
      <div class="timeline">
        <h3>阅读时间线</h3>
        ${selected.timeline.map((item) => `<p><strong>${escapeHtml(item.date)}</strong>${escapeHtml(item.text)}</p>`).join("")}
      </div>
    </article>
  `;
}

function renderMetric(label, value, tone) {
  return `
    <div class="metric metric-${tone}">
      <span>${label}</span>
      <strong>${value}</strong>
    </div>
  `;
}

function renderPaperRow(paper, options = {}) {
  const collection = collections.find((item) => item.id === paper.collectionId);
  const compact = options.compact ? "is-compact" : "";
  return `
    <article class="paper-row ${compact} ${paper.id === state.selectedId ? "is-selected" : ""} ${isPaperArchived(paper) ? "is-archived" : ""}">
      <button class="paper-main" type="button" data-select-paper="${paper.id}" data-open-reader="true">
        <span class="score">${paper.score}</span>
        <span class="paper-copy">
          <strong>${escapeHtml(paper.title)}</strong>
          <small>${escapeHtml(paper.authors.join(", ") || "Unknown authors")} · ${escapeHtml(paper.venue)} ${paper.year}</small>
          <span class="paper-tags">
            ${renderReadBadge(paper)}
            ${paper.recommended ? renderBadge("推荐", "recommended") : ""}
            ${renderArchiveBadge(paper)}
            ${renderBadge(collection?.name ?? "Inbox", "collection")}
            ${paper.unreadUpdates > 0 ? renderBadge(`${paper.unreadUpdates} 更新`, "unread") : ""}
          </span>
        </span>
      </button>
      <div class="paper-actions">
        <select data-status-select="${paper.id}" aria-label="更新论文状态">
          ${Object.entries(statusLabels).map(([value, label]) => `<option value="${value}" ${selected(paper.status, value)}>${label}</option>`).join("")}
        </select>
        <button class="icon-button" type="button" title="切换优先级" data-action="cycle-priority" data-paper-id="${paper.id}">
          P${priorityLabels[paper.priority]}
        </button>
        <button class="icon-button ${isPaperRead(paper) ? "is-read" : ""}" type="button" title="${isPaperRead(paper) ? "标记未读" : "标记已读"}" data-action="toggle-read" data-paper-id="${paper.id}">
          ${isPaperRead(paper) ? "已读" : "未读"}
        </button>
        <button class="icon-button ${paper.recommended ? "is-starred" : ""}" type="button" title="${paper.recommended ? "取消推荐" : "推荐/星标"}" data-action="toggle-recommend" data-paper-id="${paper.id}">
          ${paper.recommended ? "★" : "☆"}
        </button>
      </div>
    </article>
  `;
}

function renderReaderItem(paper) {
  const read = isPaperRead(paper);
  return `
    <button class="reader-item ${paper.id === state.selectedId ? "is-selected" : ""} ${isPaperArchived(paper) ? "is-archived" : ""}" type="button" data-select-paper="${paper.id}">
      <strong>${escapeHtml(paper.title)}</strong>
      <span class="reader-item-meta">
        <span class="reader-state ${read ? "is-read" : "is-unread"}">
          <span class="state-dot"></span>${read ? "已读" : "未读"}
        </span>
        <span class="reader-recommend ${paper.recommended ? "is-starred" : "is-muted"}">
          <span class="state-star">${paper.recommended ? "★" : "☆"}</span>${paper.recommended ? "推荐" : "未推荐"}
        </span>
        ${renderArchiveBadge(paper)}
      </span>
    </button>
  `;
}

function renderCollection(collection) {
  const papers = state.papers.filter((paper) => paper.collectionId === collection.id);
  const unread = papers.reduce((sum, paper) => sum + paper.unreadUpdates, 0);
  return `
    <article class="collection-tile collection-${collection.color}">
      <div>
        <strong>${escapeHtml(collection.name)}</strong>
        <span>${escapeHtml(collection.owner)}</span>
      </div>
      <p>${escapeHtml(collection.description)}</p>
      <footer><span>${papers.length} papers</span><span>${unread} updates</span></footer>
    </article>
  `;
}

function renderBadge(label, tone) {
  return `<span class="badge ${tone}">${escapeHtml(label)}</span>`;
}

function renderReadBadge(paper) {
  return renderBadge(isPaperRead(paper) ? "已读" : "未读", isPaperRead(paper) ? "read" : "unread-state");
}

function renderArchiveBadge(paper) {
  return isPaperArchived(paper) ? renderBadge("已归档", "archive-state") : "";
}

function renderSourceLinks(paper) {
  const links = Object.entries(paper.links ?? {})
    .map(([key, value]) => [key, String(value ?? "").trim()])
    .filter(([, value]) => /^https?:\/\//.test(value));

  if (!links.length) return "";

  return `
    <div class="source-links" aria-label="原文链接">
      ${links.map(([key, value]) => `
        <a class="source-link" href="${escapeHtml(value)}" target="_blank" rel="noreferrer">
          ${escapeHtml(formatSourceLinkLabel(key))}
        </a>
      `).join("")}
    </div>
  `;
}

function formatSourceLinkLabel(key) {
  const labels = {
    arxiv: "arXiv",
    pdf: "PDF",
    doi: "DOI",
    code: "Code",
    project: "Project",
    model: "Model",
    data: "Data",
  };
  return labels[String(key).toLowerCase()] ?? String(key);
}

function renderReadButton(paper) {
  const read = isPaperRead(paper);
  return `
    <button class="reader-action-button ${read ? "is-read" : ""}" type="button" title="${read ? "标记未读" : "标为已读"}" aria-pressed="${read}" data-action="toggle-read" data-paper-id="${paper.id}">
      <span class="reader-action-icon">${read ? "✓" : "○"}</span>
      <span>已读</span>
    </button>
  `;
}

function renderRecommendButton(paper) {
  return `
    <button class="reader-action-button ${paper.recommended ? "is-starred" : ""}" type="button" title="${paper.recommended ? "取消推荐" : "推荐/星标"}" aria-pressed="${paper.recommended}" data-action="toggle-recommend" data-paper-id="${paper.id}">
      <span class="reader-action-icon">${paper.recommended ? "★" : "☆"}</span>
      <span>推荐</span>
    </button>
  `;
}

function renderEmpty(text) {
  return `<div class="empty-state">${escapeHtml(text)}</div>`;
}

function selected(a, b) {
  return a === b ? "selected" : "";
}

function getFilteredPapers(options = {}) {
  const query = state.query.trim().toLowerCase();
  const includeTopic = Boolean(options.includeTopic) && getVisibleTopicFilter() !== "all";
  const includeCollection = options.includeCollection !== false;
  const statusFilters = getActiveStatusFilters();
  const filtered = state.papers.filter((paper) => {
    const searchable = [
      paper.title,
      paper.paperTitle,
      paper.venue,
      paper.source,
      paper.authors.join(" "),
      paper.topics.join(" "),
      paper.abstract,
    ].join(" ").toLowerCase();
    if (query && !searchable.includes(query)) return false;
    if (includeTopic && state.topic !== "all" && !paper.topics.includes(state.topic)) return false;
    if (!matchesPaperStateFilters(paper, statusFilters)) return false;
    if (includeCollection && state.collection !== "all" && paper.collectionId !== state.collection) return false;
    return true;
  });
  return sortPapersForDisplay(filtered);
}

function toggleStatusFilter(filter) {
  if (filter === "all") {
    state.statusFilters = [];
    return;
  }

  if (!isValidPaperStateFilter(filter)) return;
  const filters = new Set(getActiveStatusFilters());
  if (filters.has(filter)) {
    filters.delete(filter);
  } else {
    filters.add(filter);
  }
  state.statusFilters = [...filters];
}

function getActiveStatusFilters(filters = state.statusFilters) {
  return Array.isArray(filters)
    ? filters.filter((filter) => isValidPaperStateFilter(filter) && filter !== "all")
    : [];
}

function isValidPaperStateFilter(filter) {
  return PAPER_STATE_FILTERS.some(([value]) => value === filter);
}

function matchesPaperStateFilters(paper, filters) {
  if (!filters.length) return true;
  return filters.some((filter) => matchesPaperStateFilter(paper, filter));
}

function matchesPaperStateFilter(paper, filter) {
  if (filter === "read") return isPaperRead(paper);
  if (filter === "unread") return !isPaperRead(paper);
  if (filter === "recommended") return paper.recommended;
  if (filter === "archived") return isPaperArchived(paper);
  return true;
}

function getSelectedPaper() {
  return state.papers.find((paper) => paper.id === state.selectedId) ?? sortPapersForDisplay(state.papers)[0];
}

function sortPapersForDisplay(papers, compare = () => 0) {
  return [...papers].sort((a, b) => compareArchiveState(a, b) || compare(a, b));
}

function compareArchiveState(a, b) {
  return Number(isPaperArchived(a)) - Number(isPaperArchived(b));
}

function getTopicItems(options = {}) {
  const minCount = Number(options.minCount ?? 1);
  const limit = Number(options.limit ?? Infinity);
  const counts = new Map();
  for (const paper of state.papers) {
    for (const topic of paper.topics ?? []) {
      const key = String(topic).trim();
      if (!key) continue;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }

  return [...counts.entries()]
    .filter(([, count]) => count >= minCount)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([topic, count]) => ({ topic, count }));
}

function getTopicCloudItems() {
  return getTopicItems({ minCount: MIN_TOPIC_FILTER_COUNT, limit: MAX_TOPIC_FILTERS });
}

function getVisibleTopicFilter(topics = getTopicCloudItems()) {
  if (state.topic === "all") return "all";
  return topics.some((item) => item.topic === state.topic) ? state.topic : "all";
}

function getStats() {
  const total = state.papers.length;
  const unread = state.papers.reduce((sum, paper) => sum + paper.unreadUpdates, 0);
  const read = state.papers.filter(isPaperRead).length;
  const complete = state.papers.filter(isPaperComplete).length;
  const recommended = state.papers.filter((paper) => paper.recommended).length;
  const unreadPapers = total - complete;
  const statusCounts = Object.keys(statusLabels).reduce((counts, status) => {
    counts[status] = state.papers.filter((paper) => paper.status === status).length;
    return counts;
  }, {});
  const tracking = statusCounts.tracking ?? 0;
  const archived = statusCounts.archived ?? 0;
  const avgScore = total
    ? Math.round(state.papers.reduce((sum, paper) => sum + paper.score, 0) / total)
    : 0;
  const readRate = total ? Math.round((read / total) * 100) : 0;
  const completionRate = total ? Math.round((complete / total) * 100) : 0;
  return {
    total,
    unread,
    read,
    complete,
    recommended,
    unreadPapers,
    tracking,
    archived,
    avgScore,
    readRate,
    completionRate,
    statusCounts,
  };
}

function getReadStateSegments() {
  const complete = state.papers.filter(isPaperComplete).length;
  const unread = Math.max(0, state.papers.length - complete);
  return [
    { label: "待读", count: unread, tone: "unread" },
    { label: "已读/归档", count: complete, tone: "read" },
  ];
}

function getAttentionPapers() {
  const priorityScore = { high: 3, medium: 2, low: 1 };
  return sortPapersForDisplay(
    state.papers.filter((paper) => !isPaperArchived(paper)),
    (a, b) =>
      b.unreadUpdates - a.unreadUpdates ||
      Number(b.recommended) - Number(a.recommended) ||
      Number(!isPaperRead(b)) - Number(!isPaperRead(a)) ||
      (priorityScore[b.priority] ?? 0) - (priorityScore[a.priority] ?? 0) ||
      b.score - a.score ||
      String(b.updatedAt).localeCompare(String(a.updatedAt)),
  );
}

function getRecentSignals(limit) {
  const signals = [];
  for (const paper of state.papers) {
    for (const item of paper.timeline ?? []) {
      const date = normalizeDate(item.date);
      if (!date) continue;
      signals.push({
        date,
        paperId: paper.id,
        title: paper.title,
        text: item.text || "更新论文记录。",
      });
    }
  }

  return signals
    .sort((a, b) => b.date.localeCompare(a.date) || a.title.localeCompare(b.title))
    .slice(0, limit);
}

function getReadingActivity(weeks) {
  const paperSetsByDate = getReadingActivityPaperSets();
  const totalDays = weeks * 7;
  const end = parseDateKey(getTodayKey());
  const endWeekStart = startOfWeek(end);
  const start = addDays(endWeekStart, -((weeks - 1) * 7));
  const maxCount = Math.max(1, ...[...paperSetsByDate.values()].map((papers) => papers.size));
  const days = [];

  for (let index = 0; index < totalDays; index += 1) {
    const date = addDays(start, index);
    const key = formatDateKey(date);
    const paperIds = [...(paperSetsByDate.get(key) ?? [])];
    const count = paperIds.length;
    days.push({
      date: key,
      count,
      paperIds,
      level: getActivityLevel(count, maxCount),
    });
  }

  const elapsedDays = days.filter((day) => day.date <= formatDateKey(end));
  return {
    weeks,
    days,
    monthLabels: getActivityMonthLabels(start, weeks),
    activeDays: days.filter((day) => day.count > 0).length,
    totalPapers: countUniqueActivityPapers(days),
    streak: getCurrentActivityStreak(elapsedDays),
  };
}

function getReadingActivityPaperSets() {
  const paperSetsByDate = new Map();
  for (const paper of state.papers) {
    addActivityPaper(paperSetsByDate, paper.readAt, paper.id);
  }
  return paperSetsByDate;
}

function countUniqueActivityPapers(days) {
  const paperIds = new Set();
  for (const day of days) {
    for (const paperId of day.paperIds ?? []) {
      paperIds.add(paperId);
    }
  }
  return paperIds.size;
}

function addActivityPaper(paperSetsByDate, date, paperId) {
  const key = normalizeDate(date);
  if (!key || !paperId) return;
  if (!paperSetsByDate.has(key)) paperSetsByDate.set(key, new Set());
  paperSetsByDate.get(key).add(paperId);
}

function getActivityLevel(count, maxCount) {
  if (count <= 0) return 0;
  const ratio = count / Math.max(1, maxCount);
  if (ratio <= 0.34) return 1;
  if (ratio <= 0.67) return 2;
  return 3;
}

function getCurrentActivityStreak(days) {
  let streak = 0;
  for (let index = days.length - 1; index >= 0; index -= 1) {
    if (days[index].count <= 0) break;
    streak += 1;
  }
  return streak;
}

function getActivityMonthLabels(start, weeks) {
  const labels = [];
  let lastLabel = "";
  for (let week = 0; week < weeks; week += 1) {
    const weekStart = addDays(start, week * 7);
    const label = `${weekStart.getMonth() + 1}月`;
    if (week === 0 || label !== lastLabel) {
      const column = week + 1;
      const previous = labels.at(-1);
      if (previous && column - previous.column < 3) {
        previous.label = label;
        previous.column = column;
      } else {
        labels.push({ label, column });
      }
      lastLabel = label;
    }
  }
  return labels;
}

function getTodayKey() {
  return formatDateKey(new Date());
}

function parseDateKey(value) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function startOfWeek(date) {
  const day = date.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  return addDays(date, mondayOffset);
}

function addDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function formatDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatActivityDateLabel(dateKey) {
  const date = parseDateKey(dateKey);
  const weekday = ACTIVITY_WEEKDAY_LABELS[(date.getDay() + 6) % 7];
  return `${date.getMonth() + 1}月${date.getDate()}日 ${weekday}`;
}

function formatWeekdayShort(dateKey) {
  const date = parseDateKey(dateKey);
  return ACTIVITY_WEEKDAY_LABELS[(date.getDay() + 6) % 7].replace("周", "");
}

function formatShare(value, total) {
  if (!total) return 0;
  return Math.max(0, Math.min(100, Math.round((value / total) * 100)));
}

function buildDefaultMarkdown(paper) {
  const title = paper.title ?? "Untitled Paper";
  const abstract = paper.abstract ?? "待补充摘要。";
  return `# ${title}

## 摘要

${abstract}

## 阅读计划

- 补充核心贡献
- 标注实验设置
- 记录可复现风险
`;
}
