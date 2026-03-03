/* =============================================================
   script for home.html
============================================================= */
const Home = (() => {
    /* ==================================================
        Initialization
    ================================================== */
    async function init() {
        await serverSessionCheck();
        loadTheme();
        // eventHandlers();
        renderTree();
    }

    function eventHandlers() {
        $("#themeBtn").addEventListener("click", toggleTheme);
        $("#logoutBtn").addEventListener("click", () => {
            sessionStorage.removeItem(SS_AUTH);
            location.replace("login.html");
        });
        $("#newNoteBtn").addEventListener("click", () => {
            openModal("새 노트", "노트 제목", true, (name) => {
                const folderId = $("#modalFolderSelect").value || null;
                createNote(name, folderId);
            });
        });
        $("#newFolderBtn").addEventListener("click", () => {
            openModal("새 폴더", "폴더 이름", false, createFolder);
        });
        $("#editModeBtn").addEventListener("click", toggleEditMode);
        $("#saveBtn").addEventListener("click", saveNote);
        $("#ctxNewNote").addEventListener("click", () => {
            const folderId = ctxTarget?.folderId ?? null;
            closeCtxMenu();
            openModal("새 노트", "노트 제목", false, (name) => createNote(name, folderId));
        });
        $("#ctxNewFolder").addEventListener("click", () => {
            closeCtxMenu();
            openModal("새 폴더", "폴더 이름", false, createFolder);
        });
        $("#ctxRename").addEventListener("click", () => {
            const saved = { ...ctxTarget };
            closeCtxMenu();
            openModal("이름 변경", "새 이름", false, (name) => renameItem(saved, name));
        });
        $("#ctxDelete").addEventListener("click", () => {
            const saved = { ...ctxTarget };
            closeCtxMenu();
            deleteItem(saved);
        });
        document.addEventListener("click", (e) => {
            if (!e.target.closest("#ctxMenu")) closeCtxMenu();
        });
        $("#sidebarBody").addEventListener("contextmenu", (e) => {
            if (!e.target.closest(".tree-folder-row") && !e.target.closest(".tree-note-row")) {
                e.preventDefault();
                openCtxMenu(e, { type: "root" });
            }
        });
        $("#modalClose").addEventListener("click", closeModal);
        $("#modalCancel").addEventListener("click", closeModal);
        $("#modalSubmit").addEventListener("click", submitModal);
        $("#modalInput").addEventListener("keydown", (e) => { if (e.key === "Enter") submitModal(); });
        $("#modalBackdrop").addEventListener("click", (e) => {
            if (e.target === $("#modalBackdrop")) closeModal();
        });
        $("#mobileBackBtn").addEventListener("click", showSidebarOnMobile);
    }

    /* ==================================================
        Rendering
    ================================================== */


    /* ==================================================
        Utilities
    ================================================== */
    async function serverSessionCheck() {
        try {
            const resp = await fetch('/api/v1/auth/status');
            if (resp.message) {
                // already authenticated
                location.replace('/home');
            }
        } catch (e) {
            // ignore, not logged in
        }
    }

    /* ==================================================
        Publish
    ================================================== */
    return {
        init
    }
})();

/* =============================================================
   home.js — kkmnote 홈 페이지 로직
   • 인증 가드: sessionStorage "note:auth" 없으면 login.html 리다이렉트
   • 데이터: localStorage "note:data" (폴더 + 노트 JSON)
   • EasyMDE: 노트 클릭 시 Preview 모드로 열기 / 편집 버튼으로 토글
   • Ctrl+S 단축키로 저장
============================================================= */
"use strict";

const $ = (sel) => document.querySelector(sel);

const LS_THEME = "journal:theme";   /* blog와 동일 키 → 테마 공유 */
const LS_DATA  = "note:data";
const SS_AUTH  = "note:auth";

