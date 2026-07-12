(() => {
  "use strict";

  const DB_NAME = "linknote-db";
  const DB_VERSION = 2;
  const DB_STORE = "app";
  const DB_STATE_KEY = "main";
  const LEGACY_NOTES_KEY = "linknote.notes.v1";
  const FALLBACK_STATE_KEY = "linknote.state.v2";
  const CURRENT_KEY = "linknote.current.v1";
  const MAX_HISTORY = 30;
  const BACKUP_REMINDER_DAYS = 14;
  const SVG_NS = "http://www.w3.org/2000/svg";

  const $ = selector => document.querySelector(selector);
  const $$ = selector => [...document.querySelectorAll(selector)];

  const els = {
    sidebar: $("#sidebar"),
    overlay: $("#overlay"),
    menuBtn: $("#menuBtn"),
    newNoteBtn: $("#newNoteBtn"),
    emptyNewBtn: $("#emptyNewBtn"),
    noteList: $("#noteList"),
    searchInput: $("#searchInput"),
    titleInput: $("#titleInput"),
    contentInput: $("#contentInput"),
    editorView: $("#editorView"),
    emptyState: $("#emptyState"),
    editPane: $("#editPane"),
    previewPane: $("#previewPane"),
    saveStatus: $("#saveStatus"),
    tagList: $("#tagList"),
    backlinks: $("#backlinks"),
    pinBtn: $("#pinBtn"),
    deleteBtn: $("#deleteBtn"),
    historyBtn: $("#historyBtn"),
    graphBtn: $("#graphBtn"),
    mindMapBtn: $("#mindMapBtn"),
    flowBtn: $("#flowBtn"),
    treeBtn: $("#treeBtn"),
    strategyBtn: $("#strategyBtn"),
    trashBtn: $("#trashBtn"),
    settingsBtn: $("#settingsBtn"),
    graphModal: $("#graphModal"),
    mindMapModal: $("#mindMapModal"),
    flowModal: $("#flowModal"),
    treeModal: $("#treeModal"),
    strategyModal: $("#strategyModal"),
    trashModal: $("#trashModal"),
    historyModal: $("#historyModal"),
    settingsModal: $("#settingsModal"),
    graphContainer: $("#graphContainer"),
    mindMapContainer: $("#mindMapContainer"),
    flowContainer: $("#flowContainer"),
    treeContainer: $("#treeContainer"),
    strategyContainer: $("#strategyContainer"),
    graphExportBtn: $("#graphExportBtn"),
    mindExportBtn: $("#mindExportBtn"),
    flowExportBtn: $("#flowExportBtn"),
    treeExportBtn: $("#treeExportBtn"),
    treeCollapseBtn: $("#treeCollapseBtn"),
    treeExpandBtn: $("#treeExpandBtn"),
    mindZoomOutBtn: $("#mindZoomOutBtn"),
    mindZoomResetBtn: $("#mindZoomResetBtn"),
    mindZoomInBtn: $("#mindZoomInBtn"),
    strategyPerspectiveSelect: $("#strategyPerspectiveSelect"),
    strategyObjectiveInput: $("#strategyObjectiveInput"),
    strategyKpiInput: $("#strategyKpiInput"),
    strategyAddBtn: $("#strategyAddBtn"),
    strategyTemplateBtn: $("#strategyTemplateBtn"),
    strategySelectedPanel: $("#strategySelectedPanel"),
    strategySelectedTitle: $("#strategySelectedTitle"),
    strategyEditPerspectiveSelect: $("#strategyEditPerspectiveSelect"),
    strategyEditObjectiveInput: $("#strategyEditObjectiveInput"),
    strategyEditKpiInput: $("#strategyEditKpiInput"),
    strategySaveBtn: $("#strategySaveBtn"),
    strategyDeleteBtn: $("#strategyDeleteBtn"),
    strategySourceSelect: $("#strategySourceSelect"),
    strategyRelationInput: $("#strategyRelationInput"),
    strategyTargetSelect: $("#strategyTargetSelect"),
    strategyConnectBtn: $("#strategyConnectBtn"),
    strategyConnectionList: $("#strategyConnectionList"),
    strategyRenameBtn: $("#strategyRenameBtn"),
    strategyClearBtn: $("#strategyClearBtn"),
    strategyExportBtn: $("#strategyExportBtn"),
    strategyHint: $("#strategyHint"),
    trashList: $("#trashList"),
    trashCount: $("#trashCount"),
    emptyTrashBtn: $("#emptyTrashBtn"),
    historyList: $("#historyList"),
    storageStatus: $("#storageStatus"),
    lastBackupStatus: $("#lastBackupStatus"),
    persistentBtn: $("#persistentBtn"),
    exportBtn: $("#exportBtn"),
    warningExportBtn: $("#warningExportBtn"),
    exportMdBtn: $("#exportMdBtn"),
    importInput: $("#importInput"),
    installHelpBtn: $("#installHelpBtn"),
    installHelp: $("#installHelp"),
    backupWarning: $("#backupWarning"),
    toast: $("#toast"),
    toastMessage: $("#toastMessage"),
    toastAction: $("#toastAction")
  };

  let state = null;
  let currentId = null;
  let saveTimer = null;
  let toastTimer = null;
  let saveChain = Promise.resolve();
  let mindZoom = 1;
  let treeCollapsedIds = new Set();
  let strategySelectedId = null;

  function uid() {
    return crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  function deepClone(value) {
    return typeof structuredClone === "function"
      ? structuredClone(value)
      : JSON.parse(JSON.stringify(value));
  }

  function defaultPerspectives() {
    return [
      { id: "financial", label: "成果／財務", description: "最後希望達成的成果" },
      { id: "customer", label: "學習者／利害關係人", description: "使用者應感受到的價值" },
      { id: "process", label: "內部流程", description: "必須做好的關鍵工作" },
      { id: "learning", label: "學習與成長", description: "支撐策略的能力與資源" }
    ];
  }

  function defaultStrategyMap() {
    return { perspectives: defaultPerspectives(), nodes: [], edges: [] };
  }

  function makeWelcomeNote() {
    const now = new Date().toISOString();
    return {
      id: uid(),
      title: "歡迎使用 LinkNote",
      content: `# 歡迎使用 LinkNote

這是一個支援 Markdown、雙向連結與多種視覺化的離線筆記 App。

## 快速開始

- 使用 **Markdown** 撰寫內容
- 輸入 [[我的第一篇筆記]] 建立雙向連結
- 使用 #開始 與 #教學 建立標籤
- 標題與縮排清單可以自動轉成心智圖

## 心智圖範例

- 研究主題
  - 文獻回顧
  - 系統設計
  - 使用者評估

## 筆記內知識圖譜

使用 knowledge 程式區塊輸入「主詞 | 關係 | 受詞」：

\`\`\`knowledge
生成式 AI | 提供 | 即時回饋
即時回饋 | 提升 | 學習成效
\`\`\`

按上方「◎」即可建立目前筆記的知識圖譜。

## 流程圖

\`\`\`flow
開始((開始)) -> 蒐集資料[蒐集資料]
蒐集資料 -> 判斷{資料完整？}
判斷 ->|是| 分析[分析資料]
判斷 ->|否| 蒐集資料
分析 -> 完成((完成))
\`\`\`

## 樹狀圖

\`\`\`tree
多語言學習
  中文
    發音
    文法
  韓語
    字母
    敬語
\`\`\`

## 策略地圖

開啟上方的「⇧」後，可在四個構面新增目標並建立因果箭頭。`,
      pinned: true,
      createdAt: now,
      updatedAt: now,
      strategyMap: defaultStrategyMap()
    };
  }

  function defaultState() {
    return {
      app: "LinkNote",
      version: 2,
      initialized: true,
      notes: [makeWelcomeNote()],
      trash: [],
      snapshots: {},
      settings: {
        lastBackupAt: null,
        persistentGranted: false,
        migratedFromV1: false
      },
      updatedAt: new Date().toISOString()
    };
  }

  function normalizeStrategyMap(raw) {
    const fallback = defaultStrategyMap();
    if (!raw || typeof raw !== "object") return fallback;
    const perspectives = Array.isArray(raw.perspectives) && raw.perspectives.length
      ? raw.perspectives.slice(0, 8).map((p, index) => ({
          id: String(p.id || `perspective-${index}`),
          label: String(p.label || `構面 ${index + 1}`).slice(0, 40),
          description: String(p.description || fallback.perspectives[index]?.description || "策略構面").slice(0, 80)
        }))
      : fallback.perspectives;
    const validPerspectiveIds = new Set(perspectives.map(p => p.id));
    const nodes = Array.isArray(raw.nodes)
      ? raw.nodes.map(node => ({
          id: String(node.id || uid()),
          perspective: validPerspectiveIds.has(String(node.perspective))
            ? String(node.perspective)
            : perspectives[perspectives.length - 1].id,
          text: String(node.text || "未命名目標").slice(0, 160),
          kpi: String(node.kpi || "").slice(0, 160),
          createdAt: node.createdAt || new Date().toISOString()
        }))
      : [];
    const nodeIds = new Set(nodes.map(node => node.id));
    const edges = Array.isArray(raw.edges)
      ? raw.edges
          .map(edge => ({
            id: String(edge.id || uid()),
            source: String(edge.source || ""),
            target: String(edge.target || ""),
            label: String(edge.label || edge.relation || "促進").slice(0, 40)
          }))
          .filter(edge => nodeIds.has(edge.source) && nodeIds.has(edge.target) && edge.source !== edge.target)
      : [];
    return { perspectives, nodes, edges };
  }

  function normalizeNote(raw) {
    const now = new Date().toISOString();
    return {
      id: String(raw?.id || uid()),
      title: String(raw?.title || "未命名筆記").slice(0, 180),
      content: String(raw?.content || ""),
      pinned: Boolean(raw?.pinned),
      createdAt: raw?.createdAt || now,
      updatedAt: raw?.updatedAt || now,
      strategyMap: normalizeStrategyMap(raw?.strategyMap)
    };
  }

  function normalizeSnapshot(raw) {
    return {
      id: String(raw?.id || uid()),
      title: String(raw?.title || "未命名筆記").slice(0, 180),
      content: String(raw?.content || ""),
      strategyMap: normalizeStrategyMap(raw?.strategyMap),
      timestamp: raw?.timestamp || new Date().toISOString(),
      reason: String(raw?.reason || "版本紀錄")
    };
  }

  function sanitizeState(raw) {
    const base = raw && typeof raw === "object" ? raw : defaultState();
    const notes = Array.isArray(base.notes) ? base.notes.map(normalizeNote) : [];
    const trash = Array.isArray(base.trash)
      ? base.trash.map(item => ({ ...normalizeNote(item), deletedAt: item.deletedAt || new Date().toISOString() }))
      : [];
    const snapshots = {};
    if (base.snapshots && typeof base.snapshots === "object") {
      for (const [noteId, versions] of Object.entries(base.snapshots)) {
        if (Array.isArray(versions)) snapshots[noteId] = versions.map(normalizeSnapshot).slice(0, MAX_HISTORY);
      }
    }
    return {
      app: "LinkNote",
      version: 2,
      initialized: true,
      notes,
      trash,
      snapshots,
      settings: {
        lastBackupAt: base.settings?.lastBackupAt || null,
        persistentGranted: Boolean(base.settings?.persistentGranted),
        migratedFromV1: Boolean(base.settings?.migratedFromV1)
      },
      updatedAt: base.updatedAt || new Date().toISOString()
    };
  }

  const storage = {
    dbPromise: null,
    backend: "unknown",
    open() {
      if (!this.dbPromise) {
        this.dbPromise = new Promise((resolve, reject) => {
          if (!("indexedDB" in window)) {
            reject(new Error("此瀏覽器不支援 IndexedDB"));
            return;
          }
          const request = indexedDB.open(DB_NAME, DB_VERSION);
          request.onupgradeneeded = () => {
            const db = request.result;
            if (!db.objectStoreNames.contains(DB_STORE)) db.createObjectStore(DB_STORE, { keyPath: "key" });
          };
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => reject(request.error || new Error("無法開啟 IndexedDB"));
        });
      }
      return this.dbPromise;
    },
    async readIndexedDb() {
      const db = await this.open();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(DB_STORE, "readonly");
        const req = tx.objectStore(DB_STORE).get(DB_STATE_KEY);
        req.onsuccess = () => resolve(req.result?.value || null);
        req.onerror = () => reject(req.error);
      });
    },
    async writeIndexedDb(value) {
      const db = await this.open();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(DB_STORE, "readwrite");
        tx.objectStore(DB_STORE).put({ key: DB_STATE_KEY, value });
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error || new Error("IndexedDB 寫入失敗"));
      });
    },
    readFallback() {
      try {
        const raw = localStorage.getItem(FALLBACK_STATE_KEY);
        return raw ? JSON.parse(raw) : null;
      } catch (error) {
        console.warn("讀取備援資料失敗", error);
        return null;
      }
    },
    readLegacy() {
      try {
        const raw = localStorage.getItem(LEGACY_NOTES_KEY);
        const parsed = raw ? JSON.parse(raw) : null;
        return Array.isArray(parsed) ? parsed : null;
      } catch (error) {
        console.warn("讀取舊版筆記失敗", error);
        return null;
      }
    },
    writeFallback(value) {
      try {
        const serialized = JSON.stringify(value);
        if (serialized.length < 4_500_000) localStorage.setItem(FALLBACK_STATE_KEY, serialized);
      } catch (error) {
        console.warn("localStorage 備援寫入失敗", error);
      }
    },
    async load() {
      try {
        const indexed = await this.readIndexedDb();
        if (indexed) {
          this.backend = "indexeddb";
          return sanitizeState(indexed);
        }
      } catch (error) {
        console.warn("IndexedDB 讀取失敗，改用備援資料", error);
      }

      const fallback = this.readFallback();
      if (fallback) {
        this.backend = "fallback";
        return sanitizeState(fallback);
      }

      const legacy = this.readLegacy();
      if (legacy) {
        const migrated = sanitizeState({
          ...defaultState(),
          notes: legacy,
          settings: { migratedFromV1: true }
        });
        await this.save(migrated);
        return migrated;
      }

      const fresh = defaultState();
      await this.save(fresh);
      return fresh;
    },
    async save(value) {
      const snapshot = deepClone(value);
      let idbSaved = false;
      try {
        await this.writeIndexedDb(snapshot);
        idbSaved = true;
        this.backend = "indexeddb";
      } catch (error) {
        console.warn("IndexedDB 儲存失敗", error);
      }
      this.writeFallback(snapshot);
      if (!idbSaved) this.backend = "fallback";
      if (!idbSaved && !localStorage.getItem(FALLBACK_STATE_KEY)) throw new Error("無法儲存資料");
    }
  };

  function queuePersist() {
    state.updatedAt = new Date().toISOString();
    const snapshot = deepClone(state);
    saveChain = saveChain
      .catch(() => undefined)
      .then(() => storage.save(snapshot))
      .catch(error => {
        console.error(error);
        els.saveStatus.textContent = "儲存失敗";
        showToast("儲存失敗，請立即匯出備份");
      });
    renderBackupWarning();
    return saveChain;
  }

  function currentNote() {
    return state.notes.find(note => note.id === currentId) || null;
  }

  function findByTitle(title) {
    const normalized = String(title || "").trim().toLowerCase();
    return state.notes.find(note => note.title.trim().toLowerCase() === normalized) || null;
  }

  function formatDate(iso, includeYear = false) {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return "未知時間";
    return new Intl.DateTimeFormat("zh-TW", {
      ...(includeYear ? { year: "numeric" } : {}),
      month: "numeric",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    }).format(date);
  }

  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function escapeXml(value) {
    return escapeHtml(value);
  }

  function stripMarkdown(text) {
    return String(text || "")
      .replace(/```[\s\S]*?```/g, " ")
      .replace(/`([^`]+)`/g, "$1")
      .replace(/\[\[([^\]]+)\]\]/g, "$1")
      .replace(/[#>*_\-\[\]()]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function extractWikiLinks(text) {
    const found = [];
    const regex = /\[\[([^\]|#]+)(?:#[^\]|]+)?(?:\|([^\]]+))?\]\]/g;
    let match;
    while ((match = regex.exec(String(text || ""))) !== null) {
      const title = match[1].trim();
      if (title && !found.some(item => item.title.toLowerCase() === title.toLowerCase())) {
        found.push({ title, label: (match[2] || title).trim() });
      }
    }
    return found;
  }

  function extractTags(text) {
    const found = [];
    const regex = /(^|\s)#([\p{L}\p{N}_\-/]+)/gu;
    let match;
    while ((match = regex.exec(String(text || ""))) !== null) {
      const tag = match[2];
      if (!found.some(value => value.toLowerCase() === tag.toLowerCase())) found.push(tag);
    }
    return found;
  }

  function inlineMarkdown(text) {
    const codeParts = [];
    let result = String(text || "").replace(/`([^`]+)`/g, (_, code) => {
      const index = codeParts.push(`<code>${escapeHtml(code)}</code>`) - 1;
      return `@@CODE${index}@@`;
    });
    result = escapeHtml(result);
    result = result.replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (_, target, label) => {
      const cleanTarget = target.trim();
      const cleanLabel = (label || target).trim();
      return `<a class="wikilink" data-target="${encodeURIComponent(cleanTarget)}">${escapeHtml(cleanLabel)}</a>`;
    });
    result = result.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
    result = result.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
    result = result.replace(/__([^_]+)__/g, "<strong>$1</strong>");
    result = result.replace(/(^|[^*])\*([^*]+)\*/g, "$1<em>$2</em>");
    result = result.replace(/(^|\s)#([\p{L}\p{N}_\-/]+)/gu, '$1<span class="tag">#$2</span>');
    result = result.replace(/@@CODE(\d+)@@/g, (_, index) => codeParts[Number(index)] || "");
    return result;
  }

  function markdownToHtml(markdown) {
    const lines = String(markdown || "").replace(/\r\n?/g, "\n").split("\n");
    const out = [];
    let inCode = false;
    let code = [];
    let listType = null;

    const closeList = () => {
      if (listType) {
        out.push(`</${listType}>`);
        listType = null;
      }
    };

    for (const line of lines) {
      if (line.trim().startsWith("```")) {
        closeList();
        if (!inCode) {
          inCode = true;
          code = [];
        } else {
          out.push(`<pre><code>${escapeHtml(code.join("\n"))}</code></pre>`);
          inCode = false;
        }
        continue;
      }
      if (inCode) {
        code.push(line);
        continue;
      }

      const heading = /^(#{1,6})\s+(.*)$/.exec(line);
      if (heading) {
        closeList();
        const level = heading[1].length;
        out.push(`<h${level}>${inlineMarkdown(heading[2])}</h${level}>`);
        continue;
      }

      const quote = /^>\s?(.*)$/.exec(line);
      if (quote) {
        closeList();
        out.push(`<blockquote>${inlineMarkdown(quote[1])}</blockquote>`);
        continue;
      }

      const unordered = /^\s*[-*+]\s+(.*)$/.exec(line);
      if (unordered) {
        if (listType !== "ul") {
          closeList();
          listType = "ul";
          out.push("<ul>");
        }
        out.push(`<li>${inlineMarkdown(unordered[1])}</li>`);
        continue;
      }

      const ordered = /^\s*\d+\.\s+(.*)$/.exec(line);
      if (ordered) {
        if (listType !== "ol") {
          closeList();
          listType = "ol";
          out.push("<ol>");
        }
        out.push(`<li>${inlineMarkdown(ordered[1])}</li>`);
        continue;
      }

      closeList();
      out.push(line.trim() ? `<p>${inlineMarkdown(line)}</p>` : "<br>");
    }

    closeList();
    if (inCode) out.push(`<pre><code>${escapeHtml(code.join("\n"))}</code></pre>`);
    return out.join("\n");
  }

  function captureSnapshot(note, reason = "自動儲存", force = false) {
    if (!note) return;
    const versions = state.snapshots[note.id] || [];
    const snapshot = {
      id: uid(),
      title: note.title,
      content: note.content,
      strategyMap: deepClone(note.strategyMap || defaultStrategyMap()),
      timestamp: new Date().toISOString(),
      reason
    };
    const latest = versions[0];
    if (latest && latest.title === snapshot.title && latest.content === snapshot.content && JSON.stringify(latest.strategyMap) === JSON.stringify(snapshot.strategyMap)) return;
    const withinWindow = latest && (Date.now() - new Date(latest.timestamp).getTime()) < 120_000;
    if (!force && withinWindow && latest.reason === reason) versions[0] = snapshot;
    else versions.unshift(snapshot);
    state.snapshots[note.id] = versions.slice(0, MAX_HISTORY);
  }

  async function saveEditorNow(reason = "自動儲存") {
    clearTimeout(saveTimer);
    const note = currentNote();
    if (!note) return;
    const nextTitle = els.titleInput.value.trim() || "未命名筆記";
    const nextContent = els.contentInput.value;
    if (note.title === nextTitle && note.content === nextContent) {
      els.saveStatus.textContent = "已儲存";
      return;
    }
    captureSnapshot(note, reason, false);
    note.title = nextTitle;
    note.content = nextContent;
    note.updatedAt = new Date().toISOString();
    els.saveStatus.textContent = "儲存中…";
    await queuePersist();
    els.saveStatus.textContent = "已儲存";
    renderNoteList();
    renderMeta(note);
    if (!els.previewPane.classList.contains("hidden")) renderPreview(note);
  }

  function scheduleSave() {
    els.saveStatus.textContent = "儲存中…";
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => saveEditorNow(), 350);
  }

  async function createNote(title = "未命名筆記", content = "") {
    await saveEditorNow();
    const now = new Date().toISOString();
    const note = {
      id: uid(),
      title,
      content,
      pinned: false,
      createdAt: now,
      updatedAt: now,
      strategyMap: defaultStrategyMap()
    };
    state.notes.unshift(note);
    currentId = note.id;
    localStorage.setItem(CURRENT_KEY, currentId);
    await queuePersist();
    renderAll();
    closeSidebar();
    setTimeout(() => {
      els.titleInput.focus();
      els.titleInput.select();
    }, 0);
    return note;
  }

  async function deleteCurrent() {
    const note = currentNote();
    if (!note) return;
    if (!confirm(`將「${note.title}」移至垃圾桶？之後仍可復原。`)) return;
    await saveEditorNow("刪除前版本");
    captureSnapshot(note, "刪除前版本", true);
    state.notes = state.notes.filter(item => item.id !== note.id);
    state.trash.unshift({ ...deepClone(note), deletedAt: new Date().toISOString() });
    currentId = state.notes[0]?.id || null;
    if (currentId) localStorage.setItem(CURRENT_KEY, currentId);
    else localStorage.removeItem(CURRENT_KEY);
    await queuePersist();
    renderAll();
    showToast("筆記已移至垃圾桶", "復原", () => restoreFromTrash(note.id));
  }

  async function restoreFromTrash(noteId) {
    const index = state.trash.findIndex(note => note.id === noteId);
    if (index < 0) return;
    const [item] = state.trash.splice(index, 1);
    delete item.deletedAt;
    if (state.notes.some(note => note.id === item.id)) item.id = uid();
    if (findByTitle(item.title)) item.title = `${item.title}（復原）`;
    item.updatedAt = new Date().toISOString();
    state.notes.unshift(normalizeNote(item));
    currentId = item.id;
    localStorage.setItem(CURRENT_KEY, currentId);
    await queuePersist();
    renderAll();
    renderTrash();
    showToast("筆記已復原");
  }

  async function permanentlyDelete(noteId) {
    const item = state.trash.find(note => note.id === noteId);
    if (!item || !confirm(`永久刪除「${item.title}」？此動作無法復原。`)) return;
    state.trash = state.trash.filter(note => note.id !== noteId);
    delete state.snapshots[noteId];
    await queuePersist();
    renderTrash();
    showToast("已永久刪除");
  }

  async function emptyTrash() {
    if (!state.trash.length) return;
    if (!confirm(`永久刪除垃圾桶中的 ${state.trash.length} 篇筆記？`)) return;
    for (const note of state.trash) delete state.snapshots[note.id];
    state.trash = [];
    await queuePersist();
    renderTrash();
    showToast("垃圾桶已清空");
  }

  async function openNote(id) {
    if (id === currentId) {
      closeSidebar();
      return;
    }
    await saveEditorNow();
    const note = state.notes.find(item => item.id === id);
    if (!note) return;
    currentId = id;
    localStorage.setItem(CURRENT_KEY, id);
    renderAll();
    closeSidebar();
    document.querySelector(".workspace")?.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function openOrCreateLinked(title) {
    const existing = findByTitle(title);
    if (existing) await openNote(existing.id);
    else {
      await createNote(title, `# ${title}\n\n`);
      showToast(`已建立「${title}」`);
    }
  }

  function renderAll() {
    renderNoteList();
    renderEditor();
    renderBackupWarning();
  }

  function renderNoteList() {
    const query = els.searchInput.value.trim().toLowerCase();
    const sorted = [...state.notes].sort((a, b) => {
      if (a.pinned !== b.pinned) return Number(b.pinned) - Number(a.pinned);
      return new Date(b.updatedAt) - new Date(a.updatedAt);
    });
    const tagQuery = query.replace(/^#/, "");
    const filtered = sorted.filter(note =>
      !query ||
      note.title.toLowerCase().includes(query) ||
      note.content.toLowerCase().includes(query) ||
      extractTags(note.content).some(tag => tag.toLowerCase().includes(tagQuery))
    );

    els.noteList.innerHTML = "";
    if (!filtered.length) {
      els.noteList.innerHTML = `<p class="muted" style="padding:12px">${state.notes.length ? "找不到符合的筆記" : "目前沒有筆記"}</p>`;
      return;
    }

    for (const note of filtered) {
      const button = document.createElement("button");
      button.className = `note-item ${note.id === currentId ? "active" : ""}`;
      button.innerHTML = `
        <div class="note-item-title">
          <span>${escapeHtml(note.title)}</span>
          ${note.pinned ? '<span class="pin-mark">★</span>' : ""}
        </div>
        <div class="note-item-snippet">${escapeHtml(stripMarkdown(note.content) || "沒有內容")}</div>
        <div class="note-item-date">${formatDate(note.updatedAt)}</div>`;
      button.addEventListener("click", () => openNote(note.id));
      els.noteList.appendChild(button);
    }
  }

  function renderEditor() {
    const note = currentNote();
    const hasNote = Boolean(note);
    els.editorView.classList.toggle("hidden", !hasNote);
    els.emptyState.classList.toggle("hidden", hasNote);
    if (!note) return;

    if (document.activeElement !== els.titleInput) els.titleInput.value = note.title;
    if (document.activeElement !== els.contentInput) els.contentInput.value = note.content;
    els.pinBtn.textContent = note.pinned ? "★" : "☆";
    els.pinBtn.setAttribute("aria-label", note.pinned ? "取消置頂" : "置頂");
    renderPreview(note);
    renderMeta(note);
  }

  function renderPreview(note) {
    els.previewPane.innerHTML = markdownToHtml(note.content);
    $$("#previewPane .wikilink").forEach(link => {
      link.addEventListener("click", () => openOrCreateLinked(decodeURIComponent(link.dataset.target)));
    });
  }

  function renderMeta(note) {
    const tags = extractTags(note.content);
    els.tagList.innerHTML = "";
    if (!tags.length) els.tagList.innerHTML = '<span class="muted">尚無標籤</span>';
    for (const tag of tags) {
      const button = document.createElement("button");
      button.className = "chip";
      button.textContent = `#${tag}`;
      button.addEventListener("click", () => {
        els.searchInput.value = `#${tag}`;
        renderNoteList();
        openSidebar();
      });
      els.tagList.appendChild(button);
    }

    const incoming = state.notes.filter(other =>
      other.id !== note.id &&
      extractWikiLinks(other.content).some(link => link.title.toLowerCase() === note.title.toLowerCase())
    );
    els.backlinks.innerHTML = "";
    if (!incoming.length) els.backlinks.innerHTML = '<span class="muted">目前沒有其他筆記連到這裡</span>';
    for (const source of incoming) {
      const button = document.createElement("button");
      button.className = "backlink-btn";
      button.textContent = `↗ ${source.title}`;
      button.addEventListener("click", () => openNote(source.id));
      els.backlinks.appendChild(button);
    }
  }

  async function setMode(mode) {
    if (mode === "preview") await saveEditorNow();
    $$(".mode-tab").forEach(tab => tab.classList.toggle("active", tab.dataset.mode === mode));
    els.editPane.classList.toggle("hidden", mode !== "edit");
    els.previewPane.classList.toggle("hidden", mode !== "preview");
    if (mode === "preview" && currentNote()) renderPreview(currentNote());
  }

  function openSidebar() {
    els.sidebar.classList.add("open");
    els.overlay.classList.remove("hidden");
  }

  function closeSidebar() {
    els.sidebar.classList.remove("open");
    els.overlay.classList.add("hidden");
  }

  function openModal(modal) {
    closeSidebar();
    modal.classList.remove("hidden");
  }

  function closeModals() {
    $$(".modal").forEach(modal => modal.classList.add("hidden"));
    strategySelectedId = null;
  }

  function showToast(message, actionLabel = null, action = null) {
    clearTimeout(toastTimer);
    els.toastMessage.textContent = message;
    els.toast.classList.remove("hidden");
    if (actionLabel && action) {
      els.toastAction.textContent = actionLabel;
      els.toastAction.classList.remove("hidden");
      els.toastAction.onclick = async () => {
        els.toast.classList.add("hidden");
        await action();
      };
      toastTimer = setTimeout(() => els.toast.classList.add("hidden"), 8000);
    } else {
      els.toastAction.classList.add("hidden");
      els.toastAction.onclick = null;
      toastTimer = setTimeout(() => els.toast.classList.add("hidden"), 2200);
    }
  }

  function downloadFile(filename, content, type) {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 500);
  }

  function safeFilename(name) {
    return (name || "note").replace(/[\\/:*?"<>|]/g, "_").slice(0, 80);
  }

  function exportSvgFrom(container, filename) {
    const svg = container.querySelector("svg");
    if (!svg) {
      showToast("目前沒有可匯出的圖");
      return;
    }
    const clone = svg.cloneNode(true);
    clone.setAttribute("xmlns", SVG_NS);
    const style = document.createElementNS(SVG_NS, "style");
    style.textContent = `
      text { font-family: -apple-system, BlinkMacSystemFont, "Noto Sans TC", sans-serif; }
      .graph-edge,.mind-edge,.tree-edge { stroke:#a0a0a0; }
      .graph-node circle,.knowledge-node rect,.mind-node rect,.tree-node rect,.flow-node rect,.flow-node polygon,.strategy-node rect { fill:#ffffff; stroke:#6f5cc2; }
      .graph-node text,.knowledge-node text,.mind-node text,.tree-node text,.flow-node text,.strategy-node text { fill:#202020; }
      .mind-node.root rect,.tree-node.root rect { fill:#6f5cc2; }
      .mind-node.root text,.tree-node.root text { fill:#ffffff; }
      .flow-edge,.strategy-edge { fill:none; stroke:#6f5cc2; stroke-width:2; }
      .flow-edge-label,.strategy-edge-label { fill:#666666; stroke:#ffffff; }
      .strategy-lane { fill:#fafafa; stroke:#d8d8d8; }
      .strategy-lane-description,.strategy-empty-lane { fill:#777777; }
    `;
    clone.insertBefore(style, clone.firstChild);
    const xml = new XMLSerializer().serializeToString(clone);
    downloadFile(filename, `<?xml version="1.0" encoding="UTF-8"?>\n${xml}`, "image/svg+xml;charset=utf-8");
  }

  function normalizeKnowledgeLabel(value) {
    return stripMarkdown(String(value || ""))
      .replace(/^[\s\-–—:：>]+|[\s\-–—:：>]+$/g, "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 90);
  }

  function parseKnowledgeTriple(line) {
    const clean = String(line || "").trim().replace(/^[-*+]\s+/, "");
    if (!clean) return null;

    const pipeParts = clean.split("|").map(part => normalizeKnowledgeLabel(part)).filter(Boolean);
    if (pipeParts.length >= 3) {
      return { source: pipeParts[0], relation: pipeParts[1], target: pipeParts.slice(2).join("／") };
    }

    const labelledArrow = /^(.+?)\s*--(.+?)-->\s*(.+)$/.exec(clean);
    if (labelledArrow) {
      return {
        source: normalizeKnowledgeLabel(labelledArrow[1]),
        relation: normalizeKnowledgeLabel(labelledArrow[2]) || "關聯",
        target: normalizeKnowledgeLabel(labelledArrow[3])
      };
    }

    const arrowParts = clean.split(/\s*(?:->|→)\s*/).map(part => normalizeKnowledgeLabel(part)).filter(Boolean);
    if (arrowParts.length >= 3) {
      return { source: arrowParts[0], relation: arrowParts[1], target: arrowParts.slice(2).join("／") };
    }
    if (arrowParts.length === 2) {
      return { source: arrowParts[0], relation: "關聯", target: arrowParts[1] };
    }
    return null;
  }

  function parseKnowledgeGraph(note) {
    const nodes = [];
    const nodeByKey = new Map();
    const edges = [];
    const edgeKeys = new Set();

    const addNode = (label, type = "concept") => {
      const clean = normalizeKnowledgeLabel(label);
      if (!clean) return null;
      const key = clean.toLowerCase();
      if (nodeByKey.has(key)) {
        const existing = nodeByKey.get(key);
        if (existing.type === "concept" && type !== "concept") existing.type = type;
        return existing;
      }
      const node = { id: `kg-${nodes.length + 1}`, label: clean, type };
      nodeByKey.set(key, node);
      nodes.push(node);
      return node;
    };

    const addEdge = (sourceNode, targetNode, relation = "關聯") => {
      if (!sourceNode || !targetNode || sourceNode.id === targetNode.id) return;
      const cleanRelation = normalizeKnowledgeLabel(relation) || "關聯";
      const key = `${sourceNode.id}|${cleanRelation.toLowerCase()}|${targetNode.id}`;
      if (edgeKeys.has(key)) return;
      edgeKeys.add(key);
      edges.push({ id: `ke-${edges.length + 1}`, source: sourceNode.id, target: targetNode.id, relation: cleanRelation });
    };

    const root = addNode(note.title || "未命名筆記", "root");
    const headingStack = [{ level: 0, node: root }];
    let currentHeading = root;
    let listStack = [];
    let inKnowledgeBlock = false;
    let inOtherCodeBlock = false;
    const lines = String(note.content || "").replace(/\r\n?/g, "\n").split("\n");

    for (const rawLine of lines) {
      const trimmed = rawLine.trim();
      const fence = /^```\s*([\w-]*)/i.exec(trimmed);
      if (fence) {
        const language = (fence[1] || "").toLowerCase();
        if (inKnowledgeBlock) {
          inKnowledgeBlock = false;
        } else if (inOtherCodeBlock) {
          inOtherCodeBlock = false;
        } else if (["knowledge", "kg", "knowledgegraph", "知識圖譜"].includes(language)) {
          inKnowledgeBlock = true;
        } else {
          inOtherCodeBlock = true;
        }
        continue;
      }

      if (inOtherCodeBlock) continue;
      if (inKnowledgeBlock) {
        const triple = parseKnowledgeTriple(rawLine);
        if (triple?.source && triple?.target) {
          addEdge(addNode(triple.source), addNode(triple.target), triple.relation);
        }
        continue;
      }

      const line = rawLine.replace(/\t/g, "  ");
      const heading = /^(#{1,6})\s+(.*)$/.exec(trimmed);
      if (heading) {
        const level = heading[1].length;
        while (headingStack.length && headingStack[headingStack.length - 1].level >= level) headingStack.pop();
        const parent = headingStack[headingStack.length - 1]?.node || root;
        const node = addNode(heading[2], "heading");
        addEdge(parent, node, level === 1 ? "主題" : "包含");
        headingStack.push({ level, node });
        currentHeading = node;
        listStack = [];
        continue;
      }

      const listItem = /^(\s*)[-*+]\s+(.*)$/.exec(line);
      const orderedItem = /^(\s*)\d+\.\s+(.*)$/.exec(line);
      const item = listItem || orderedItem;
      if (item) {
        const indentLevel = Math.floor(item[1].length / 2);
        while (listStack.length > indentLevel) listStack.pop();
        const parent = indentLevel > 0 ? (listStack[indentLevel - 1] || currentHeading) : currentHeading;
        const node = addNode(item[2], "item");
        addEdge(parent, node, "包含");
        listStack[indentLevel] = node;
        listStack = listStack.slice(0, indentLevel + 1);
        continue;
      }

      for (const link of extractWikiLinks(rawLine)) {
        const node = addNode(link.label || link.title, "concept");
        addEdge(currentHeading || root, node, "相關概念");
      }
    }

    const connected = new Set(edges.flatMap(edge => [edge.source, edge.target]));
    for (const node of nodes) {
      if (node.id !== root.id && !connected.has(node.id)) addEdge(root, node, "相關");
    }

    if (nodes.length === 1) {
      const hint = addNode("加入 Markdown 標題、條列或 knowledge 三元組", "hint");
      addEdge(root, hint, "提示");
    }

    return { nodes, edges, rootId: root.id };
  }

  function layoutKnowledgeGraph(graph) {
    const byId = new Map(graph.nodes.map(node => [node.id, node]));
    const adjacency = new Map(graph.nodes.map(node => [node.id, []]));
    for (const edge of graph.edges) {
      adjacency.get(edge.source)?.push(edge.target);
      adjacency.get(edge.target)?.push(edge.source);
    }

    const levels = new Map([[graph.rootId, 0]]);
    const queue = [graph.rootId];
    while (queue.length) {
      const id = queue.shift();
      const nextLevel = levels.get(id) + 1;
      for (const next of adjacency.get(id) || []) {
        if (!levels.has(next)) {
          levels.set(next, nextLevel);
          queue.push(next);
        }
      }
    }

    for (const node of graph.nodes) if (!levels.has(node.id)) levels.set(node.id, 1);
    const maxLevel = Math.max(1, ...levels.values());
    const size = Math.max(820, 420 + maxLevel * 300, graph.nodes.length * 48);
    const width = size;
    const height = Math.max(590, size * 0.78);
    const centerX = width / 2;
    const centerY = height / 2;
    const positions = new Map();
    positions.set(graph.rootId, { x: centerX, y: centerY });

    for (let level = 1; level <= maxLevel; level++) {
      const levelNodes = graph.nodes.filter(node => levels.get(node.id) === level);
      const radiusX = Math.min(width * 0.42, 150 + level * 150);
      const radiusY = Math.min(height * 0.40, 105 + level * 105);
      levelNodes.forEach((node, index) => {
        const angle = -Math.PI / 2 + (Math.PI * 2 * index / Math.max(1, levelNodes.length));
        positions.set(node.id, {
          x: centerX + Math.cos(angle) * radiusX,
          y: centerY + Math.sin(angle) * radiusY
        });
      });
    }

    return { byId, positions, width, height };
  }

  function buildKnowledgeGraph() {
    const note = currentNote();
    els.graphContainer.innerHTML = "";
    if (!note) {
      els.graphContainer.innerHTML = '<p class="muted" style="padding:20px">請先開啟一篇筆記。</p>';
      return;
    }

    const graph = parseKnowledgeGraph(note);
    const layout = layoutKnowledgeGraph(graph);
    const svg = document.createElementNS(SVG_NS, "svg");
    svg.setAttribute("viewBox", `0 0 ${layout.width} ${layout.height}`);
    svg.setAttribute("width", layout.width);
    svg.setAttribute("height", layout.height);

    const defs = document.createElementNS(SVG_NS, "defs");
    const marker = document.createElementNS(SVG_NS, "marker");
    marker.setAttribute("id", "kgArrowHead");
    marker.setAttribute("markerWidth", "10");
    marker.setAttribute("markerHeight", "10");
    marker.setAttribute("refX", "8");
    marker.setAttribute("refY", "3");
    marker.setAttribute("orient", "auto");
    const arrowPath = document.createElementNS(SVG_NS, "path");
    arrowPath.setAttribute("d", "M0,0 L0,6 L9,3 z");
    arrowPath.setAttribute("class", "knowledge-arrow-head");
    marker.appendChild(arrowPath);
    defs.appendChild(marker);
    svg.appendChild(defs);

    for (const edge of graph.edges) {
      const source = layout.positions.get(edge.source);
      const target = layout.positions.get(edge.target);
      if (!source || !target) continue;
      const group = document.createElementNS(SVG_NS, "g");
      group.setAttribute("class", "knowledge-edge-group");
      const path = document.createElementNS(SVG_NS, "path");
      const midX = (source.x + target.x) / 2;
      const midY = (source.y + target.y) / 2;
      path.setAttribute("d", `M ${source.x} ${source.y} Q ${midX} ${midY - 20} ${target.x} ${target.y}`);
      path.setAttribute("class", "graph-edge knowledge-edge");
      path.setAttribute("marker-end", "url(#kgArrowHead)");
      const label = document.createElementNS(SVG_NS, "text");
      label.setAttribute("x", midX);
      label.setAttribute("y", midY - 8);
      label.setAttribute("class", "knowledge-edge-label");
      label.textContent = edge.relation;
      group.append(path, label);
      svg.appendChild(group);
    }

    for (const node of graph.nodes) {
      const p = layout.positions.get(node.id) || { x: layout.width / 2, y: layout.height / 2 };
      const width = Math.min(210, Math.max(108, node.label.length * 14 + 34));
      const height = 52;
      const group = document.createElementNS(SVG_NS, "g");
      group.setAttribute("class", `graph-node knowledge-node ${node.type === "root" ? "active root" : node.type}`);
      group.setAttribute("transform", `translate(${p.x - width / 2}, ${p.y - height / 2})`);
      const rect = document.createElementNS(SVG_NS, "rect");
      rect.setAttribute("width", width);
      rect.setAttribute("height", height);
      rect.setAttribute("rx", 14);
      const text = document.createElementNS(SVG_NS, "text");
      text.setAttribute("x", width / 2);
      text.setAttribute("y", height / 2 + 1);
      text.textContent = node.label.length > 22 ? `${node.label.slice(0, 21)}…` : node.label;
      const title = document.createElementNS(SVG_NS, "title");
      title.textContent = node.label;
      group.append(rect, text, title);
      svg.appendChild(group);
    }

    els.graphContainer.appendChild(svg);
  }

  function cleanMindLabel(text) {
    return stripMarkdown(String(text || "")).replace(/\s+/g, " ").trim().slice(0, 80) || "未命名節點";
  }

  function buildMindTree(note) {
    const root = { id: uid(), label: note.title, children: [], targetTitle: note.title, root: true };
    const headingStack = [{ level: 0, node: root }];
    let currentHeading = root;
    let listStack = [];
    const lines = note.content.replace(/\r\n?/g, "\n").split("\n");

    for (const rawLine of lines) {
      const line = rawLine.replace(/\t/g, "  ");
      const heading = /^(#{1,6})\s+(.*)$/.exec(line.trim());
      if (heading) {
        const level = heading[1].length;
        while (headingStack.length && headingStack[headingStack.length - 1].level >= level) headingStack.pop();
        const parent = headingStack[headingStack.length - 1]?.node || root;
        const node = { id: uid(), label: cleanMindLabel(heading[2]), children: [] };
        parent.children.push(node);
        headingStack.push({ level, node });
        currentHeading = node;
        listStack = [];
        continue;
      }

      const listItem = /^(\s*)[-*+]\s+(.*)$/.exec(line);
      const orderedItem = /^(\s*)\d+\.\s+(.*)$/.exec(line);
      const item = listItem || orderedItem;
      if (item) {
        const indentLevel = Math.floor(item[1].length / 2);
        while (listStack.length > indentLevel) listStack.pop();
        const parent = indentLevel > 0 ? (listStack[indentLevel - 1] || currentHeading) : currentHeading;
        const wiki = extractWikiLinks(item[2])[0];
        const node = {
          id: uid(),
          label: cleanMindLabel(item[2]),
          children: [],
          targetTitle: wiki?.title || null
        };
        parent.children.push(node);
        listStack[indentLevel] = node;
        listStack = listStack.slice(0, indentLevel + 1);
        continue;
      }

      if (line.trim()) {
        for (const link of extractWikiLinks(line)) {
          if (!currentHeading.children.some(child => child.targetTitle?.toLowerCase() === link.title.toLowerCase())) {
            currentHeading.children.push({ id: uid(), label: link.label, children: [], targetTitle: link.title });
          }
        }
      }
    }

    if (!root.children.length) root.children.push({ id: uid(), label: "加入標題或條列內容即可產生心智圖", children: [] });
    return root;
  }

  function layoutMindTree(root) {
    let nextY = 55;
    let maxDepth = 0;
    const nodes = [];
    const edges = [];

    function walk(node, depth, parent = null) {
      maxDepth = Math.max(maxDepth, depth);
      const children = node.children || [];
      for (const child of children) walk(child, depth + 1, node);
      if (!children.length) {
        node.y = nextY;
        nextY += 74;
      } else {
        node.y = children.reduce((sum, child) => sum + child.y, 0) / children.length;
      }
      node.x = 55 + depth * 230;
      node.width = Math.min(205, Math.max(105, node.label.length * 14 + 32));
      node.height = 46;
      nodes.push(node);
      if (parent) edges.push({ source: parent, target: node });
    }

    walk(root, 0);
    return {
      nodes,
      edges,
      width: Math.max(850, 120 + (maxDepth + 1) * 230),
      height: Math.max(560, nextY + 40)
    };
  }

  function buildMindMap() {
    const note = currentNote();
    els.mindMapContainer.innerHTML = "";
    if (!note) {
      els.mindMapContainer.innerHTML = '<p class="muted" style="padding:20px">請先開啟一篇筆記。</p>';
      return;
    }
    const layout = layoutMindTree(buildMindTree(note));
    const svg = document.createElementNS(SVG_NS, "svg");
    svg.setAttribute("viewBox", `0 0 ${layout.width} ${layout.height}`);
    svg.setAttribute("width", Math.round(layout.width * mindZoom));
    svg.setAttribute("height", Math.round(layout.height * mindZoom));

    for (const edge of layout.edges) {
      const path = document.createElementNS(SVG_NS, "path");
      const x1 = edge.source.x + edge.source.width;
      const y1 = edge.source.y;
      const x2 = edge.target.x;
      const y2 = edge.target.y;
      const mid = (x1 + x2) / 2;
      path.setAttribute("d", `M ${x1} ${y1} C ${mid} ${y1}, ${mid} ${y2}, ${x2} ${y2}`);
      path.setAttribute("class", "mind-edge");
      svg.appendChild(path);
    }

    for (const node of layout.nodes) {
      const group = document.createElementNS(SVG_NS, "g");
      const linked = node.targetTitle && findByTitle(node.targetTitle);
      group.setAttribute("class", `mind-node ${node.root ? "root" : ""} ${linked ? "linked" : ""}`);
      group.setAttribute("transform", `translate(${node.x}, ${node.y - node.height / 2})`);
      const rect = document.createElementNS(SVG_NS, "rect");
      rect.setAttribute("width", node.width);
      rect.setAttribute("height", node.height);
      const text = document.createElementNS(SVG_NS, "text");
      text.setAttribute("x", 14);
      text.setAttribute("y", node.height / 2 + 1);
      text.textContent = node.label.length > 24 ? `${node.label.slice(0, 23)}…` : node.label;
      group.append(rect, text);
      if (linked) {
        group.addEventListener("click", () => {
          closeModals();
          openNote(linked.id);
        });
      }
      svg.appendChild(group);
    }
    els.mindMapContainer.appendChild(svg);
  }

  function extractDiagramBlock(content, languages) {
    const allowed = new Set(languages.map(item => item.toLowerCase()));
    const blocks = [];
    let active = false;
    let buffer = [];
    for (const rawLine of String(content || "").replace(/\r\n?/g, "\n").split("\n")) {
      const fence = /^```\s*([^\s`]*)/i.exec(rawLine.trim());
      if (fence) {
        if (active) {
          blocks.push(buffer.join("\n"));
          buffer = [];
          active = false;
        } else if (allowed.has(String(fence[1] || "").toLowerCase())) {
          active = true;
        }
        continue;
      }
      if (active) buffer.push(rawLine);
    }
    if (active && buffer.length) blocks.push(buffer.join("\n"));
    return blocks.join("\n").trim();
  }

  function parseFlowGraph(note) {
    const sourceText = extractDiagramBlock(note.content, ["flow", "flowchart", "流程圖"]);
    const nodes = [];
    const edges = [];
    const nodeByKey = new Map();
    const edgeKeys = new Set();

    const addNode = (rawToken, fallbackType = "process") => {
      let token = String(rawToken || "").trim().replace(/^[-*+]\s+/, "");
      if (!token) return null;
      let id = token;
      let label = token;
      let type = fallbackType;
      let match = /^([^(){}\[\]]+?)\(\((.+)\)\)$/.exec(token);
      if (match) {
        id = match[1].trim(); label = match[2].trim(); type = "terminal";
      } else if ((match = /^\(\((.+)\)\)$/.exec(token))) {
        id = label = match[1].trim(); type = "terminal";
      } else if ((match = /^([^{}\[\]]+?)\{(.+)\}$/.exec(token))) {
        id = match[1].trim(); label = match[2].trim(); type = "decision";
      } else if ((match = /^\{(.+)\}$/.exec(token))) {
        id = label = match[1].trim(); type = "decision";
      } else if ((match = /^([^\[\]{}]+?)\[(.+)\]$/.exec(token))) {
        id = match[1].trim(); label = match[2].trim(); type = "process";
      } else if ((match = /^\[(.+)\]$/.exec(token))) {
        id = label = match[1].trim(); type = "process";
      }
      const key = normalizeKnowledgeLabel(id).toLowerCase() || normalizeKnowledgeLabel(label).toLowerCase();
      if (!key) return null;
      if (nodeByKey.has(key)) {
        const existing = nodeByKey.get(key);
        if (label !== id || existing.label === existing.key) existing.label = normalizeKnowledgeLabel(label);
        if (type !== "process") existing.type = type;
        return existing;
      }
      const node = {
        id: `flow-${nodes.length + 1}`,
        key,
        label: normalizeKnowledgeLabel(label) || `步驟 ${nodes.length + 1}`,
        type
      };
      nodeByKey.set(key, node);
      nodes.push(node);
      return node;
    };

    const addEdge = (sourceToken, targetToken, label = "") => {
      const source = addNode(sourceToken);
      const target = addNode(targetToken);
      if (!source || !target) return;
      const cleanLabel = normalizeKnowledgeLabel(label);
      const key = `${source.id}|${target.id}|${cleanLabel}`;
      if (edgeKeys.has(key)) return;
      edgeKeys.add(key);
      edges.push({ id: `flow-edge-${edges.length + 1}`, source: source.id, target: target.id, label: cleanLabel });
    };

    for (const rawLine of sourceText.split("\n")) {
      const line = rawLine.trim().replace(/;$/, "");
      if (!line || line.startsWith("//")) continue;
      let match = /^(.+?)\s*(?:-->|->|→)\s*\|(.+?)\|\s*(.+)$/.exec(line);
      if (match) {
        addEdge(match[1], match[3], match[2]);
        continue;
      }
      match = /^(.+?)\s*--\s*(.+?)\s*-->\s*(.+)$/.exec(line);
      if (match) {
        addEdge(match[1], match[3], match[2]);
        continue;
      }
      match = /^(.+?)\s*(?:-->|->|→)\s*(.+?)\s*:\s*(.+)$/.exec(line);
      if (match) {
        addEdge(match[1], match[2], match[3]);
        continue;
      }
      const chain = line.split(/\s*(?:-->|->|→)\s*/).filter(Boolean);
      if (chain.length >= 2) {
        for (let index = 0; index < chain.length - 1; index++) addEdge(chain[index], chain[index + 1]);
      } else {
        addNode(line);
      }
    }

    if (!nodes.length) {
      const hint = addNode("提示((請在筆記加入 flow 程式區塊))", "terminal");
      return { nodes: hint ? [hint] : [], edges: [] };
    }
    return { nodes, edges };
  }

  function layoutFlowGraph(graph) {
    const byId = new Map(graph.nodes.map(node => [node.id, node]));
    const incoming = new Map(graph.nodes.map(node => [node.id, 0]));
    const outgoing = new Map(graph.nodes.map(node => [node.id, []]));
    for (const edge of graph.edges) {
      incoming.set(edge.target, (incoming.get(edge.target) || 0) + 1);
      outgoing.get(edge.source)?.push(edge.target);
    }
    const level = new Map();
    const queue = graph.nodes.filter(node => !incoming.get(node.id)).map(node => node.id);
    if (!queue.length && graph.nodes[0]) queue.push(graph.nodes[0].id);
    queue.forEach(id => level.set(id, 0));
    while (queue.length) {
      const id = queue.shift();
      for (const target of outgoing.get(id) || []) {
        if (level.has(target)) continue;
        level.set(target, (level.get(id) || 0) + 1);
        queue.push(target);
      }
    }
    let fallbackLevel = Math.max(0, ...level.values()) + 1;
    for (const node of graph.nodes) {
      if (!level.has(node.id)) level.set(node.id, fallbackLevel++);
    }
    const maxLevel = Math.max(0, ...level.values());
    const groups = Array.from({ length: maxLevel + 1 }, () => []);
    graph.nodes.forEach(node => groups[level.get(node.id)].push(node));
    const maxAcross = Math.max(1, ...groups.map(group => group.length));
    const width = Math.max(720, 150 + maxAcross * 235);
    const height = Math.max(560, 120 + groups.length * 140);
    const positions = new Map();
    groups.forEach((group, row) => {
      const gap = width / (group.length + 1);
      group.forEach((node, index) => {
        const nodeWidth = node.type === "decision" ? 180 : Math.min(230, Math.max(130, node.label.length * 14 + 42));
        positions.set(node.id, { x: gap * (index + 1), y: 70 + row * 135, width: nodeWidth, height: node.type === "decision" ? 90 : 62 });
      });
    });
    return { byId, positions, width, height };
  }

  function centerDiagramContainer(container) {
    requestAnimationFrame(() => {
      container.scrollLeft = Math.max(0, (container.scrollWidth - container.clientWidth) / 2);
      container.scrollTop = 0;
    });
  }

  function buildFlowChart() {
    const note = currentNote();
    els.flowContainer.innerHTML = "";
    if (!note) {
      els.flowContainer.innerHTML = '<p class="muted" style="padding:20px">請先開啟一篇筆記。</p>';
      return;
    }
    const graph = parseFlowGraph(note);
    const layout = layoutFlowGraph(graph);
    const svg = document.createElementNS(SVG_NS, "svg");
    svg.setAttribute("viewBox", `0 0 ${layout.width} ${layout.height}`);
    svg.setAttribute("width", layout.width);
    svg.setAttribute("height", layout.height);
    const defs = document.createElementNS(SVG_NS, "defs");
    const marker = document.createElementNS(SVG_NS, "marker");
    marker.setAttribute("id", "flowArrowHead");
    marker.setAttribute("markerWidth", "10");
    marker.setAttribute("markerHeight", "10");
    marker.setAttribute("refX", "8");
    marker.setAttribute("refY", "3");
    marker.setAttribute("orient", "auto");
    const arrowPath = document.createElementNS(SVG_NS, "path");
    arrowPath.setAttribute("d", "M0,0 L0,6 L9,3 z");
    arrowPath.setAttribute("class", "diagram-arrow-head");
    marker.appendChild(arrowPath);
    defs.appendChild(marker);
    svg.appendChild(defs);

    for (const edge of graph.edges) {
      const source = layout.positions.get(edge.source);
      const target = layout.positions.get(edge.target);
      if (!source || !target) continue;
      const path = document.createElementNS(SVG_NS, "path");
      const downward = target.y >= source.y;
      const sx = source.x;
      const sy = source.y + (downward ? source.height / 2 : -source.height / 2);
      const tx = target.x;
      const ty = target.y + (downward ? -target.height / 2 : target.height / 2);
      const midY = (sy + ty) / 2;
      let labelX = (sx + tx) / 2;
      let labelY = midY - 7;
      if (!downward) {
        const sideX = Math.min(layout.width - 70, Math.max(sx, tx) + 155);
        path.setAttribute("d", `M ${sx} ${sy} C ${sideX} ${sy}, ${sideX} ${ty}, ${tx} ${ty}`);
        labelX = sideX;
        labelY = midY;
      } else {
        path.setAttribute("d", `M ${sx} ${sy} C ${sx} ${midY}, ${tx} ${midY}, ${tx} ${ty}`);
      }
      path.setAttribute("class", "flow-edge");
      path.setAttribute("marker-end", "url(#flowArrowHead)");
      svg.appendChild(path);
      if (edge.label) {
        const label = document.createElementNS(SVG_NS, "text");
        label.setAttribute("x", labelX);
        label.setAttribute("y", labelY);
        label.setAttribute("class", "flow-edge-label");
        label.textContent = edge.label;
        svg.appendChild(label);
      }
    }

    for (const node of graph.nodes) {
      const pos = layout.positions.get(node.id);
      if (!pos) continue;
      const group = document.createElementNS(SVG_NS, "g");
      group.setAttribute("class", `flow-node ${node.type}`);
      group.setAttribute("transform", `translate(${pos.x - pos.width / 2}, ${pos.y - pos.height / 2})`);
      if (node.type === "decision") {
        const polygon = document.createElementNS(SVG_NS, "polygon");
        polygon.setAttribute("points", `${pos.width / 2},0 ${pos.width},${pos.height / 2} ${pos.width / 2},${pos.height} 0,${pos.height / 2}`);
        group.appendChild(polygon);
      } else {
        const rect = document.createElementNS(SVG_NS, "rect");
        rect.setAttribute("width", pos.width);
        rect.setAttribute("height", pos.height);
        rect.setAttribute("rx", node.type === "terminal" ? pos.height / 2 : 12);
        group.appendChild(rect);
      }
      createSvgText(group, pos.width / 2, pos.height / 2 - (node.label.length > 18 ? 7 : -4), node.label, "flow-label", 18);
      svg.appendChild(group);
    }
    els.flowContainer.appendChild(svg);
    centerDiagramContainer(els.flowContainer);
  }

  function assignTreeIds(node, path = "root") {
    node.treeId = path;
    (node.children || []).forEach((child, index) => assignTreeIds(child, `${path}.${index}`));
    return node;
  }

  function buildTreeSource(note) {
    const block = extractDiagramBlock(note.content, ["tree", "hierarchy", "樹狀圖"]);
    if (!block) return assignTreeIds(buildMindTree(note));
    const root = { label: note.title || "未命名筆記", children: [], root: true };
    const stack = [{ level: -1, node: root }];
    for (const rawLine of block.replace(/\t/g, "  ").split("\n")) {
      if (!rawLine.trim()) continue;
      const spaces = (rawLine.match(/^\s*/) || [""])[0].length;
      const level = Math.floor(spaces / 2);
      const label = cleanMindLabel(rawLine.trim().replace(/^[-*+]\s+/, "").replace(/^\d+\.\s+/, ""));
      const node = { label, children: [] };
      while (stack.length && stack[stack.length - 1].level >= level) stack.pop();
      (stack[stack.length - 1]?.node || root).children.push(node);
      stack.push({ level, node });
    }
    if (!root.children.length) root.children.push({ label: "請在 tree 區塊加入縮排內容", children: [] });
    return assignTreeIds(root);
  }

  function layoutTreeDiagram(root) {
    let nextX = 80;
    let maxDepth = 0;
    const nodes = [];
    const edges = [];
    const walk = (node, depth, parent = null) => {
      maxDepth = Math.max(maxDepth, depth);
      const allChildren = node.children || [];
      const children = treeCollapsedIds.has(node.treeId) ? [] : allChildren;
      children.forEach(child => walk(child, depth + 1, node));
      node.width = Math.min(220, Math.max(118, node.label.length * 14 + 42));
      node.height = 54;
      node.depth = depth;
      node.hasChildren = allChildren.length > 0;
      node.collapsed = treeCollapsedIds.has(node.treeId);
      if (!children.length) {
        node.x = nextX + node.width / 2;
        nextX += Math.max(190, node.width + 42);
      } else {
        node.x = children.reduce((sum, child) => sum + child.x, 0) / children.length;
      }
      node.y = 55 + depth * 125;
      nodes.push(node);
      if (parent) edges.push({ source: parent, target: node });
    };
    walk(root, 0);
    return { nodes, edges, width: Math.max(850, nextX + 70), height: Math.max(560, 120 + (maxDepth + 1) * 125) };
  }

  function buildTreeDiagram() {
    const note = currentNote();
    els.treeContainer.innerHTML = "";
    if (!note) {
      els.treeContainer.innerHTML = '<p class="muted" style="padding:20px">請先開啟一篇筆記。</p>';
      return;
    }
    const layout = layoutTreeDiagram(buildTreeSource(note));
    const svg = document.createElementNS(SVG_NS, "svg");
    svg.setAttribute("viewBox", `0 0 ${layout.width} ${layout.height}`);
    svg.setAttribute("width", layout.width);
    svg.setAttribute("height", layout.height);
    for (const edge of layout.edges) {
      const path = document.createElementNS(SVG_NS, "path");
      const x1 = edge.source.x;
      const y1 = edge.source.y + edge.source.height / 2;
      const x2 = edge.target.x;
      const y2 = edge.target.y - edge.target.height / 2;
      const midY = (y1 + y2) / 2;
      path.setAttribute("d", `M ${x1} ${y1} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2}`);
      path.setAttribute("class", "tree-edge");
      svg.appendChild(path);
    }
    for (const node of layout.nodes) {
      const group = document.createElementNS(SVG_NS, "g");
      group.setAttribute("class", `tree-node ${node.root ? "root" : ""} ${node.hasChildren ? "branch" : "leaf"}`);
      group.setAttribute("transform", `translate(${node.x - node.width / 2}, ${node.y - node.height / 2})`);
      const rect = document.createElementNS(SVG_NS, "rect");
      rect.setAttribute("width", node.width);
      rect.setAttribute("height", node.height);
      rect.setAttribute("rx", 12);
      group.appendChild(rect);
      createSvgText(group, node.width / 2, node.height / 2 + 4, node.label, "tree-label", 20);
      if (node.hasChildren) {
        const badge = document.createElementNS(SVG_NS, "circle");
        badge.setAttribute("cx", node.width - 10);
        badge.setAttribute("cy", 10);
        badge.setAttribute("r", 9);
        badge.setAttribute("class", "tree-toggle-badge");
        const sign = document.createElementNS(SVG_NS, "text");
        sign.setAttribute("x", node.width - 10);
        sign.setAttribute("y", 13);
        sign.setAttribute("class", "tree-toggle-sign");
        sign.textContent = node.collapsed ? "+" : "−";
        group.append(badge, sign);
        group.addEventListener("click", () => {
          if (treeCollapsedIds.has(node.treeId)) treeCollapsedIds.delete(node.treeId);
          else treeCollapsedIds.add(node.treeId);
          buildTreeDiagram();
        });
      }
      svg.appendChild(group);
    }
    els.treeContainer.appendChild(svg);
    centerDiagramContainer(els.treeContainer);
  }

  function collapseTreeToTwoLevels() {
    const note = currentNote();
    if (!note) return;
    treeCollapsedIds.clear();
    const root = buildTreeSource(note);
    const walk = (node, depth) => {
      if (depth >= 1 && node.children?.length) treeCollapsedIds.add(node.treeId);
      (node.children || []).forEach(child => walk(child, depth + 1));
    };
    walk(root, 0);
    buildTreeDiagram();
  }

  function ensureCurrentStrategyMap() {
    const note = currentNote();
    if (!note) return null;
    note.strategyMap = normalizeStrategyMap(note.strategyMap);
    return note.strategyMap;
  }

  function renderStrategyPerspectiveOptions() {
    const map = ensureCurrentStrategyMap();
    if (!map) return;
    const addValue = els.strategyPerspectiveSelect.value;
    const editValue = els.strategyEditPerspectiveSelect.value;
    const fill = (select, selectedValue) => {
      select.innerHTML = "";
      for (const perspective of map.perspectives) {
        const option = document.createElement("option");
        option.value = perspective.id;
        option.textContent = perspective.label;
        select.appendChild(option);
      }
      if (map.perspectives.some(item => item.id === selectedValue)) select.value = selectedValue;
    };
    fill(els.strategyPerspectiveSelect, addValue);
    fill(els.strategyEditPerspectiveSelect, editValue);
  }

  function strategyNodeLayout(map, width, height) {
    const laneTop = 24;
    const laneGap = 10;
    const laneHeight = (height - laneTop * 2 - laneGap * (map.perspectives.length - 1)) / map.perspectives.length;
    const labelWidth = 215;
    const positions = new Map();
    map.perspectives.forEach((perspective, laneIndex) => {
      const laneNodes = map.nodes.filter(node => node.perspective === perspective.id);
      const availableWidth = width - labelWidth - 45;
      laneNodes.forEach((node, index) => {
        const x = labelWidth + 20 + ((index + 0.5) * availableWidth / Math.max(laneNodes.length, 1));
        const y = laneTop + laneIndex * (laneHeight + laneGap) + laneHeight / 2;
        positions.set(node.id, { x, y, width: 205, height: 88, laneIndex });
      });
    });
    return { positions, laneTop, laneGap, laneHeight, labelWidth };
  }

  function createSvgText(parent, x, y, text, className, maxChars = 20) {
    const element = document.createElementNS(SVG_NS, "text");
    element.setAttribute("x", x);
    element.setAttribute("y", y);
    element.setAttribute("class", className);
    const clean = String(text || "");
    const lines = clean.length > maxChars
      ? [clean.slice(0, maxChars), `${clean.slice(maxChars, maxChars * 2 - 1)}${clean.length > maxChars * 2 - 1 ? "…" : ""}`]
      : [clean];
    lines.forEach((line, index) => {
      const tspan = document.createElementNS(SVG_NS, "tspan");
      tspan.setAttribute("x", x);
      tspan.setAttribute("dy", index === 0 ? "0" : "16");
      tspan.textContent = line;
      element.appendChild(tspan);
    });
    parent.appendChild(element);
    return element;
  }

  function renderStrategyControls() {
    const map = ensureCurrentStrategyMap();
    if (!map) return;
    renderStrategyPerspectiveOptions();
    const nodeById = new Map(map.nodes.map(node => [node.id, node]));
    const perspectiveById = new Map(map.perspectives.map(item => [item.id, item]));
    const selected = nodeById.get(strategySelectedId) || null;
    const editable = Boolean(selected);
    els.strategySelectedTitle.textContent = selected ? selected.text : "尚未選擇";
    els.strategyEditPerspectiveSelect.disabled = !editable;
    els.strategyEditObjectiveInput.disabled = !editable;
    els.strategyEditKpiInput.disabled = !editable;
    els.strategySaveBtn.disabled = !editable;
    els.strategyDeleteBtn.disabled = !editable;
    if (selected) {
      els.strategyEditPerspectiveSelect.value = selected.perspective;
      els.strategyEditObjectiveInput.value = selected.text;
      els.strategyEditKpiInput.value = selected.kpi || "";
      els.strategyHint.textContent = `已選擇「${selected.text}」。可在上方修改，或用下拉選單建立因果箭頭。`;
    } else {
      els.strategyEditObjectiveInput.value = "";
      els.strategyEditKpiInput.value = "";
      els.strategyHint.textContent = map.nodes.length
        ? "點選地圖中的目標，即可在上方表單編輯。箭頭建議由下方能力指向上方成果。"
        : "尚無目標。可先按「載入範例」理解操作方式，或自行新增第一個目標。";
    }

    const previousSource = els.strategySourceSelect.value;
    const previousTarget = els.strategyTargetSelect.value;
    const fillNodeSelect = (select, placeholder, previous) => {
      select.innerHTML = "";
      const first = document.createElement("option");
      first.value = "";
      first.textContent = placeholder;
      select.appendChild(first);
      for (const node of map.nodes) {
        const option = document.createElement("option");
        option.value = node.id;
        option.textContent = `${perspectiveById.get(node.perspective)?.label || "其他"}｜${node.text}`;
        select.appendChild(option);
      }
      if (nodeById.has(previous)) select.value = previous;
    };
    fillNodeSelect(els.strategySourceSelect, "選擇造成影響的目標", previousSource);
    fillNodeSelect(els.strategyTargetSelect, "選擇受到影響的目標", previousTarget);

    els.strategyConnectionList.innerHTML = "";
    if (!map.edges.length) {
      els.strategyConnectionList.innerHTML = '<p class="muted">尚未建立連線。例：提升 AI 能力 → 支援 → 提高回饋準確度。</p>';
    } else {
      for (const edge of map.edges) {
        const source = nodeById.get(edge.source);
        const target = nodeById.get(edge.target);
        if (!source || !target) continue;
        const row = document.createElement("div");
        row.className = "strategy-connection-item";
        row.innerHTML = `<span><strong>${escapeHtml(source.text)}</strong> <em>→ ${escapeHtml(edge.label || "促進")} →</em> <strong>${escapeHtml(target.text)}</strong></span><button class="text-btn danger-text" data-edge-id="${escapeHtml(edge.id)}">移除</button>`;
        row.querySelector("button").addEventListener("click", () => deleteStrategyConnection(edge.id));
        els.strategyConnectionList.appendChild(row);
      }
    }
  }

  function buildStrategyMap() {
    const note = currentNote();
    els.strategyContainer.innerHTML = "";
    if (!note) {
      els.strategyContainer.innerHTML = '<p class="muted" style="padding:20px">請先開啟一篇筆記。</p>';
      return;
    }
    const map = ensureCurrentStrategyMap();
    renderStrategyControls();
    const maxLaneNodes = Math.max(1, ...map.perspectives.map(p => map.nodes.filter(n => n.perspective === p.id).length));
    const width = Math.max(1040, 250 + maxLaneNodes * 230);
    const height = Math.max(720, map.perspectives.length * 170 + 50);
    const layout = strategyNodeLayout(map, width, height);
    const svg = document.createElementNS(SVG_NS, "svg");
    svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
    svg.setAttribute("width", width);
    svg.setAttribute("height", height);

    const defs = document.createElementNS(SVG_NS, "defs");
    const marker = document.createElementNS(SVG_NS, "marker");
    marker.setAttribute("id", "strategyArrowHead");
    marker.setAttribute("markerWidth", "10");
    marker.setAttribute("markerHeight", "10");
    marker.setAttribute("refX", "8");
    marker.setAttribute("refY", "3");
    marker.setAttribute("orient", "auto");
    marker.setAttribute("markerUnits", "strokeWidth");
    const arrowPath = document.createElementNS(SVG_NS, "path");
    arrowPath.setAttribute("d", "M0,0 L0,6 L9,3 z");
    arrowPath.setAttribute("class", "diagram-arrow-head");
    marker.appendChild(arrowPath);
    defs.appendChild(marker);
    svg.appendChild(defs);

    map.perspectives.forEach((perspective, index) => {
      const y = layout.laneTop + index * (layout.laneHeight + layout.laneGap);
      const rect = document.createElementNS(SVG_NS, "rect");
      rect.setAttribute("x", 8);
      rect.setAttribute("y", y);
      rect.setAttribute("width", width - 16);
      rect.setAttribute("height", layout.laneHeight);
      rect.setAttribute("rx", 14);
      rect.setAttribute("class", `strategy-lane lane-${index % 4}`);
      svg.appendChild(rect);
      const label = document.createElementNS(SVG_NS, "text");
      label.setAttribute("x", 26);
      label.setAttribute("y", y + layout.laneHeight / 2 - 6);
      label.setAttribute("class", "strategy-lane-label");
      label.textContent = perspective.label;
      svg.appendChild(label);
      const description = document.createElementNS(SVG_NS, "text");
      description.setAttribute("x", 26);
      description.setAttribute("y", y + layout.laneHeight / 2 + 18);
      description.setAttribute("class", "strategy-lane-description");
      description.textContent = perspective.description || "策略構面";
      svg.appendChild(description);
      if (!map.nodes.some(node => node.perspective === perspective.id)) {
        const empty = document.createElementNS(SVG_NS, "text");
        empty.setAttribute("x", layout.labelWidth + 28);
        empty.setAttribute("y", y + layout.laneHeight / 2 + 5);
        empty.setAttribute("class", "strategy-empty-lane");
        empty.textContent = "尚無目標";
        svg.appendChild(empty);
      }
    });

    for (const edge of map.edges) {
      const source = layout.positions.get(edge.source);
      const target = layout.positions.get(edge.target);
      if (!source || !target) continue;
      const upward = target.y < source.y;
      const sameLane = Math.abs(target.y - source.y) < 20;
      let sx = source.x;
      let sy = source.y + (upward ? -source.height / 2 : source.height / 2);
      let tx = target.x;
      let ty = target.y + (upward ? target.height / 2 : -target.height / 2);
      let pathData;
      let labelX;
      let labelY;
      if (sameLane) {
        const rightward = target.x >= source.x;
        sx = source.x + (rightward ? source.width / 2 : -source.width / 2);
        sy = source.y;
        tx = target.x + (rightward ? -target.width / 2 : target.width / 2);
        ty = target.y;
        const midX = (sx + tx) / 2;
        pathData = `M ${sx} ${sy} C ${midX} ${sy - 42}, ${midX} ${ty - 42}, ${tx} ${ty}`;
        labelX = midX;
        labelY = sy - 48;
      } else {
        const midY = (sy + ty) / 2;
        pathData = `M ${sx} ${sy} C ${sx} ${midY}, ${tx} ${midY}, ${tx} ${ty}`;
        labelX = (sx + tx) / 2;
        labelY = midY - 8;
      }
      const path = document.createElementNS(SVG_NS, "path");
      path.setAttribute("d", pathData);
      path.setAttribute("class", "strategy-edge");
      path.setAttribute("marker-end", "url(#strategyArrowHead)");
      svg.appendChild(path);
      const edgeLabel = document.createElementNS(SVG_NS, "text");
      edgeLabel.setAttribute("x", labelX);
      edgeLabel.setAttribute("y", labelY);
      edgeLabel.setAttribute("class", "strategy-edge-label");
      edgeLabel.textContent = edge.label || "促進";
      svg.appendChild(edgeLabel);
    }

    for (const node of map.nodes) {
      const pos = layout.positions.get(node.id);
      if (!pos) continue;
      const group = document.createElementNS(SVG_NS, "g");
      const selected = strategySelectedId === node.id;
      group.setAttribute("class", `strategy-node ${selected ? "selected" : ""}`);
      group.setAttribute("transform", `translate(${pos.x - pos.width / 2}, ${pos.y - pos.height / 2})`);
      const rect = document.createElementNS(SVG_NS, "rect");
      rect.setAttribute("width", pos.width);
      rect.setAttribute("height", pos.height);
      group.appendChild(rect);
      createSvgText(group, pos.width / 2, 29, node.text, "objective", 18);
      createSvgText(group, pos.width / 2, 69, node.kpi ? `KPI：${node.kpi}` : "尚未設定 KPI", "kpi", 28);
      const title = document.createElementNS(SVG_NS, "title");
      title.textContent = `${node.text}${node.kpi ? `｜KPI：${node.kpi}` : ""}`;
      group.appendChild(title);
      group.addEventListener("click", event => {
        event.stopPropagation();
        strategySelectedId = node.id;
        buildStrategyMap();
      });
      svg.appendChild(group);
    }

    svg.addEventListener("click", () => {
      strategySelectedId = null;
      buildStrategyMap();
    });
    els.strategyContainer.appendChild(svg);
  }

  async function addStrategyObjective() {
    const note = currentNote();
    const map = ensureCurrentStrategyMap();
    if (!note || !map) return;
    const text = els.strategyObjectiveInput.value.trim();
    if (!text) {
      els.strategyObjectiveInput.focus();
      showToast("請先輸入策略目標");
      return;
    }
    captureSnapshot(note, "策略地圖變更", true);
    const node = {
      id: uid(),
      perspective: els.strategyPerspectiveSelect.value || map.perspectives[map.perspectives.length - 1].id,
      text,
      kpi: els.strategyKpiInput.value.trim(),
      createdAt: new Date().toISOString()
    };
    map.nodes.push(node);
    note.strategyMap = map;
    note.updatedAt = new Date().toISOString();
    els.strategyObjectiveInput.value = "";
    els.strategyKpiInput.value = "";
    strategySelectedId = node.id;
    await queuePersist();
    buildStrategyMap();
    showToast("策略目標已新增");
  }

  async function saveSelectedStrategyNode() {
    const note = currentNote();
    const map = ensureCurrentStrategyMap();
    const node = map?.nodes.find(item => item.id === strategySelectedId);
    if (!note || !node) {
      showToast("請先選擇一個目標");
      return;
    }
    const text = els.strategyEditObjectiveInput.value.trim();
    if (!text) {
      els.strategyEditObjectiveInput.focus();
      showToast("目標名稱不能空白");
      return;
    }
    captureSnapshot(note, "策略地圖變更", true);
    node.perspective = els.strategyEditPerspectiveSelect.value || node.perspective;
    node.text = text;
    node.kpi = els.strategyEditKpiInput.value.trim();
    note.strategyMap = map;
    note.updatedAt = new Date().toISOString();
    await queuePersist();
    buildStrategyMap();
    showToast("目標已更新");
  }

  async function deleteSelectedStrategyNode() {
    const note = currentNote();
    const map = ensureCurrentStrategyMap();
    const node = map?.nodes.find(item => item.id === strategySelectedId);
    if (!note || !node) {
      showToast("請先選擇一個目標");
      return;
    }
    if (!confirm(`刪除策略目標「${node.text}」及相關連線？`)) return;
    captureSnapshot(note, "策略地圖變更", true);
    map.nodes = map.nodes.filter(item => item.id !== node.id);
    map.edges = map.edges.filter(edge => edge.source !== node.id && edge.target !== node.id);
    strategySelectedId = null;
    note.strategyMap = map;
    note.updatedAt = new Date().toISOString();
    await queuePersist();
    buildStrategyMap();
  }

  async function addStrategyConnection() {
    const note = currentNote();
    const map = ensureCurrentStrategyMap();
    if (!note || !map) return;
    const source = els.strategySourceSelect.value;
    const target = els.strategyTargetSelect.value;
    const label = els.strategyRelationInput.value.trim() || "促進";
    if (!source || !target) {
      showToast("請選擇連線的起點與終點");
      return;
    }
    if (source === target) {
      showToast("起點與終點不能相同");
      return;
    }
    if (map.edges.some(edge => edge.source === source && edge.target === target)) {
      showToast("這兩個目標已經有連線");
      return;
    }
    captureSnapshot(note, "策略地圖變更", true);
    map.edges.push({ id: uid(), source, target, label });
    note.strategyMap = map;
    note.updatedAt = new Date().toISOString();
    await queuePersist();
    buildStrategyMap();
    showToast("因果連線已建立");
  }

  async function deleteStrategyConnection(edgeId) {
    const note = currentNote();
    const map = ensureCurrentStrategyMap();
    if (!note || !map) return;
    const edge = map.edges.find(item => item.id === edgeId);
    if (!edge) return;
    captureSnapshot(note, "策略地圖變更", true);
    map.edges = map.edges.filter(item => item.id !== edgeId);
    note.strategyMap = map;
    note.updatedAt = new Date().toISOString();
    await queuePersist();
    buildStrategyMap();
    showToast("連線已移除");
  }

  async function loadStrategyTemplate() {
    const note = currentNote();
    const map = ensureCurrentStrategyMap();
    if (!note || !map) return;
    if ((map.nodes.length || map.edges.length) && !confirm("目前已有策略內容。要加入示範目標，而不是取代現有內容嗎？")) return;
    captureSnapshot(note, "載入策略地圖範例", true);
    const ids = {};
    const examples = [
      ["learning", "提升 AI 與語言科技能力", "每月完成 2 個功能模組", "capability"],
      ["learning", "建立高品質學習資料", "每月整理 100 筆語言資料", "data"],
      ["process", "提升 AI 回饋準確度", "建議正確率達 90%", "feedback"],
      ["process", "完善筆記與備份流程", "資料遺失率低於 1%", "backup"],
      ["customer", "提高學習者滿意度", "滿意度達 4.5／5", "satisfaction"],
      ["customer", "提高持續學習率", "30 日留存率達 60%", "retention"],
      ["financial", "提升整體學習成效", "測驗平均進步 20%", "outcome"],
      ["financial", "擴大平台使用規模", "月活躍使用者達 1,000 人", "growth"]
    ];
    for (const [perspective, text, kpi, key] of examples) {
      const node = { id: uid(), perspective, text, kpi, createdAt: new Date().toISOString() };
      ids[key] = node.id;
      map.nodes.push(node);
    }
    const edgeData = [
      ["capability", "feedback", "支援"],
      ["data", "feedback", "提升"],
      ["data", "backup", "支援"],
      ["feedback", "satisfaction", "提升"],
      ["feedback", "retention", "促進"],
      ["backup", "satisfaction", "建立信任"],
      ["satisfaction", "growth", "帶動"],
      ["retention", "outcome", "促進"],
      ["outcome", "growth", "支援"]
    ];
    edgeData.forEach(([source, target, label]) => map.edges.push({ id: uid(), source: ids[source], target: ids[target], label }));
    note.strategyMap = map;
    note.updatedAt = new Date().toISOString();
    await queuePersist();
    buildStrategyMap();
    showToast("策略地圖範例已載入");
  }

  async function clearStrategyMap() {
    const note = currentNote();
    const map = ensureCurrentStrategyMap();
    if (!note || !map || (!map.nodes.length && !map.edges.length)) return;
    if (!confirm("確定清空目前筆記的所有策略目標與連線？可從版本紀錄復原。")) return;
    captureSnapshot(note, "清空策略地圖", true);
    map.nodes = [];
    map.edges = [];
    strategySelectedId = null;
    note.strategyMap = map;
    note.updatedAt = new Date().toISOString();
    await queuePersist();
    buildStrategyMap();
    showToast("策略地圖已清空");
  }

  async function renameStrategyPerspectives() {
    const note = currentNote();
    const map = ensureCurrentStrategyMap();
    if (!note || !map) return;
    const nextLabels = [];
    for (const perspective of map.perspectives) {
      const label = prompt(`重新命名構面「${perspective.label}」`, perspective.label);
      if (label === null) return;
      nextLabels.push(label.trim() || perspective.label);
    }
    captureSnapshot(note, "策略地圖變更", true);
    map.perspectives.forEach((perspective, index) => { perspective.label = nextLabels[index]; });
    note.strategyMap = map;
    note.updatedAt = new Date().toISOString();
    await queuePersist();
    buildStrategyMap();
  }

  function renderTrash() {
    els.trashList.innerHTML = "";
    els.trashCount.textContent = `${state.trash.length} 篇筆記`;
    els.emptyTrashBtn.disabled = !state.trash.length;
    if (!state.trash.length) {
      els.trashList.innerHTML = '<p class="muted">垃圾桶是空的。</p>';
      return;
    }
    const sorted = [...state.trash].sort((a, b) => new Date(b.deletedAt) - new Date(a.deletedAt));
    for (const note of sorted) {
      const item = document.createElement("div");
      item.className = "trash-item";
      item.innerHTML = `
        <div>
          <h3>${escapeHtml(note.title)}</h3>
          <p>刪除於 ${formatDate(note.deletedAt, true)} · ${escapeHtml(stripMarkdown(note.content).slice(0, 80))}</p>
        </div>
        <div class="item-actions">
          <button class="secondary-btn restore-btn">復原</button>
          <button class="secondary-btn danger-text permanent-btn">永久刪除</button>
        </div>`;
      item.querySelector(".restore-btn").addEventListener("click", () => restoreFromTrash(note.id));
      item.querySelector(".permanent-btn").addEventListener("click", () => permanentlyDelete(note.id));
      els.trashList.appendChild(item);
    }
  }

  function renderHistory() {
    const note = currentNote();
    els.historyList.innerHTML = "";
    if (!note) return;
    const versions = state.snapshots[note.id] || [];
    if (!versions.length) {
      els.historyList.innerHTML = '<p class="muted">目前尚無可復原版本。編輯或修改策略地圖後會自動建立。</p>';
      return;
    }
    for (const version of versions) {
      const item = document.createElement("div");
      item.className = "history-item";
      item.innerHTML = `
        <div>
          <h3>${escapeHtml(version.title)}</h3>
          <p>${formatDate(version.timestamp, true)} · ${escapeHtml(version.reason)} · ${escapeHtml(stripMarkdown(version.content).slice(0, 70))}</p>
        </div>
        <div class="item-actions">
          <button class="secondary-btn restore-version-btn">還原此版本</button>
        </div>`;
      item.querySelector(".restore-version-btn").addEventListener("click", () => restoreSnapshot(version.id));
      els.historyList.appendChild(item);
    }
  }

  async function restoreSnapshot(snapshotId) {
    const note = currentNote();
    if (!note) return;
    const version = (state.snapshots[note.id] || []).find(item => item.id === snapshotId);
    if (!version || !confirm(`還原到 ${formatDate(version.timestamp, true)} 的版本？目前版本也會先保存。`)) return;
    captureSnapshot(note, "還原前版本", true);
    note.title = version.title;
    note.content = version.content;
    note.strategyMap = normalizeStrategyMap(version.strategyMap);
    note.updatedAt = new Date().toISOString();
    await queuePersist();
    renderAll();
    renderHistory();
    showToast("版本已還原");
  }

  function mergeStrategyMaps(target, incoming) {
    const result = normalizeStrategyMap(target);
    const source = normalizeStrategyMap(incoming);
    const perspectiveMap = new Map();
    for (const sourcePerspective of source.perspectives) {
      const existing = result.perspectives.find(item => item.label.trim().toLowerCase() === sourcePerspective.label.trim().toLowerCase());
      perspectiveMap.set(sourcePerspective.id, existing?.id || result.perspectives[result.perspectives.length - 1].id);
    }
    const nodeIdMap = new Map();
    for (const sourceNode of source.nodes) {
      const mappedPerspective = perspectiveMap.get(sourceNode.perspective) || result.perspectives[result.perspectives.length - 1].id;
      const existing = result.nodes.find(node =>
        node.perspective === mappedPerspective &&
        node.text.trim().toLowerCase() === sourceNode.text.trim().toLowerCase()
      );
      if (existing) {
        nodeIdMap.set(sourceNode.id, existing.id);
        if (!existing.kpi && sourceNode.kpi) existing.kpi = sourceNode.kpi;
      } else {
        const newNode = { ...sourceNode, id: uid(), perspective: mappedPerspective };
        result.nodes.push(newNode);
        nodeIdMap.set(sourceNode.id, newNode.id);
      }
    }
    for (const edge of source.edges) {
      const sourceId = nodeIdMap.get(edge.source);
      const targetId = nodeIdMap.get(edge.target);
      if (!sourceId || !targetId || sourceId === targetId) continue;
      if (!result.edges.some(item => item.source === sourceId && item.target === targetId)) {
        result.edges.push({ id: uid(), source: sourceId, target: targetId, label: edge.label || "促進" });
      }
    }
    return result;
  }

  function mergeNoteInto(existing, incoming) {
    captureSnapshot(existing, "匯入前版本", true);
    existing.pinned = existing.pinned || incoming.pinned;
    existing.createdAt = new Date(existing.createdAt) < new Date(incoming.createdAt) ? existing.createdAt : incoming.createdAt;
    const existingContent = existing.content.trim();
    const incomingContent = incoming.content.trim();
    if (incomingContent && existingContent !== incomingContent) {
      if (!existingContent) existing.content = incoming.content;
      else if (incomingContent.includes(existingContent)) existing.content = incoming.content;
      else if (!existingContent.includes(incomingContent)) {
        const importedDate = new Date(incoming.updatedAt || Date.now()).toISOString().slice(0, 10);
        existing.content = `${existing.content.trimEnd()}\n\n---\n\n## 匯入合併內容（${importedDate}）\n\n${incoming.content.trimStart()}`;
      }
    }
    existing.strategyMap = mergeStrategyMaps(existing.strategyMap, incoming.strategyMap);
    existing.updatedAt = new Date().toISOString();
  }

  async function importBackup(file) {
    try {
      const data = JSON.parse(await file.text());
      const incomingRaw = Array.isArray(data) ? data : data.notes;
      if (!Array.isArray(incomingRaw)) throw new Error("找不到 notes 陣列");
      const incomingNotes = incomingRaw.map(normalizeNote);
      const mergeMatches = incomingNotes.filter(incoming =>
        state.notes.some(note => note.id === incoming.id || note.title.trim().toLowerCase() === incoming.title.trim().toLowerCase())
      ).length;
      const newCount = incomingNotes.length - mergeMatches;
      const approved = confirm(`將合併匯入 ${incomingNotes.length} 篇筆記：\n• 新增 ${newCount} 篇\n• 同名或同 ID 合併 ${mergeMatches} 篇\n\n現有筆記不會被整批覆蓋。是否繼續？`);
      if (!approved) return;

      let added = 0;
      let merged = 0;
      for (const incoming of incomingNotes) {
        const existing = state.notes.find(note => note.id === incoming.id)
          || state.notes.find(note => note.title.trim().toLowerCase() === incoming.title.trim().toLowerCase());
        if (existing) {
          mergeNoteInto(existing, incoming);
          merged += 1;
        } else {
          if (state.notes.some(note => note.id === incoming.id) || state.trash.some(note => note.id === incoming.id)) incoming.id = uid();
          state.notes.push(incoming);
          added += 1;
        }
      }

      if (!Array.isArray(data) && Array.isArray(data.trash)) {
        for (const trashNote of data.trash.map(item => ({ ...normalizeNote(item), deletedAt: item.deletedAt || new Date().toISOString() }))) {
          if (!state.trash.some(item => item.id === trashNote.id) && !state.notes.some(item => item.id === trashNote.id)) state.trash.push(trashNote);
        }
      }

      if (!Array.isArray(data) && data.snapshots && typeof data.snapshots === "object") {
        for (const [noteId, versions] of Object.entries(data.snapshots)) {
          if (!Array.isArray(versions)) continue;
          const existingVersions = state.snapshots[noteId] || [];
          for (const rawVersion of versions) {
            const version = normalizeSnapshot(rawVersion);
            if (!existingVersions.some(item => item.title === version.title && item.content === version.content && JSON.stringify(item.strategyMap) === JSON.stringify(version.strategyMap))) {
              existingVersions.push(version);
            }
          }
          state.snapshots[noteId] = existingVersions
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
            .slice(0, MAX_HISTORY);
        }
      }

      if (!currentId && state.notes[0]) currentId = state.notes[0].id;
      await queuePersist();
      renderAll();
      closeModals();
      showToast(`匯入完成：新增 ${added} 篇，合併 ${merged} 篇`);
    } catch (error) {
      alert(`無法匯入：${error.message}`);
    } finally {
      els.importInput.value = "";
    }
  }

  async function exportBackup() {
    await saveEditorNow("備份前版本");
    const backup = {
      app: "LinkNote",
      version: 2,
      exportedAt: new Date().toISOString(),
      notes: state.notes,
      trash: state.trash,
      snapshots: state.snapshots,
      settings: { ...state.settings, lastBackupAt: undefined }
    };
    downloadFile(
      `LinkNote-backup-${new Date().toISOString().slice(0, 10)}.json`,
      JSON.stringify(backup, null, 2),
      "application/json;charset=utf-8"
    );
    state.settings.lastBackupAt = new Date().toISOString();
    await queuePersist();
    await renderStorageStatus();
    showToast("完整備份已匯出");
  }

  function renderBackupWarning() {
    const last = state.settings.lastBackupAt ? new Date(state.settings.lastBackupAt) : null;
    const stale = !last || (Date.now() - last.getTime()) > BACKUP_REMINDER_DAYS * 24 * 60 * 60 * 1000;
    els.backupWarning.classList.toggle("hidden", !stale || !state.notes.length);
  }

  async function renderStorageStatus() {
    let status = storage.backend === "fallback" ? "localStorage 備援模式" : "IndexedDB 已啟用";
    try {
      const persisted = navigator.storage?.persisted ? await navigator.storage.persisted() : false;
      state.settings.persistentGranted = persisted;
      if (navigator.storage?.estimate) {
        const estimate = await navigator.storage.estimate();
        const usage = estimate.usage ? (estimate.usage / 1024 / 1024).toFixed(1) : "0";
        const quota = estimate.quota ? (estimate.quota / 1024 / 1024).toFixed(0) : "未知";
        status = `${storage.backend === "fallback" ? "備援儲存" : (persisted ? "持久儲存已啟用" : "一般儲存")} · ${usage} MB / ${quota} MB`;
      } else status = persisted ? "持久儲存已啟用" : "一般儲存";
    } catch (error) {
      status = "無法取得瀏覽器儲存資訊";
    }
    els.storageStatus.textContent = status;
    els.lastBackupStatus.textContent = state.settings.lastBackupAt
      ? formatDate(state.settings.lastBackupAt, true)
      : "尚未建立外部備份";
  }

  async function requestPersistentStorage() {
    if (!navigator.storage?.persist) {
      showToast("此瀏覽器不支援持久儲存要求");
      return;
    }
    const granted = await navigator.storage.persist();
    state.settings.persistentGranted = granted;
    await queuePersist();
    await renderStorageStatus();
    showToast(granted ? "已取得持久儲存權限" : "瀏覽器未授予持久儲存權限");
  }

  async function togglePin() {
    const note = currentNote();
    if (!note) return;
    captureSnapshot(note, "置頂狀態變更", true);
    note.pinned = !note.pinned;
    note.updatedAt = new Date().toISOString();
    await queuePersist();
    renderAll();
  }

  function flushEditorToFallbackSync() {
    const note = currentNote();
    if (!note) return;
    const nextTitle = els.titleInput.value.trim() || note.title || "未命名筆記";
    const nextContent = els.contentInput.value;
    if (note.title !== nextTitle || note.content !== nextContent) {
      note.title = nextTitle;
      note.content = nextContent;
      note.updatedAt = new Date().toISOString();
      state.updatedAt = new Date().toISOString();
    }
    storage.writeFallback(state);
  }

  function bindEvents() {
    els.menuBtn.addEventListener("click", openSidebar);
    els.overlay.addEventListener("click", closeSidebar);
    els.newNoteBtn.addEventListener("click", () => createNote());
    els.emptyNewBtn.addEventListener("click", () => createNote());
    els.searchInput.addEventListener("input", renderNoteList);
    els.titleInput.addEventListener("input", scheduleSave);
    els.contentInput.addEventListener("input", scheduleSave);
    els.deleteBtn.addEventListener("click", deleteCurrent);
    els.pinBtn.addEventListener("click", togglePin);
    els.historyBtn.addEventListener("click", async () => {
      await saveEditorNow();
      renderHistory();
      openModal(els.historyModal);
    });
    $$(".mode-tab").forEach(tab => tab.addEventListener("click", () => setMode(tab.dataset.mode)));

    els.graphBtn.addEventListener("click", async () => {
      await saveEditorNow();
      openModal(els.graphModal);
      requestAnimationFrame(buildKnowledgeGraph);
    });
    els.mindMapBtn.addEventListener("click", async () => {
      await saveEditorNow();
      mindZoom = 1;
      openModal(els.mindMapModal);
      requestAnimationFrame(buildMindMap);
    });
    els.flowBtn.addEventListener("click", async () => {
      await saveEditorNow();
      openModal(els.flowModal);
      requestAnimationFrame(buildFlowChart);
    });
    els.treeBtn.addEventListener("click", async () => {
      await saveEditorNow();
      treeCollapsedIds.clear();
      openModal(els.treeModal);
      requestAnimationFrame(buildTreeDiagram);
    });
    els.strategyBtn.addEventListener("click", async () => {
      await saveEditorNow();
      strategySelectedId = null;
      openModal(els.strategyModal);
      requestAnimationFrame(buildStrategyMap);
    });
    els.trashBtn.addEventListener("click", () => {
      renderTrash();
      openModal(els.trashModal);
    });
    els.settingsBtn.addEventListener("click", async () => {
      await renderStorageStatus();
      openModal(els.settingsModal);
    });

    $$(".close-modal").forEach(button => button.addEventListener("click", closeModals));
    $$(".modal").forEach(modal => {
      modal.addEventListener("click", event => {
        if (event.target === modal) closeModals();
      });
    });

    els.graphExportBtn.addEventListener("click", () => exportSvgFrom(els.graphContainer, `${safeFilename(currentNote()?.title)}-知識圖譜.svg`));
    els.mindExportBtn.addEventListener("click", () => exportSvgFrom(els.mindMapContainer, `${safeFilename(currentNote()?.title)}-心智圖.svg`));
    els.flowExportBtn.addEventListener("click", () => exportSvgFrom(els.flowContainer, `${safeFilename(currentNote()?.title)}-流程圖.svg`));
    els.treeExportBtn.addEventListener("click", () => exportSvgFrom(els.treeContainer, `${safeFilename(currentNote()?.title)}-樹狀圖.svg`));
    els.mindZoomOutBtn.addEventListener("click", () => { mindZoom = Math.max(.45, mindZoom - .15); buildMindMap(); });
    els.mindZoomResetBtn.addEventListener("click", () => { mindZoom = 1; buildMindMap(); });
    els.mindZoomInBtn.addEventListener("click", () => { mindZoom = Math.min(2.5, mindZoom + .15); buildMindMap(); });
    els.treeCollapseBtn.addEventListener("click", collapseTreeToTwoLevels);
    els.treeExpandBtn.addEventListener("click", () => { treeCollapsedIds.clear(); buildTreeDiagram(); });

    els.strategyAddBtn.addEventListener("click", addStrategyObjective);
    [els.strategyObjectiveInput, els.strategyKpiInput].forEach(input => input.addEventListener("keydown", event => {
      if (event.key === "Enter") addStrategyObjective();
    }));
    els.strategyTemplateBtn.addEventListener("click", loadStrategyTemplate);
    els.strategySaveBtn.addEventListener("click", saveSelectedStrategyNode);
    els.strategyDeleteBtn.addEventListener("click", deleteSelectedStrategyNode);
    els.strategyConnectBtn.addEventListener("click", addStrategyConnection);
    els.strategyRenameBtn.addEventListener("click", renameStrategyPerspectives);
    els.strategyClearBtn.addEventListener("click", clearStrategyMap);
    els.strategyExportBtn.addEventListener("click", () => exportSvgFrom(els.strategyContainer, `${safeFilename(currentNote()?.title)}-策略地圖.svg`));

    els.emptyTrashBtn.addEventListener("click", emptyTrash);
    els.exportBtn.addEventListener("click", exportBackup);
    els.warningExportBtn.addEventListener("click", exportBackup);
    els.persistentBtn.addEventListener("click", requestPersistentStorage);
    els.importInput.addEventListener("change", event => {
      const file = event.target.files?.[0];
      if (file) importBackup(file);
    });
    els.exportMdBtn.addEventListener("click", async () => {
      await saveEditorNow();
      const note = currentNote();
      if (!note) return;
      downloadFile(`${safeFilename(note.title)}.md`, note.content, "text/markdown;charset=utf-8");
      showToast("Markdown 已匯出");
    });
    els.installHelpBtn.addEventListener("click", () => els.installHelp.classList.toggle("hidden"));

    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") saveEditorNow();
    });
    window.addEventListener("resize", () => {
      if (!els.graphModal.classList.contains("hidden")) buildKnowledgeGraph();
      if (!els.mindMapModal.classList.contains("hidden")) buildMindMap();
      if (!els.flowModal.classList.contains("hidden")) buildFlowChart();
      if (!els.treeModal.classList.contains("hidden")) buildTreeDiagram();
      if (!els.strategyModal.classList.contains("hidden")) buildStrategyMap();
    });
    window.addEventListener("pagehide", flushEditorToFallbackSync);
    window.addEventListener("beforeunload", flushEditorToFallbackSync);
  }

  async function init() {
    state = await storage.load();
    const savedCurrent = localStorage.getItem(CURRENT_KEY);
    currentId = state.notes.some(note => note.id === savedCurrent) ? savedCurrent : state.notes[0]?.id || null;
    if (currentId) localStorage.setItem(CURRENT_KEY, currentId);
    bindEvents();
    renderAll();
    await renderStorageStatus();

    if (state.settings.migratedFromV1) {
      state.settings.migratedFromV1 = false;
      await queuePersist();
      showToast("舊版筆記已搬移到 IndexedDB");
    }

    if ("serviceWorker" in navigator && location.protocol !== "file:") {
      window.addEventListener("load", () => {
        navigator.serviceWorker.register("./sw.js").catch(error => console.warn("Service Worker 註冊失敗", error));
      });
    }
  }

  init().catch(error => {
    console.error(error);
    alert(`LinkNote 啟動失敗：${error.message}`);
  });
})();
