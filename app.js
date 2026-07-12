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
    strategyBtn: $("#strategyBtn"),
    trashBtn: $("#trashBtn"),
    settingsBtn: $("#settingsBtn"),
    graphModal: $("#graphModal"),
    mindMapModal: $("#mindMapModal"),
    strategyModal: $("#strategyModal"),
    trashModal: $("#trashModal"),
    historyModal: $("#historyModal"),
    settingsModal: $("#settingsModal"),
    graphContainer: $("#graphContainer"),
    mindMapContainer: $("#mindMapContainer"),
    strategyContainer: $("#strategyContainer"),
    graphExportBtn: $("#graphExportBtn"),
    mindExportBtn: $("#mindExportBtn"),
    mindZoomOutBtn: $("#mindZoomOutBtn"),
    mindZoomResetBtn: $("#mindZoomResetBtn"),
    mindZoomInBtn: $("#mindZoomInBtn"),
    strategyPerspectiveSelect: $("#strategyPerspectiveSelect"),
    strategyObjectiveInput: $("#strategyObjectiveInput"),
    strategyAddBtn: $("#strategyAddBtn"),
    strategyLinkBtn: $("#strategyLinkBtn"),
    strategyEditBtn: $("#strategyEditBtn"),
    strategyDeleteBtn: $("#strategyDeleteBtn"),
    strategyRenameBtn: $("#strategyRenameBtn"),
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
  let strategySelectedId = null;
  let strategyLinkMode = false;
  let strategyLinkSourceId = null;

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
      { id: "financial", label: "成果／財務" },
      { id: "customer", label: "學習者／利害關係人" },
      { id: "process", label: "內部流程" },
      { id: "learning", label: "學習與成長" }
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
          label: String(p.label || `構面 ${index + 1}`).slice(0, 40)
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
            target: String(edge.target || "")
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
    modal.classList.remove("hidden");
  }

  function closeModals() {
    $$(".modal").forEach(modal => modal.classList.add("hidden"));
    strategyLinkMode = false;
    strategyLinkSourceId = null;
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
      .graph-edge,.mind-edge { stroke:#a0a0a0; }
      .graph-node circle,.mind-node rect,.strategy-node rect { fill:#ffffff; stroke:#6f5cc2; }
      .graph-node text,.mind-node text,.strategy-node text { fill:#202020; }
      .mind-node.root rect { fill:#6f5cc2; }
      .mind-node.root text { fill:#ffffff; }
      .strategy-lane { fill:#fafafa; stroke:#d8d8d8; }
      .strategy-edge { fill:none; stroke:#6f5cc2; stroke-width:2; }
    `;
    clone.insertBefore(style, clone.firstChild);
    const xml = new XMLSerializer().serializeToString(clone);
    downloadFile(filename, `<?xml version="1.0" encoding="UTF-8"?>\n${xml}`, "image/svg+xml;charset=utf-8");
  }

  function buildKnowledgeGraph() {
    const notes = state.notes;
    const width = Math.max(820, els.graphContainer.clientWidth || 820);
    const height = 590;
    const centerX = width / 2;
    const centerY = height / 2;
    const positions = new Map();
    const active = currentNote();
    const others = active ? notes.filter(note => note.id !== active.id) : notes;

    if (active) positions.set(active.id, { x: centerX, y: centerY });
    const ringCount = Math.max(1, others.length);
    const radius = Math.min(width, height) * 0.37;
    others.forEach((note, index) => {
      const angle = (Math.PI * 2 * index / ringCount) - Math.PI / 2;
      const ringOffset = Math.floor(index / 18) * 48;
      positions.set(note.id, {
        x: centerX + Math.cos(angle) * Math.max(100, radius - ringOffset),
        y: centerY + Math.sin(angle) * Math.max(100, radius - ringOffset)
      });
    });

    const edges = [];
    const edgeKeys = new Set();
    for (const source of notes) {
      for (const link of extractWikiLinks(source.content)) {
        const target = findByTitle(link.title);
        if (!target || target.id === source.id) continue;
        const key = [source.id, target.id].sort().join("|");
        if (!edgeKeys.has(key)) {
          edgeKeys.add(key);
          edges.push([source.id, target.id]);
        }
      }
    }

    const svg = document.createElementNS(SVG_NS, "svg");
    svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
    svg.setAttribute("width", width);
    svg.setAttribute("height", height);

    for (const [sourceId, targetId] of edges) {
      const a = positions.get(sourceId);
      const b = positions.get(targetId);
      if (!a || !b) continue;
      const line = document.createElementNS(SVG_NS, "line");
      line.setAttribute("x1", a.x);
      line.setAttribute("y1", a.y);
      line.setAttribute("x2", b.x);
      line.setAttribute("y2", b.y);
      line.setAttribute("class", "graph-edge");
      svg.appendChild(line);
    }

    for (const note of notes) {
      const p = positions.get(note.id) || { x: centerX, y: centerY };
      const group = document.createElementNS(SVG_NS, "g");
      group.setAttribute("class", `graph-node ${note.id === currentId ? "active" : ""}`);
      group.setAttribute("transform", `translate(${p.x}, ${p.y})`);
      const circle = document.createElementNS(SVG_NS, "circle");
      circle.setAttribute("r", Math.min(46, Math.max(29, 23 + note.title.length * 1.05)));
      const text = document.createElementNS(SVG_NS, "text");
      text.textContent = note.title.length > 12 ? `${note.title.slice(0, 11)}…` : note.title;
      group.append(circle, text);
      group.addEventListener("click", () => {
        closeModals();
        openNote(note.id);
      });
      svg.appendChild(group);
    }

    els.graphContainer.innerHTML = "";
    if (!notes.length) els.graphContainer.innerHTML = '<p class="muted" style="padding:20px">目前沒有筆記。</p>';
    else els.graphContainer.appendChild(svg);
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

  function ensureCurrentStrategyMap() {
    const note = currentNote();
    if (!note) return null;
    note.strategyMap = normalizeStrategyMap(note.strategyMap);
    return note.strategyMap;
  }

  function renderStrategyPerspectiveOptions() {
    const map = ensureCurrentStrategyMap();
    els.strategyPerspectiveSelect.innerHTML = "";
    if (!map) return;
    for (const perspective of map.perspectives) {
      const option = document.createElement("option");
      option.value = perspective.id;
      option.textContent = perspective.label;
      els.strategyPerspectiveSelect.appendChild(option);
    }
  }

  function strategyNodeLayout(map, width, height) {
    const laneTop = 24;
    const laneGap = 10;
    const laneHeight = (height - laneTop * 2 - laneGap * (map.perspectives.length - 1)) / map.perspectives.length;
    const labelWidth = 165;
    const positions = new Map();
    map.perspectives.forEach((perspective, laneIndex) => {
      const laneNodes = map.nodes.filter(node => node.perspective === perspective.id);
      const availableWidth = width - labelWidth - 40;
      laneNodes.forEach((node, index) => {
        const x = labelWidth + 20 + ((index + 0.5) * availableWidth / Math.max(laneNodes.length, 1));
        const y = laneTop + laneIndex * (laneHeight + laneGap) + laneHeight / 2;
        positions.set(node.id, { x, y, width: 190, height: 72, laneIndex });
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
    const lines = clean.length > maxChars ? [clean.slice(0, maxChars), `${clean.slice(maxChars, maxChars * 2 - 1)}${clean.length > maxChars * 2 - 1 ? "…" : ""}`] : [clean];
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

  function buildStrategyMap() {
    const note = currentNote();
    els.strategyContainer.innerHTML = "";
    if (!note) {
      els.strategyContainer.innerHTML = '<p class="muted" style="padding:20px">請先開啟一篇筆記。</p>';
      return;
    }
    const map = ensureCurrentStrategyMap();
    renderStrategyPerspectiveOptions();
    const maxLaneNodes = Math.max(1, ...map.perspectives.map(p => map.nodes.filter(n => n.perspective === p.id).length));
    const width = Math.max(980, 210 + maxLaneNodes * 220);
    const height = Math.max(620, map.perspectives.length * 145 + 45);
    const layout = strategyNodeLayout(map, width, height);
    const svg = document.createElementNS(SVG_NS, "svg");
    svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
    svg.setAttribute("width", width);
    svg.setAttribute("height", height);

    const defs = document.createElementNS(SVG_NS, "defs");
    const marker = document.createElementNS(SVG_NS, "marker");
    marker.setAttribute("id", "arrowHead");
    marker.setAttribute("markerWidth", "10");
    marker.setAttribute("markerHeight", "10");
    marker.setAttribute("refX", "8");
    marker.setAttribute("refY", "3");
    marker.setAttribute("orient", "auto");
    marker.setAttribute("markerUnits", "strokeWidth");
    const arrowPath = document.createElementNS(SVG_NS, "path");
    arrowPath.setAttribute("d", "M0,0 L0,6 L9,3 z");
    arrowPath.setAttribute("fill", "currentColor");
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
      rect.setAttribute("class", "strategy-lane");
      svg.appendChild(rect);
      const label = document.createElementNS(SVG_NS, "text");
      label.setAttribute("x", 26);
      label.setAttribute("y", y + layout.laneHeight / 2 + 5);
      label.setAttribute("class", "strategy-lane-label");
      label.textContent = perspective.label;
      svg.appendChild(label);
    });

    for (const edge of map.edges) {
      const source = layout.positions.get(edge.source);
      const target = layout.positions.get(edge.target);
      if (!source || !target) continue;
      const path = document.createElementNS(SVG_NS, "path");
      const sx = source.x;
      const sy = source.y - source.height / 2;
      const tx = target.x;
      const ty = target.y + target.height / 2;
      const midY = (sy + ty) / 2;
      path.setAttribute("d", `M ${sx} ${sy} C ${sx} ${midY}, ${tx} ${midY}, ${tx} ${ty}`);
      path.setAttribute("class", "strategy-edge");
      svg.appendChild(path);
    }

    for (const node of map.nodes) {
      const pos = layout.positions.get(node.id);
      if (!pos) continue;
      const group = document.createElementNS(SVG_NS, "g");
      const selected = strategySelectedId === node.id;
      const source = strategyLinkSourceId === node.id;
      group.setAttribute("class", `strategy-node ${selected ? "selected" : ""} ${source ? "link-source" : ""}`);
      group.setAttribute("transform", `translate(${pos.x - pos.width / 2}, ${pos.y - pos.height / 2})`);
      const rect = document.createElementNS(SVG_NS, "rect");
      rect.setAttribute("width", pos.width);
      rect.setAttribute("height", pos.height);
      group.appendChild(rect);
      createSvgText(group, pos.width / 2, 28, node.text, "objective", 18);
      if (node.kpi) createSvgText(group, pos.width / 2, 61, `KPI：${node.kpi}`, "kpi", 28);

      group.addEventListener("click", async event => {
        event.stopPropagation();
        if (strategyLinkMode) {
          if (!strategyLinkSourceId) {
            strategyLinkSourceId = node.id;
            els.strategyHint.textContent = `已選擇「${node.text}」為起點，請再點選終點。`;
          } else if (strategyLinkSourceId !== node.id) {
            const exists = map.edges.some(edge => edge.source === strategyLinkSourceId && edge.target === node.id);
            if (!exists) {
              captureSnapshot(note, "策略地圖變更", true);
              map.edges.push({ id: uid(), source: strategyLinkSourceId, target: node.id });
              note.strategyMap = map;
              note.updatedAt = new Date().toISOString();
              await queuePersist();
              showToast("因果連線已建立");
            }
            strategyLinkMode = false;
            strategyLinkSourceId = null;
            els.strategyLinkBtn.classList.remove("active");
            els.strategyHint.textContent = "點選目標可選取；雙擊或按『編輯所選』可修改目標與 KPI。";
          }
        } else {
          strategySelectedId = node.id;
        }
        buildStrategyMap();
      });
      group.addEventListener("dblclick", event => {
        event.stopPropagation();
        strategySelectedId = node.id;
        editSelectedStrategyNode();
      });
      svg.appendChild(group);
    }

    svg.addEventListener("click", () => {
      if (!strategyLinkMode) {
        strategySelectedId = null;
        buildStrategyMap();
      }
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
      return;
    }
    captureSnapshot(note, "策略地圖變更", true);
    map.nodes.push({
      id: uid(),
      perspective: els.strategyPerspectiveSelect.value || map.perspectives[map.perspectives.length - 1].id,
      text,
      kpi: "",
      createdAt: new Date().toISOString()
    });
    note.strategyMap = map;
    note.updatedAt = new Date().toISOString();
    els.strategyObjectiveInput.value = "";
    await queuePersist();
    buildStrategyMap();
  }

  async function editSelectedStrategyNode() {
    const note = currentNote();
    const map = ensureCurrentStrategyMap();
    const node = map?.nodes.find(item => item.id === strategySelectedId);
    if (!note || !node) {
      showToast("請先選擇一個目標");
      return;
    }
    const text = prompt("策略目標名稱", node.text);
    if (text === null) return;
    const kpi = prompt("KPI／衡量方式（可留空）", node.kpi || "");
    if (kpi === null) return;
    captureSnapshot(note, "策略地圖變更", true);
    node.text = text.trim() || node.text;
    node.kpi = kpi.trim();
    note.strategyMap = map;
    note.updatedAt = new Date().toISOString();
    await queuePersist();
    buildStrategyMap();
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
        result.edges.push({ id: uid(), source: sourceId, target: targetId });
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
    els.strategyBtn.addEventListener("click", async () => {
      await saveEditorNow();
      strategySelectedId = null;
      strategyLinkMode = false;
      strategyLinkSourceId = null;
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

    els.graphExportBtn.addEventListener("click", () => exportSvgFrom(els.graphContainer, "LinkNote-知識圖譜.svg"));
    els.mindExportBtn.addEventListener("click", () => exportSvgFrom(els.mindMapContainer, `${safeFilename(currentNote()?.title)}-心智圖.svg`));
    els.mindZoomOutBtn.addEventListener("click", () => { mindZoom = Math.max(.45, mindZoom - .15); buildMindMap(); });
    els.mindZoomResetBtn.addEventListener("click", () => { mindZoom = 1; buildMindMap(); });
    els.mindZoomInBtn.addEventListener("click", () => { mindZoom = Math.min(2.5, mindZoom + .15); buildMindMap(); });

    els.strategyAddBtn.addEventListener("click", addStrategyObjective);
    els.strategyObjectiveInput.addEventListener("keydown", event => {
      if (event.key === "Enter") addStrategyObjective();
    });
    els.strategyLinkBtn.addEventListener("click", () => {
      strategyLinkMode = !strategyLinkMode;
      strategyLinkSourceId = null;
      els.strategyLinkBtn.classList.toggle("active", strategyLinkMode);
      els.strategyHint.textContent = strategyLinkMode
        ? "連線模式：先點選起點，再點選終點。"
        : "點選目標可選取；雙擊或按『編輯所選』可修改目標與 KPI。";
      buildStrategyMap();
    });
    els.strategyEditBtn.addEventListener("click", editSelectedStrategyNode);
    els.strategyDeleteBtn.addEventListener("click", deleteSelectedStrategyNode);
    els.strategyRenameBtn.addEventListener("click", renameStrategyPerspectives);
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