let mdeInstance   = null;
let currentNote   = null;   /* { note, folderId: string|null } */
let isEditMode    = false;
let ctxTarget     = null;   /* { type:'root'|'folder'|'note', folderId?, noteId? } */
let modalAction   = null;   /* Function | null */
let toastTimer    = null;
let dnd           = null;   /* drag-and-drop 상태 { type, noteId?, folderId?, folderDragId?, el } */

/* -------------------------------------------------------
   Toast
------------------------------------------------------- */
function toast(msg, duration = 1900) {
  $("#toastText").textContent = msg;
  $("#toast").classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => $("#toast").classList.remove("show"), duration);
}

/* -------------------------------------------------------
   Theme
------------------------------------------------------- */
function loadTheme() {
  const saved = localStorage.getItem(LS_THEME);
  const pref  = window.matchMedia?.("(prefers-color-scheme: light)").matches ? "light" : "dark";
  document.documentElement.dataset.theme = (saved === "light" || saved === "dark") ? saved : pref;
}

function toggleTheme() {
  const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
  document.documentElement.dataset.theme = next;
  try { localStorage.setItem(LS_THEME, next); } catch (e) {}
  toast(next === "dark" ? "다크 모드" : "라이트 모드");
}

/* -------------------------------------------------------
   Data helpers
------------------------------------------------------- */
function loadData() {
  try {
    const raw = localStorage.getItem(LS_DATA);
    if (raw) {
      const d = JSON.parse(raw);
      /* 기존 데이터 마이그레이션: parentId 필드 보장 */
      const folders = (d.folders ?? []).map(f => ({ parentId: null, ...f }));
      return { folders, notes: d.notes ?? [] };
    }
  } catch (e) {}
  return getDefaultData();
}

function saveData(data) {
  try { localStorage.setItem(LS_DATA, JSON.stringify(data)); } catch (e) {}
}

function getDefaultData() {
  return {
    folders: [
      {
        id: "f-default",
        parentId: null,
        name: "시작하기",
        notes: [
          {
            id: "n-default",
            title: "kkmnote 소개",
            content: "# kkmnote 에 오신 것을 환영합니다 🌿\n\n**kkmnote** 는 마크다운 기반의 개인 노트 저장소입니다.\n\n## 사용 방법\n\n- 좌측 트리에서 폴더와 노트를 관리하세요\n- 노트를 클릭하면 **미리보기 모드**로 열립니다\n- **편집** 버튼 또는 툴바의 Preview 버튼으로 수정하세요\n- `Ctrl + S` 또는 **저장** 버튼으로 저장하세요\n- 우클릭으로 이름 변경 / 삭제 가능\n\n## 지원 기능\n\n- 마크다운 (EasyMDE)\n- 이미지 Base64 삽입\n- 다크 / 라이트 테마\n- 폴더 트리 구조\n",
            created:  "2026-02-25",
            modified: "2026-02-25",
          },
        ],
      },
    ],
    notes: [],
  };
}

function genId(prefix) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

function todayIso() {
  return new Date().toISOString().split("T")[0];
}

