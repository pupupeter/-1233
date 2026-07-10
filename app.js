(() => {
  "use strict";

  const STORAGE_KEY = "linknote.notes.v1";
  const CURRENT_KEY = "linknote.current.v1";

  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => [...document.querySelectorAll(selector)];

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
    graphBtn: $("#graphBtn"),
    settingsBtn: $("#settingsBtn"),
    graphModal: $("#graphModal"),
    settingsModal: $("#settingsModal"),
    graphContainer: $("#graphContainer"),
    exportBtn: $("#exportBtn"),
    exportMdBtn: $("#exportMdBtn"),
    importInput: $("#importInput"),
    installHelpBtn: $("#installHelpBtn"),
    installHelp: $("#installHelp"),
    toast: $("#toast")
  };

  let notes = loadNotes();
  let currentId = localStorage.getItem(CURRENT_KEY) || notes[0]?.id || null;
  let saveTimer = null;

  function uid() {
    return crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  function loadNotes() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (error) {
      console.error("讀取筆記失敗", error);
    }
    const now = new Date().toISOString();
    return [
      {
        id: uid(),
        title: "歡迎使用 LinkNote",
        content: `# 歡迎使用 LinkNote

這是一個適合 iPhone 的離線筆記 App。

## 快速開始

- 使用 **Markdown** 撰寫內容
- 輸入 [[另一篇筆記]] 建立雙向連結
- 使用 #開始 與 #教學 建立標籤
- 到右上角開啟關聯圖譜

你也可以建立 [[我的第一篇筆記]]。`,
        pinned: true,
        createdAt: now,
        updatedAt: now
      }
    ];
  }

  function persist() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
    if (currentId) localStorage.setItem(CURRENT_KEY, currentId);
    els.saveStatus.textContent = "已儲存";
  }

  function scheduleSave() {
    els.saveStatus.textContent = "儲存中…";
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      const note = currentNote();
      if (!note) return;
      note.title = els.titleInput.value.trim() || "未命名筆記";
      note.content = els.contentInput.value;
      note.updatedAt = new Date().toISOString();
      persist();
      renderAll();
    }, 350);
  }

  function currentNote() {
    return notes.find(n => n.id === currentId) || null;
  }

  function formatDate(iso) {
    const date = new Date(iso);
    return new Intl.DateTimeFormat("zh-TW", {
      month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit"
    }).format(date);
  }

  function stripMarkdown(text) {
    return text
      .replace(/```[\s\S]*?```/g, " ")
      .replace(/`([^`]+)`/g, "$1")
      .replace(/\[\[([^\]]+)\]\]/g, "$1")
      .replace(/[#>*_\-\[\]()]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function extractWikiLinks(text) {
    const found = [];
    const regex = /\[\[([^\]|#]+)(?:#[^\]|]+)?(?:\|[^\]]+)?\]\]/g;
    let match;
    while ((match = regex.exec(text)) !== null) {
      const title = match[1].trim();
      if (title && !found.some(v => v.toLowerCase() === title.toLowerCase())) found.push(title);
    }
    return found;
  }

  function extractTags(text) {
    const found = [];
    const regex = /(^|\s)#([\p{L}\p{N}_\-/]+)/gu;
    let match;
    while ((match = regex.exec(text)) !== null) {
      const tag = match[2];
      if (!found.some(v => v.toLowerCase() === tag.toLowerCase())) found.push(tag);
    }
    return found;
  }

  function findByTitle(title) {
    return notes.find(n => n.title.trim().toLowerCase() === title.trim().toLowerCase());
  }

  function createNote(title = "未命名筆記", content = "") {
    const now = new Date().toISOString();
    const note = { id: uid(), title, content, pinned: false, createdAt: now, updatedAt: now };
    notes.unshift(note);
    currentId = note.id;
    persist();
    renderAll();
    closeSidebar();
    setTimeout(() => {
      els.titleInput.focus();
      els.titleInput.select();
    }, 0);
    return note;
  }

  function deleteCurrent() {
    const note = currentNote();
    if (!note) return;
    if (!confirm(`確定刪除「${note.title}」？`)) return;
    notes = notes.filter(n => n.id !== note.id);
    currentId = notes[0]?.id || null;
    persist();
    renderAll();
    toast("筆記已刪除");
  }

  function openNote(id) {
    const note = notes.find(n => n.id === id);
    if (!note) return;
    currentId = id;
    localStorage.setItem(CURRENT_KEY, id);
    renderAll();
    closeSidebar();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function openOrCreateLinked(title) {
    const existing = findByTitle(title);
    if (existing) {
      openNote(existing.id);
    } else {
      createNote(title, `# ${title}\n\n`);
      toast(`已建立「${title}」`);
    }
  }

  function renderAll() {
    renderNoteList();
    renderEditor();
  }

  function renderNoteList() {
    const query = els.searchInput.value.trim().toLowerCase();
    const sorted = [...notes].sort((a, b) => {
      if (a.pinned !== b.pinned) return Number(b.pinned) - Number(a.pinned);
      return new Date(b.updatedAt) - new Date(a.updatedAt);
    });
    const filtered = sorted.filter(n =>
      !query ||
      n.title.toLowerCase().includes(query) ||
      n.content.toLowerCase().includes(query) ||
      extractTags(n.content).some(t => t.toLowerCase().includes(query.replace(/^#/, "")))
    );

    els.noteList.innerHTML = "";
    if (!filtered.length) {
      els.noteList.innerHTML = `<div class="muted" style="padding:18px 12px">找不到符合的筆記</div>`;
      return;
    }

    filtered.forEach(note => {
      const button = document.createElement("button");
      button.className = `note-item ${note.id === currentId ? "active" : ""}`;
      button.innerHTML = `
        <div class="note-item-title">
          <span>${escapeHtml(note.title)}</span>
          ${note.pinned ? '<span class="pin-mark">★</span>' : ""}
        </div>
        <div class="note-item-snippet">${escapeHtml(stripMarkdown(note.content) || "沒有內容")}</div>
        <div class="note-item-date">${formatDate(note.updatedAt)}</div>
      `;
      button.addEventListener("click", () => openNote(note.id));
      els.noteList.appendChild(button);
    });
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
    els.previewPane.innerHTML = markdownToHtml(note.content);
    bindWikiLinks();
    renderTags(note);
    renderBacklinks(note);
  }

  function renderTags(note) {
    const tags = extractTags(note.content);
    els.tagList.innerHTML = "";
    if (!tags.length) {
      els.tagList.innerHTML = `<span class="muted">尚無標籤</span>`;
      return;
    }
    tags.forEach(tag => {
      const button = document.createElement("button");
      button.className = "chip";
      button.textContent = `#${tag}`;
      button.addEventListener("click", () => {
        els.searchInput.value = `#${tag}`;
        renderNoteList();
        openSidebar();
      });
      els.tagList.appendChild(button);
    });
  }

  function renderBacklinks(note) {
    const incoming = notes.filter(other =>
      other.id !== note.id &&
      extractWikiLinks(other.content).some(title => title.toLowerCase() === note.title.toLowerCase())
    );
    els.backlinks.innerHTML = "";
    if (!incoming.length) {
      els.backlinks.innerHTML = `<span class="muted">目前沒有其他筆記連到這裡</span>`;
      return;
    }
    incoming.forEach(source => {
      const button = document.createElement("button");
      button.className = "backlink-btn";
      button.textContent = `↗ ${source.title}`;
      button.addEventListener("click", () => openNote(source.id));
      els.backlinks.appendChild(button);
    });
  }

  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function inlineMarkdown(text) {
    let result = escapeHtml(text);
    result = result.replace(/`([^`]+)`/g, "<code>$1</code>");
    result = result.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
    result = result.replace(/__([^_]+)__/g, "<strong>$1</strong>");
    result = result.replace(/(^|[^*])\*([^*]+)\*/g, "$1<em>$2</em>");
    result = result.replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (_, target, label) => {
      return `<a class="wikilink" data-target="${encodeURIComponent(target.trim())}">${escapeHtml((label || target).trim())}</a>`;
    });
    result = result.replace(/(^|\s)#([\p{L}\p{N}_\-/]+)/gu, '$1<span class="tag">#$2</span>');
    result = result.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
    return result;
  }

  function markdownToHtml(markdown) {
    const lines = markdown.replace(/\r\n?/g, "\n").split("\n");
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
      if (!line.trim()) {
        out.push("<br>");
      } else {
        out.push(`<p>${inlineMarkdown(line)}</p>`);
      }
    }
    closeList();
    if (inCode) out.push(`<pre><code>${escapeHtml(code.join("\n"))}</code></pre>`);
    return out.join("\n");
  }

  function bindWikiLinks() {
    $$("#previewPane .wikilink").forEach(link => {
      link.addEventListener("click", () => openOrCreateLinked(decodeURIComponent(link.dataset.target)));
    });
  }

  function setMode(mode) {
    $$(".mode-tab").forEach(tab => tab.classList.toggle("active", tab.dataset.mode === mode));
    els.editPane.classList.toggle("hidden", mode !== "edit");
    els.previewPane.classList.toggle("hidden", mode !== "preview");
    if (mode === "preview") {
      const note = currentNote();
      if (note) {
        note.title = els.titleInput.value.trim() || "未命名筆記";
        note.content = els.contentInput.value;
        note.updatedAt = new Date().toISOString();
        persist();
        renderEditor();
      }
    }
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
    els.graphModal.classList.add("hidden");
    els.settingsModal.classList.add("hidden");
  }

  function buildGraph() {
    const width = Math.max(720, els.graphContainer.clientWidth || 720);
    const height = 560;
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(width, height) * 0.36;
    const positions = new Map();

    notes.forEach((note, index) => {
      const angle = (Math.PI * 2 * index / Math.max(notes.length, 1)) - Math.PI / 2;
      const wobble = (index % 3) * 12;
      positions.set(note.id, {
        x: notes.length === 1 ? centerX : centerX + Math.cos(angle) * (radius - wobble),
        y: notes.length === 1 ? centerY : centerY + Math.sin(angle) * (radius - wobble)
      });
    });

    const edges = [];
    notes.forEach(source => {
      extractWikiLinks(source.content).forEach(title => {
        const target = findByTitle(title);
        if (target && target.id !== source.id) edges.push([source.id, target.id]);
      });
    });

    const svgNS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(svgNS, "svg");
    svg.setAttribute("viewBox", `0 0 ${width} ${height}`);

    edges.forEach(([sourceId, targetId]) => {
      const a = positions.get(sourceId);
      const b = positions.get(targetId);
      if (!a || !b) return;
      const line = document.createElementNS(svgNS, "line");
      line.setAttribute("x1", a.x);
      line.setAttribute("y1", a.y);
      line.setAttribute("x2", b.x);
      line.setAttribute("y2", b.y);
      line.setAttribute("class", "graph-edge");
      svg.appendChild(line);
    });

    notes.forEach(note => {
      const p = positions.get(note.id);
      const group = document.createElementNS(svgNS, "g");
      group.setAttribute("class", `graph-node ${note.id === currentId ? "active" : ""}`);
      group.setAttribute("transform", `translate(${p.x}, ${p.y})`);

      const circle = document.createElementNS(svgNS, "circle");
      const nodeRadius = Math.min(42, Math.max(27, 22 + note.title.length * 1.1));
      circle.setAttribute("r", nodeRadius);

      const text = document.createElementNS(svgNS, "text");
      const label = note.title.length > 10 ? `${note.title.slice(0, 9)}…` : note.title;
      text.textContent = label;

      group.appendChild(circle);
      group.appendChild(text);
      group.addEventListener("click", () => {
        closeModals();
        openNote(note.id);
      });
      svg.appendChild(group);
    });

    els.graphContainer.innerHTML = "";
    els.graphContainer.appendChild(svg);
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

  function toast(message) {
    els.toast.textContent = message;
    els.toast.classList.remove("hidden");
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => els.toast.classList.add("hidden"), 1800);
  }

  els.menuBtn.addEventListener("click", openSidebar);
  els.overlay.addEventListener("click", closeSidebar);
  els.newNoteBtn.addEventListener("click", () => createNote());
  els.emptyNewBtn.addEventListener("click", () => createNote());
  els.searchInput.addEventListener("input", renderNoteList);
  els.titleInput.addEventListener("input", scheduleSave);
  els.contentInput.addEventListener("input", scheduleSave);
  els.deleteBtn.addEventListener("click", deleteCurrent);

  els.pinBtn.addEventListener("click", () => {
    const note = currentNote();
    if (!note) return;
    note.pinned = !note.pinned;
    note.updatedAt = new Date().toISOString();
    persist();
    renderAll();
  });

  $$(".mode-tab").forEach(tab => tab.addEventListener("click", () => setMode(tab.dataset.mode)));

  els.graphBtn.addEventListener("click", () => {
    openModal(els.graphModal);
    requestAnimationFrame(buildGraph);
  });

  els.settingsBtn.addEventListener("click", () => openModal(els.settingsModal));
  $$(".close-modal").forEach(btn => btn.addEventListener("click", closeModals));
  [els.graphModal, els.settingsModal].forEach(modal => {
    modal.addEventListener("click", event => {
      if (event.target === modal) closeModals();
    });
  });

  els.exportBtn.addEventListener("click", () => {
    const backup = {
      app: "LinkNote",
      version: 1,
      exportedAt: new Date().toISOString(),
      notes
    };
    downloadFile(`LinkNote-backup-${new Date().toISOString().slice(0,10)}.json`, JSON.stringify(backup, null, 2), "application/json");
    toast("備份已匯出");
  });

  els.importInput.addEventListener("change", async event => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const data = JSON.parse(await file.text());
      const incoming = Array.isArray(data) ? data : data.notes;
      if (!Array.isArray(incoming)) throw new Error("格式不正確");
      notes = incoming.map(note => ({
        id: note.id || uid(),
        title: String(note.title || "未命名筆記"),
        content: String(note.content || ""),
        pinned: Boolean(note.pinned),
        createdAt: note.createdAt || new Date().toISOString(),
        updatedAt: note.updatedAt || new Date().toISOString()
      }));
      currentId = notes[0]?.id || null;
      persist();
      renderAll();
      closeModals();
      toast("備份已匯入");
    } catch (error) {
      alert(`無法匯入：${error.message}`);
    } finally {
      event.target.value = "";
    }
  });

  els.exportMdBtn.addEventListener("click", () => {
    const note = currentNote();
    if (!note) return;
    downloadFile(`${safeFilename(note.title)}.md`, note.content, "text/markdown;charset=utf-8");
    toast("Markdown 已匯出");
  });

  els.installHelpBtn.addEventListener("click", () => {
    els.installHelp.classList.toggle("hidden");
  });

  window.addEventListener("beforeunload", () => {
    clearTimeout(saveTimer);
    const note = currentNote();
    if (note) {
      note.title = els.titleInput.value.trim() || note.title;
      note.content = els.contentInput.value;
      persist();
    }
  });

  window.addEventListener("resize", () => {
    if (!els.graphModal.classList.contains("hidden")) buildGraph();
  });

  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("./sw.js").catch(error => console.warn("Service Worker 註冊失敗", error));
    });
  }

  renderAll();
})();