function shortDate(iso) {
  if (!iso) return "";
  const d = new Date(iso + "T00:00:00");
  const yyyy = d.getFullYear();
  const mm   = String(d.getMonth() + 1).padStart(2, "0");
  const dd   = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function escHtml(str) {
  return String(str ?? "")
    .replaceAll("&", "&amp;").replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}

/* -------------------------------------------------------
   Tree rendering
------------------------------------------------------- */
function totalNotes(data) {
  const inFolders = (data.folders ?? []).reduce((s, f) => s + (f.notes?.length ?? 0), 0);
  return (data.notes?.length ?? 0) + inFolders;
}

function renderTree() {
  const data   = loadData();
  const treeEl = $("#tree");
  treeEl.innerHTML = "";

  const count = totalNotes(data);
  $("#noteCount").textContent = `${count}개의 노트`;

  /* 최상위 노트 */
  (data.notes ?? []).forEach(note => treeEl.appendChild(makeNoteRow(note, null)));

  /* 최상위 폴더 (parentId === null) — makeFolderItem으로 재귀 렌더링 */
  getFolderChildren(null, data).forEach(folder => {
    treeEl.appendChild(makeFolderItem(folder, data));
  });

  /* Empty hint */
  if (count === 0) {
    const hint = document.createElement("li");
    hint.className = "tree-empty";
    hint.textContent = "노트가 없습니다.\n+ 버튼으로 첫 노트를 만들어보세요.";
    treeEl.appendChild(hint);
  }

  /* 현재 선택된 노트 하이라이트 */
  if (currentNote) highlightNote(currentNote.note.id);
}

function makeNoteRow(note, folderId) {
  const li = document.createElement("li");
  li.role      = "treeitem";
  li.className = "tree-note-row";
  li.draggable = true;
  li.dataset.noteId   = note.id;
  li.dataset.folderId = folderId ?? "";

  li.innerHTML = `
    <svg class="tree-note-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6Z"
            stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/>
      <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8"
            stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
    </svg>
    <span class="tree-note-name">${escHtml(note.title || "제목 없음")}</span>
    <span class="tree-note-date">${shortDate(note.modified || note.created)}</span>
  `;

  li.addEventListener("click", () => openNote(note, folderId));
  li.addEventListener("contextmenu", (e) => {
    e.preventDefault();
    e.stopPropagation();
    openCtxMenu(e, { type: "note", folderId, noteId: note.id });
  });

  /* ── Drag & Drop (desktop) ── */
  li.addEventListener("dragstart", (e) => {
    dnd = { type: "note", noteId: note.id, folderId: folderId ?? null, el: li };
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", "note");
    setTimeout(() => li.classList.add("dnd-dragging"), 0);
  });
  li.addEventListener("dragend", endDnd);

  return li;
}

/* -------------------------------------------------------
   Folder tree helpers — 중첩 폴더 지원
------------------------------------------------------- */
function getFolderChildren(parentId, data) {
  return (data.folders ?? []).filter(f => (f.parentId ?? null) === parentId);
}

function makeFolderItem(folder, data) {
  const childFolders = getFolderChildren(folder.id, data);
  const countBadge   = (folder.notes?.length ?? 0) + childFolders.length;

  const li = document.createElement("li");
  li.role = "treeitem";
  li.className = "tree-folder-item";
  li.draggable = true;
  li.dataset.folderId = folder.id;

  const row = document.createElement("div");
  row.className = "tree-folder-row";
  row.innerHTML = `
    <svg class="tree-chevron" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M9 18l6-6-6-6" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
    <span class="folder-emoji" aria-hidden="true">📁</span>
    <span class="tree-folder-name">${escHtml(folder.name)}</span>
    <span class="tree-folder-count">${countBadge}</span>
  `;
  row.addEventListener("click", () => toggleFolder(li, folder.id));
  row.addEventListener("contextmenu", (e) => {
    e.preventDefault();
    e.stopPropagation();
    openCtxMenu(e, { type: "folder", folderId: folder.id });
  });

  /* ── 폴더 Drag & Drop ── */
  li.addEventListener("dragstart", (e) => {
    if (e.target.closest(".tree-note-row")) return;
    dnd = { type: "folder", folderDragId: folder.id, el: li };
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", "folder");
    setTimeout(() => li.classList.add("dnd-dragging"), 0);
  });
  li.addEventListener("dragend", endDnd);

  /* 폴더 행 = 드롭 타겟: 노트 → 이 폴더, 폴더 → 이 폴더 안으로 이동 */
  row.addEventListener("dragover", (e) => {
    if (!dnd) return;
    if (dnd.type === "folder" && dnd.folderDragId === folder.id) return;          /* 자기 자신 */
    if (dnd.type === "folder" && isFolderDescendant(dnd.folderDragId, folder.id)) return; /* 자손 */
    if (dnd.type === "note"   && dnd.folderId     === folder.id) return;           /* 이미 이 폴더 */
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    document.querySelectorAll(".tree-folder-row.dnd-over")
      .forEach(el => el.classList.remove("dnd-over"));
    row.classList.add("dnd-over");
  });
  row.addEventListener("dragleave", (e) => {
    if (!row.contains(e.relatedTarget)) row.classList.remove("dnd-over");
  });
  row.addEventListener("drop", (e) => {
    e.preventDefault();
    e.stopPropagation();
    row.classList.remove("dnd-over");
    if (!dnd) return;
    if (dnd.type === "note")   moveNote(dnd.noteId, dnd.folderId, folder.id);
    if (dnd.type === "folder") moveFolder(dnd.folderDragId, folder.id);
    endDnd();
  });

  const children = document.createElement("ul");
  children.className = "tree-children";
  children.role = "group";

  /* 폴더 내 노트 */
  (folder.notes ?? []).forEach(note => children.appendChild(makeNoteRow(note, folder.id)));
  /* 하위 폴더 (재귀) */
  childFolders.forEach(sub => children.appendChild(makeFolderItem(sub, data)));

  li.appendChild(row);
  li.appendChild(children);

  /* 열린 상태 복원 */
  if (sessionStorage.getItem(`folder-open:${folder.id}`) === "1") {
    children.classList.add("open");
    row.querySelector(".tree-chevron").classList.add("open");
    row.querySelector(".folder-emoji").textContent = "📂";
  }

  return li;
}

function toggleFolder(li, folderId) {
  const children = li.querySelector(".tree-children");
  const chevron  = li.querySelector(".tree-chevron");
  const emoji    = li.querySelector(".folder-emoji");
  const isOpen   = children.classList.toggle("open");
  chevron.classList.toggle("open", isOpen);
  emoji.textContent = isOpen ? "📂" : "📁";
  try { sessionStorage.setItem(`folder-open:${folderId}`, isOpen ? "1" : "0"); } catch (e) {}
}

function highlightNote(noteId) {
  document.querySelectorAll(".tree-note-row").forEach(el =>
    el.classList.toggle("active", el.dataset.noteId === noteId)
  );
}

/* -------------------------------------------------------
   Open note → EasyMDE (preview mode)
------------------------------------------------------- */
function openNote(note, folderId) {
  currentNote = { note, folderId: folderId ?? null };
  isEditMode  = false;

  /* UI */
  const titleEl = $("#editorTitle");
  titleEl.textContent = note.title || "제목 없음";
  titleEl.classList.remove("placeholder");
  $("#editorActions").style.display = "flex";
  $("#editorEmpty").style.display   = "none";
  $("#mdeTarget").style.display     = "";
  $("#editModeBtnText").textContent  = "편집";

  highlightNote(note.id);
  showEditorOnMobile();

  /* 자동으로 조상 폴더 전체 열기 (중첩 폴더 지원) */
  if (folderId) {
    const data = loadData();
    let cur = folderId;
    while (cur) {
      const li = document.querySelector(`.tree-folder-item[data-folder-id="${cur}"]`);
      if (li) {
        const ch = li.querySelector(".tree-children");
        if (ch && !ch.classList.contains("open")) toggleFolder(li, cur);
      }
      const f = data.folders.find(x => x.id === cur);
      cur = f?.parentId ?? null;
    }
  }

  initMDE(note.content ?? "", false /* start in preview */);
}

/* -------------------------------------------------------
   Init / reinit EasyMDE
------------------------------------------------------- */
function initMDE(content, editMode) {
  if (mdeInstance) {
    try { mdeInstance.toTextArea(); } catch (e) {}
    mdeInstance = null;
  }

  /* DOM 렌더링 후 마운트 */
  setTimeout(() => {
    mdeInstance = new EasyMDE({
      element:      $("#mdeTarget"),
      initialValue: content,
      spellChecker: false,
      lineWrapping: true,
      placeholder:  "마크다운으로 내용을 작성하세요…",
      autofocus:    editMode,
      toolbar: [
        "bold", "italic", "heading", "|",
        "quote", "code", "unordered-list", "ordered-list", "|",
        "link",
        {
          name:      "image",
          action:    uploadImageAsBase64,
          className: "fa fa-image",
          title:     "이미지 업로드",
        },
        "|",
        "preview", "side-by-side", "fullscreen", "|",
        "guide",
      ],
    });

    /* preview 모드로 시작 */
    if (!editMode) {
      /* 약간의 딜레이로 CodeMirror 초기화 완료 후 토글 */
      setTimeout(() => {
        if (mdeInstance && !mdeInstance.isPreviewActive()) {
          mdeInstance.togglePreview();
        }
      }, 30);
    }
  }, 60);
}

/* -------------------------------------------------------
   Image upload (base64 → Markdown)
------------------------------------------------------- */
function uploadImageAsBase64(editor) {
  const input  = document.createElement("input");
  input.type   = "file";
  input.accept = "image/*";
  input.onchange = function () {
    const file = this.files[0];
    if (!file) return;
    toast("이미지 읽는 중…");
    const reader = new FileReader();
    reader.onload = (ev) => {
      const cm  = editor.codemirror;
      const alt = file.name.replace(/\.[^.]+$/, "");
      cm.replaceSelection(`![${alt}](${ev.target.result})`);
      cm.focus();
      toast("이미지 삽입됨 ✓");
    };
    reader.onerror = () => toast("이미지 읽기 실패");
    reader.readAsDataURL(file);
  };
  input.click();
}

/* -------------------------------------------------------
   Edit / Preview mode toggle
------------------------------------------------------- */
function toggleEditMode() {
  if (!mdeInstance) return;
  isEditMode = !isEditMode;
  $("#editModeBtnText").textContent = isEditMode ? "미리보기" : "편집";

  const isPreviewing = mdeInstance.isPreviewActive();
  if (isEditMode && isPreviewing)   mdeInstance.togglePreview();
  if (!isEditMode && !isPreviewing) mdeInstance.togglePreview();
}

/* -------------------------------------------------------
   Save note
------------------------------------------------------- */
function saveNote() {
  if (!currentNote || !mdeInstance) return;

  const content = mdeInstance.value();
  const data    = loadData();
  const today   = todayIso();

  if (currentNote.folderId) {
    const folder  = data.folders.find(f => f.id === currentNote.folderId);
    const noteIdx = folder?.notes.findIndex(n => n.id === currentNote.note.id) ?? -1;
    if (noteIdx > -1) {
      folder.notes[noteIdx].content  = content;
      folder.notes[noteIdx].modified = today;
      currentNote.note = folder.notes[noteIdx];
    }
  } else {
    const noteIdx = data.notes.findIndex(n => n.id === currentNote.note.id);
    if (noteIdx > -1) {
      data.notes[noteIdx].content  = content;
      data.notes[noteIdx].modified = today;
      currentNote.note = data.notes[noteIdx];
    }
  }

  saveData(data);
  renderTree();
  toast("저장되었습니다 ✓");
}

/* -------------------------------------------------------
   Clear editor (no note selected)
------------------------------------------------------- */
function clearEditor() {
  currentNote = null;
  isEditMode  = false;

  if (mdeInstance) {
    try { mdeInstance.toTextArea(); } catch (e) {}
    mdeInstance = null;
  }

  const ta = $("#mdeTarget");
  if (ta) ta.style.display = "none";

  $("#editorTitle").textContent = "노트를 선택하세요";
  $("#editorTitle").classList.add("placeholder");
  $("#editorActions").style.display = "none";
  $("#editorEmpty").style.display   = "flex";

  document.querySelectorAll(".tree-note-row").forEach(el => el.classList.remove("active"));
  showSidebarOnMobile();
}

/* -------------------------------------------------------
   CRUD: Note
------------------------------------------------------- */
function createNote(title, folderId) {
  const data = loadData();
  const note = {
    id:       genId("n"),
    title:    title || "제목 없음",
    content:  "",
    created:  todayIso(),
    modified: todayIso(),
  };

  if (folderId) {
    const folder = data.folders.find(f => f.id === folderId);
    if (folder) { folder.notes = folder.notes ?? []; folder.notes.push(note); }
    else         { data.notes.push(note); }
  } else {
    data.notes = data.notes ?? [];
    data.notes.push(note);
  }

  saveData(data);
  renderTree();
  openNote(note, folderId ?? null);
  toast(`'${title}' 노트 생성됨`);
}

/* -------------------------------------------------------
   CRUD: Folder
------------------------------------------------------- */
function createFolder(name) {
  const data = loadData();
  data.folders = data.folders ?? [];
  data.folders.push({ id: genId("f"), name, notes: [] });
  saveData(data);
  renderTree();
  toast(`'${name}' 폴더 생성됨`);
}

/* -------------------------------------------------------
   Rename
------------------------------------------------------- */
function renameItem(target, newName) {
  const data = loadData();

  if (target.type === "folder") {
    const folder = data.folders.find(f => f.id === target.folderId);
    if (folder) folder.name = newName;
  } else if (target.type === "note") {
    const note = findNote(data, target.folderId, target.noteId);
    if (note) {
      note.title    = newName;
      note.modified = todayIso();
      if (currentNote?.note.id === note.id) {
        currentNote.note = note;
        const titleEl = $("#editorTitle");
        titleEl.textContent = newName;
        titleEl.classList.remove("placeholder");
      }
    }
  }

  saveData(data);
  renderTree();
  toast("이름이 변경되었습니다.");
}

/* -------------------------------------------------------
   Delete
------------------------------------------------------- */
function deleteItem(target) {
  const data = loadData();

  if (target.type === "folder") {
    const toDelete = collectDescendantFolderIds(target.folderId, data.folders);
    data.folders = data.folders.filter(f => !toDelete.has(f.id));
    if (toDelete.has(currentNote?.folderId ?? "")) clearEditor();
  } else if (target.type === "note") {
    if (target.folderId) {
      const folder = data.folders.find(f => f.id === target.folderId);
      if (folder) folder.notes = folder.notes.filter(n => n.id !== target.noteId);
    } else {
      data.notes = data.notes.filter(n => n.id !== target.noteId);
    }
    if (currentNote?.note.id === target.noteId) clearEditor();
  }

  saveData(data);
  renderTree();
  toast("삭제되었습니다.");
}

/* -------------------------------------------------------
   findNote helper
------------------------------------------------------- */
function findNote(data, folderId, noteId) {
  if (folderId) {
    const folder = data.folders.find(f => f.id === folderId);
    return folder?.notes.find(n => n.id === noteId) ?? null;
  }
  return data.notes.find(n => n.id === noteId) ?? null;
}

/* -------------------------------------------------------
   Drag & Drop helpers
------------------------------------------------------- */
function endDnd() {
  if (!dnd) return;
  dnd.el?.classList.remove("dnd-dragging");
  document.querySelectorAll(".dnd-over").forEach(el => el.classList.remove("dnd-over"));
  const sb = $("#sidebarBody");
  if (sb) sb.classList.remove("dnd-root-over");
  dnd = null;
}

function moveNote(noteId, fromFolderId, toFolderId) {
  if (fromFolderId === toFolderId) return;
  const data = loadData();

  /* 원본에서 제거 */
  let note = null;
  if (fromFolderId) {
    const folder = data.folders.find(f => f.id === fromFolderId);
    if (!folder) return;
    const idx = folder.notes.findIndex(n => n.id === noteId);
    if (idx < 0) return;
    [note] = folder.notes.splice(idx, 1);
  } else {
    const idx = data.notes.findIndex(n => n.id === noteId);
    if (idx < 0) return;
    [note] = data.notes.splice(idx, 1);
  }
  if (!note) return;

  /* 대상에 추가 */
  if (toFolderId) {
    const folder = data.folders.find(f => f.id === toFolderId);
    if (folder) { folder.notes = folder.notes ?? []; folder.notes.push(note); }
    else         { data.notes.push(note); }
  } else {
    data.notes = data.notes ?? [];
    data.notes.push(note);
  }

  /* currentNote 폴더 동기화 */
  if (currentNote?.note.id === noteId) currentNote.folderId = toFolderId;
  saveData(data);
  renderTree();
  toast(`'${note.title}' 이동 완료`);
}

/* 폴더를 다른 폴더 안으로 이동 (parentId 변경) */
function moveFolder(fromId, intoId) {
  if (fromId === intoId) return;
  if (isFolderDescendant(fromId, intoId)) {
    toast("하위 폴더로 이동할 수 없습니다.");
    return;
  }
  const data   = loadData();
  const folder = data.folders.find(f => f.id === fromId);
  if (!folder) return;
  folder.parentId = intoId;
  saveData(data);
  renderTree();
  toast(`'${folder.name}' 폴더 이동 완료`);
}

/* 폴더를 최상위로 이동 */
function moveFolderToRoot(fromId) {
  const data   = loadData();
  const folder = data.folders.find(f => f.id === fromId);
  if (!folder || (folder.parentId ?? null) === null) return;
  folder.parentId = null;
  saveData(data);
  renderTree();
  toast(`'${folder.name}' 최상위로 이동`);
}

/* checkId가 ancestorId의 자손인지 확인 (순환 참조 방지) */
function isFolderDescendant(ancestorId, checkId) {
  const data    = loadData();
  let current   = checkId;
  const visited = new Set();
  while (current) {
    if (visited.has(current)) return false;
    visited.add(current);
    const f = data.folders.find(x => x.id === current);
    if (!f) return false;
    if ((f.parentId ?? null) === ancestorId) return true;
    current = f.parentId ?? null;
  }
  return false;
}

/* rootId 포함 모든 자손 폴더 ID 수집 */
function collectDescendantFolderIds(rootId, folders) {
  const ids = new Set([rootId]);
  let changed = true;
  while (changed) {
    changed = false;
    folders.forEach(f => {
      if (f.parentId && ids.has(f.parentId) && !ids.has(f.id)) {
        ids.add(f.id);
        changed = true;
      }
    });
  }
  return ids;
}

/* 모달 폴더 선택 <select>에 계층형 옵션 삽입 */
function buildFolderSelectOptions(sel, folders, parentId, depth) {
  folders.filter(f => (f.parentId ?? null) === parentId).forEach(f => {
    const opt = document.createElement("option");
    opt.value       = f.id;
    opt.textContent = "\u00a0\u00a0".repeat(depth * 2) + f.name;
    sel.appendChild(opt);
    buildFolderSelectOptions(sel, folders, f.id, depth + 1);
  });
}

/* -------------------------------------------------------
   Mobile View
------------------------------------------------------- */
function isMobile() { return window.innerWidth <= 768; }

function showEditorOnMobile() {
  if (!isMobile()) return;
  $("#sidebar").classList.add("mobile-hidden");
  $("#editorPanel").classList.add("mobile-active");
}

function showSidebarOnMobile() {
  if (!isMobile()) return;
  $("#editorPanel").classList.remove("mobile-active");
  $("#sidebar").classList.remove("mobile-hidden");
}

/* -------------------------------------------------------
   Context Menu
------------------------------------------------------- */
function openCtxMenu(e, target) {
  ctxTarget = target;

  const showItem = (id, show) => {
    const el = $(`#${id}`);
    if (el) el.style.display = show ? "flex" : "none";
  };
  const showSep = (cls, show) => {
    const el = document.querySelector(`.${cls}`);
    if (el) el.style.display = show ? "block" : "none";
  };

  if (target.type === "root") {
    showItem("ctxNewNote",   true);
    showItem("ctxNewFolder", true);
    showItem("ctxRename",    false);
    showItem("ctxDelete",    false);
    showSep("ctx-sep-rename", false);
  } else if (target.type === "folder") {
    showItem("ctxNewNote",   true);
    showItem("ctxNewFolder", false);
    showItem("ctxRename",    true);
    showItem("ctxDelete",    true);
    showSep("ctx-sep-rename", true);
  } else { /* note */
    showItem("ctxNewNote",   false);
    showItem("ctxNewFolder", false);
    showItem("ctxRename",    true);
    showItem("ctxDelete",    true);
    showSep("ctx-sep-rename", true);
  }

  const menu = $("#ctxMenu");
  const x = Math.min(e.clientX, window.innerWidth  - 170);
  const y = Math.min(e.clientY, window.innerHeight - 140);
  menu.style.left = `${x}px`;
  menu.style.top  = `${y}px`;
  menu.classList.add("show");
}

function closeCtxMenu() {
  $("#ctxMenu").classList.remove("show");
  ctxTarget = null;
}

/* -------------------------------------------------------
   Modal
------------------------------------------------------- */
function openModal(title, placeholder, showFolderSelect, action) {
  modalAction = action;
  $("#modalTitle").textContent  = title;
  $("#modalInput").placeholder  = placeholder;
  $("#modalInput").value        = "";
  $("#modalFolderField").style.display = showFolderSelect ? "block" : "none";

  if (showFolderSelect) {
    const sel   = $("#modalFolderSelect");
    const fdata = loadData();
    sel.innerHTML = `<option value="">최상위 (폴더 없음)</option>`;
    buildFolderSelectOptions(sel, fdata.folders, null, 0);
  }

  $("#modalBackdrop").classList.add("show");
  setTimeout(() => $("#modalInput").focus(), 80);
}

function closeModal() {
  $("#modalBackdrop").classList.remove("show");
  modalAction = null;
}

function submitModal() {
  const name = $("#modalInput").value.trim();
  if (!name) { toast("이름을 입력해주세요."); return; }
  if (modalAction) modalAction(name);
  closeModal();
}

/* -------------------------------------------------------
   Keyboard shortcuts
------------------------------------------------------- */
document.addEventListener("keydown", (e) => {
  /* Ctrl+S / Cmd+S → 저장 */
  if ((e.ctrlKey || e.metaKey) && e.key === "s") {
    e.preventDefault();
    saveNote();
    return;
  }
  /* Escape → 컨텍스트 메뉴 / 모달 닫기 */
  if (e.key === "Escape") {
    closeCtxMenu();
    closeModal();
  }
});

/* ==================================================
    Initialization
================================================== */
(async function init() {
    Home.init();
})();

/* -------------------------------------------------------
   Init
------------------------------------------------------- */
(function init() {
  renderTree();

  /* Sidebar body — DnD: 노트를 루트(폴더 없음)로 드롭 */
  const sidebarBodyEl = $("#sidebarBody");
  sidebarBodyEl.addEventListener("dragover", (e) => {
    if (!dnd) return;
    if (e.target.closest(".tree-folder-row")) return; /* 폴더 행이 처리 */
    const noteAlreadyRoot   = dnd.type === "note"   && dnd.folderId === null;
    const folderAlreadyRoot = dnd.type === "folder" &&
      (loadData().folders.find(f => f.id === dnd.folderDragId)?.parentId ?? null) === null;
    if (noteAlreadyRoot || folderAlreadyRoot) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    sidebarBodyEl.classList.add("dnd-root-over");
  });
  sidebarBodyEl.addEventListener("dragleave", (e) => {
    if (!sidebarBodyEl.contains(e.relatedTarget))
      sidebarBodyEl.classList.remove("dnd-root-over");
  });
  sidebarBodyEl.addEventListener("drop", (e) => {
    sidebarBodyEl.classList.remove("dnd-root-over");
    if (!dnd) return;
    if (e.target.closest(".tree-folder-row")) return;
    e.preventDefault();
    if (dnd.type === "note"   && dnd.folderId !== null) moveNote(dnd.noteId, dnd.folderId, null);
    if (dnd.type === "folder")                          moveFolderToRoot(dnd.folderDragId);
    endDnd();
  });

  /* 창 크기 변경 시 모바일 패널 상태 초기화 */
  window.addEventListener("resize", () => {
    if (window.innerWidth > 768) {
      $("#sidebar").classList.remove("mobile-hidden");
      $("#editorPanel").classList.remove("mobile-active");
    }
  });
})();
