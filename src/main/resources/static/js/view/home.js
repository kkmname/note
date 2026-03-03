/* =============================================================
   script for home.html — View layer
============================================================= */
const Home = (() => {

    /* ==================================================
        Initialization
    ================================================== */
    async function init() {
        await serverSessionCheck();
        loadTheme();
        eventHandlers();
        await renderTree();
    }

    /* ==================================================
        Variables & Constants
    ================================================== */
    let mdeInstance  = null;
    let currentNote  = null;   /* ArticleResponse */
    let isEditMode   = false;
    let ctxTarget    = null;   /* { type:'root'|'subject'|'note', subjectId?, noteId? } */
    let modalAction  = null;
    let toastTimer   = null;
    let subjectCache = [];     /* SubjectResponse[] */

    const LS_THEME = "journal:theme";
    const SS_AUTH  = "note:auth";

    /* ==================================================
        DOM refs
    ================================================== */
    const $               = (sel) => document.querySelector(sel);
    const themeBtn        = $("#themeBtn");
    const toastEl         = $("#toast");
    const toastTxt        = $("#toastText");
    const newNoteBtn      = $("#newNoteBtn");
    const newFolderBtn    = $("#newFolderBtn");
    const logoutBtn       = $("#logoutBtn");
    const editModeBtn     = $("#editModeBtn");
    const editModeBtnText = $("#editModeBtnText");
    const saveBtn         = $("#saveBtn");
    const editorTitle     = $("#editorTitle");
    const editorActions   = $("#editorActions");
    const editorEmpty     = $("#editorEmpty");
    const mdeTarget       = $("#mdeTarget");
    const noteCount       = $("#noteCount");
    const treeEl          = $("#tree");
    const ctxMenu         = $("#ctxMenu");
    const ctxNewNote      = $("#ctxNewNote");
    const ctxNewFolder    = $("#ctxNewFolder");
    const ctxRename       = $("#ctxRename");
    const ctxDelete       = $("#ctxDelete");
    const modalBackdrop   = $("#modalBackdrop");
    const modalTitle      = $("#modalTitle");
    const modalInput      = $("#modalInput");
    const modalLabel      = $("#modalLabel");
    const modalFolderField   = $("#modalFolderField");
    const modalFolderSelect  = $("#modalFolderSelect");
    const modalClose      = $("#modalClose");
    const modalCancel     = $("#modalCancel");
    const modalSubmit     = $("#modalSubmit");
    const sidebarBody     = $("#sidebarBody");
    const sidebarEl       = $("#sidebar");
    const editorPanel     = $("#editorPanel");
    const mobileBackBtn   = $("#mobileBackBtn");

    /* ==================================================
        Event Handlers
    ================================================== */
    function eventHandlers() {
        themeBtn.addEventListener("click", toggleTheme);

        logoutBtn.addEventListener("click", () => {
            sessionStorage.removeItem(SS_AUTH);
            location.replace("login.html");
        });

        newNoteBtn.addEventListener("click", () => {
            openModal("새 노트", "노트 제목", true, (name) => {
                const subjectId = modalFolderSelect.value ? Number(modalFolderSelect.value) : null;
                createNote(name, subjectId);
            });
        });

        newFolderBtn.addEventListener("click", () => {
            openModal("새 폴더", "폴더 이름", false, createSubject);
        });

        editModeBtn.addEventListener("click", toggleEditMode);
        saveBtn.addEventListener("click", saveNote);

        ctxNewNote.addEventListener("click", () => {
            const subjectId = ctxTarget?.subjectId ?? null;
            closeCtxMenu();
            openModal("새 노트", "노트 제목", false, (name) =>
                createNote(name, subjectId ? Number(subjectId) : null)
            );
        });

        ctxNewFolder.addEventListener("click", () => {
            closeCtxMenu();
            openModal("새 폴더", "폴더 이름", false, createSubject);
        });

        ctxRename.addEventListener("click", () => {
            const saved = { ...ctxTarget };
            closeCtxMenu();
            openModal("이름 변경", "새 이름", false, (name) => renameItem(saved, name));
        });

        ctxDelete.addEventListener("click", () => {
            const saved = { ...ctxTarget };
            closeCtxMenu();
            deleteItem(saved);
        });

        document.addEventListener("click", (e) => {
            if (!e.target.closest("#ctxMenu")) closeCtxMenu();
        });

        sidebarBody.addEventListener("contextmenu", (e) => {
            if (!e.target.closest(".tree-folder-row") && !e.target.closest(".tree-note-row")) {
                e.preventDefault();
                openCtxMenu(e, { type: "root" });
            }
        });

        modalClose.addEventListener("click", closeModal);
        modalCancel.addEventListener("click", closeModal);
        modalSubmit.addEventListener("click", submitModal);
        modalInput.addEventListener("keydown", (e) => { if (e.key === "Enter") submitModal(); });
        modalBackdrop.addEventListener("click", (e) => {
            if (e.target === modalBackdrop) closeModal();
        });

        mobileBackBtn.addEventListener("click", showSidebarOnMobile);

        document.addEventListener("keydown", (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === "s") {
                e.preventDefault();
                saveNote();
                return;
            }
            if (e.key === "Escape") {
                closeCtxMenu();
                closeModal();
            }
        });

        window.addEventListener("resize", () => {
            if (window.innerWidth > 768) {
                sidebarEl.classList.remove("mobile-hidden");
                editorPanel.classList.remove("mobile-active");
            }
        });
    }

    /* ==================================================
        Theme
    ================================================== */
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

    /* ==================================================
        Render Tree
    ================================================== */
    async function renderTree() {
        treeEl.innerHTML = "";

        try {
            subjectCache = await Subject_API.getSubjects();
        } catch (e) {
            toast("폴더 목록을 불러오지 못했습니다.");
            return;
        }

        const roots = subjectCache.filter(s => (s.parentId ?? null) === null);
        roots.forEach(s => treeEl.appendChild(makeSubjectItem(s)));

        noteCount.textContent = `${subjectCache.length}개의 폴더`;

        if (subjectCache.length === 0) {
            const hint = document.createElement("li");
            hint.className   = "tree-empty";
            hint.textContent = "폴더가 없습니다.\n+ 버튼으로 폴더를 만들어보세요.";
            treeEl.appendChild(hint);
        }

        if (currentNote) highlightNote(currentNote.id);
    }

    function makeSubjectItem(subject) {
        const children = subjectCache.filter(s => s.parentId === subject.id);

        const li = document.createElement("li");
        li.role             = "treeitem";
        li.className        = "tree-folder-item";
        li.dataset.subjectId = subject.id;

        const row = document.createElement("div");
        row.className = "tree-folder-row";
        row.innerHTML = `
            <svg class="tree-chevron" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M9 18l6-6-6-6" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            <span class="folder-emoji" aria-hidden="true">📁</span>
            <span class="tree-folder-name">${escHtml(subject.name)}</span>
            <span class="tree-folder-count">${children.length}</span>
        `;

        row.addEventListener("click", () => toggleSubjectFolder(li, subject.id));
        row.addEventListener("contextmenu", (e) => {
            e.preventDefault();
            e.stopPropagation();
            openCtxMenu(e, { type: "subject", subjectId: subject.id });
        });

        const childrenEl = document.createElement("ul");
        childrenEl.className        = "tree-children";
        childrenEl.role             = "group";
        childrenEl.dataset.subjectId = subject.id;

        children.forEach(c => childrenEl.appendChild(makeSubjectItem(c)));

        li.appendChild(row);
        li.appendChild(childrenEl);

        if (sessionStorage.getItem(`subject-open:${subject.id}`) === "1") {
            childrenEl.classList.add("open");
            row.querySelector(".tree-chevron").classList.add("open");
            row.querySelector(".folder-emoji").textContent = "📂";
            loadNotesIntoFolder(subject.id, childrenEl);
        }

        return li;
    }

    async function loadNotesIntoFolder(subjectId, childrenEl) {
        if (childrenEl.dataset.notesLoaded === "1") return;

        let articles = [];
        try {
            articles = await Article_API.getArticlesBySubject(subjectId);
            if (articles.content) articles = articles.content;
        } catch (e) {
            toast("노트 목록을 불러오지 못했습니다.");
            return;
        }

        articles.forEach(article => childrenEl.appendChild(makeNoteRow(article)));
        childrenEl.dataset.notesLoaded = "1";

        const li      = childrenEl.closest(".tree-folder-item");
        const badge   = li?.querySelector(".tree-folder-count");
        const subCount = subjectCache.filter(s => s.parentId === Number(subjectId)).length;
        if (badge) badge.textContent = subCount + articles.length;
    }

    function makeNoteRow(article) {
        const li = document.createElement("li");
        li.role          = "treeitem";
        li.className     = "tree-note-row";
        li.dataset.noteId = article.id;

        li.innerHTML = `
            <svg class="tree-note-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6Z"
                      stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/>
                <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8"
                      stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
            </svg>
            <span class="tree-note-name">${escHtml(article.title || "제목 없음")}</span>
            <span class="tree-note-date">${shortDate(article.modifiedAt || article.createdAt)}</span>
        `;

        li.addEventListener("click", () => openNote(article.id));
        li.addEventListener("contextmenu", (e) => {
            e.preventDefault();
            e.stopPropagation();
            openCtxMenu(e, { type: "note", subjectId: article.subjectId, noteId: article.id });
        });

        return li;
    }

    async function toggleSubjectFolder(li, subjectId) {
        const childrenEl = li.querySelector(".tree-children");
        const chevron    = li.querySelector(".tree-chevron");
        const emoji      = li.querySelector(".folder-emoji");
        const isOpen     = childrenEl.classList.toggle("open");

        chevron.classList.toggle("open", isOpen);
        emoji.textContent = isOpen ? "📂" : "📁";

        if (isOpen) {
            await loadNotesIntoFolder(subjectId, childrenEl);
        } else {
            childrenEl.dataset.notesLoaded = "0";
        }

        try { sessionStorage.setItem(`subject-open:${subjectId}`, isOpen ? "1" : "0"); } catch (e) {}
    }

    function highlightNote(noteId) {
        document.querySelectorAll(".tree-note-row").forEach(el =>
            el.classList.toggle("active", String(el.dataset.noteId) === String(noteId))
        );
    }

    /* ==================================================
        Open Note
    ================================================== */
    async function openNote(noteId) {
        let article;
        try {
            article = await Article_API.getArticle(noteId);
        } catch (e) {
            toast("노트를 불러오지 못했습니다.");
            return;
        }

        currentNote = article;
        isEditMode  = false;

        editorTitle.textContent = article.title || "제목 없음";
        editorTitle.classList.remove("placeholder");
        editorActions.style.display = "flex";
        editorEmpty.style.display   = "none";
        mdeTarget.style.display     = "";
        editModeBtnText.textContent  = "편집";

        highlightNote(article.id);
        showEditorOnMobile();

        if (article.subjectId) {
            const li = document.querySelector(`.tree-folder-item[data-subject-id="${article.subjectId}"]`);
            if (li) {
                const ch = li.querySelector(".tree-children");
                if (ch && !ch.classList.contains("open")) await toggleSubjectFolder(li, article.subjectId);
            }
        }

        initMDE(article.contents ?? "", false);
    }

    /* ==================================================
        EasyMDE
    ================================================== */
    function initMDE(content, editMode) {
        if (mdeInstance) {
            try { mdeInstance.toTextArea(); } catch (e) {}
            mdeInstance = null;
        }

        setTimeout(() => {
            mdeInstance = new EasyMDE({
                element:      mdeTarget,
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

            if (!editMode) {
                setTimeout(() => {
                    if (mdeInstance && !mdeInstance.isPreviewActive()) {
                        mdeInstance.togglePreview();
                    }
                }, 30);
            }
        }, 60);
    }

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

    function toggleEditMode() {
        if (!mdeInstance) return;
        isEditMode = !isEditMode;
        editModeBtnText.textContent = isEditMode ? "미리보기" : "편집";

        const isPreviewing = mdeInstance.isPreviewActive();
        if (isEditMode && isPreviewing)   mdeInstance.togglePreview();
        if (!isEditMode && !isPreviewing) mdeInstance.togglePreview();
    }

    /* ==================================================
        Save Note
    ================================================== */
    async function saveNote() {
        if (!currentNote || !mdeInstance) return;

        const payload = {
            id:          currentNote.id,
            title:       currentNote.title,
            description: currentNote.description ?? "",
            contents:    mdeInstance.value(),
            subjectId:   currentNote.subjectId ?? null,
            sortOrder:   currentNote.sortOrder  ?? 0,
        };

        try {
            const updated = await Article_API.saveArticle(payload);
            currentNote   = updated;
            toast("저장되었습니다 ✓");
            const noteRow = document.querySelector(`.tree-note-row[data-note-id="${currentNote.id}"]`);
            const dateEl  = noteRow?.querySelector(".tree-note-date");
            if (dateEl) dateEl.textContent = shortDate(currentNote.modifiedAt);
        } catch (e) {
            toast("저장에 실패했습니다.");
        }
    }

    /* ==================================================
        Clear Editor
    ================================================== */
    function clearEditor() {
        currentNote = null;
        isEditMode  = false;

        if (mdeInstance) {
            try { mdeInstance.toTextArea(); } catch (e) {}
            mdeInstance = null;
        }

        mdeTarget.style.display       = "none";
        editorTitle.textContent       = "노트를 선택하세요";
        editorTitle.classList.add("placeholder");
        editorActions.style.display   = "none";
        editorEmpty.style.display     = "flex";

        document.querySelectorAll(".tree-note-row").forEach(el => el.classList.remove("active"));
        showSidebarOnMobile();
    }

    /* ==================================================
        CRUD — Note
    ================================================== */
    async function createNote(title, subjectId) {
        const payload = {
            title:     title || "제목 없음",
            contents:  "",
            subjectId: subjectId ?? null,
            sortOrder: 0,
        };

        let article;
        try {
            article = await Article_API.saveArticle(payload);
            toast(`'${title}' 노트 생성됨`);
        } catch (e) {
            toast("노트 생성에 실패했습니다.");
            return;
        }

        if (subjectId) {
            const li = document.querySelector(`.tree-folder-item[data-subject-id="${subjectId}"]`);
            if (li) {
                const ch = li.querySelector(".tree-children");
                ch.dataset.notesLoaded = "0";
                if (!ch.classList.contains("open")) {
                    await toggleSubjectFolder(li, subjectId);
                } else {
                    await loadNotesIntoFolder(subjectId, ch);
                }
            }
        } else {
            await renderTree();
        }

        await openNote(article.id);
    }

    /* ==================================================
        CRUD — Subject
    ================================================== */
    async function createSubject(name) {
        try {
            await Subject_API.saveSubject({ name, parentId: null, sortOrder: 0 });
            toast(`'${name}' 폴더 생성됨`);
            await renderTree();
        } catch (e) {
            toast("폴더 생성에 실패했습니다.");
        }
    }

    async function renameItem(target, newName) {
        try {
            if (target.type === "subject") {
                const subject = subjectCache.find(s => s.id === target.subjectId);
                await Subject_API.saveSubject({
                    id:        target.subjectId,
                    name:      newName,
                    parentId:  subject?.parentId  ?? null,
                    sortOrder: subject?.sortOrder  ?? 0,
                });
            } else if (target.type === "note") {
                await Article_API.saveArticle({
                    id:        target.noteId,
                    title:     newName,
                    subjectId: target.subjectId ?? null,
                });
                if (currentNote?.id === target.noteId) {
                    currentNote.title       = newName;
                    editorTitle.textContent = newName;
                    editorTitle.classList.remove("placeholder");
                }
            }
            toast("이름이 변경되었습니다.");
            await renderTree();
        } catch (e) {
            toast("이름 변경에 실패했습니다.");
        }
    }

    async function deleteItem(target) {
        try {
            if (target.type === "subject") {
                await Subject_API.deleteSubject(target.subjectId);
            } else if (target.type === "note") {
                await Article_API.deleteArticle(target.noteId);
                if (currentNote?.id === target.noteId) clearEditor();
            }
            toast("삭제되었습니다.");
            await renderTree();
        } catch (e) {
            toast("삭제에 실패했습니다.");
        }
    }

    /* ==================================================
        Toast
    ================================================== */
    function toast(msg) {
        toastTxt.textContent = msg;
        toastEl.classList.add("show");
        clearTimeout(toastTimer);
        toastTimer = setTimeout(() => toastEl.classList.remove("show"), 1900);
    }

    /* ==================================================
        Context Menu
    ================================================== */
    function openCtxMenu(e, target) {
        ctxTarget = target;

        const showItem = (id, show) => {
            const el = document.getElementById(id);
            if (el) el.style.display = show ? "flex" : "none";
        };
        const showSep = (cls, show) => {
            const el = document.querySelector(`.${cls}`);
            if (el) el.style.display = show ? "block" : "none";
        };

        if (target.type === "root") {
            showItem("ctxNewNote",   false);
            showItem("ctxNewFolder", true);
            showItem("ctxRename",    false);
            showItem("ctxDelete",    false);
            showSep("ctx-sep-rename", false);
        } else if (target.type === "subject") {
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

        const x = Math.min(e.clientX, window.innerWidth  - 170);
        const y = Math.min(e.clientY, window.innerHeight - 140);
        ctxMenu.style.left = `${x}px`;
        ctxMenu.style.top  = `${y}px`;
        ctxMenu.classList.add("show");
    }

    function closeCtxMenu() {
        ctxMenu.classList.remove("show");
        ctxTarget = null;
    }

    /* ==================================================
        Modal
    ================================================== */
    function buildSubjectOptions() {
        modalFolderSelect.innerHTML = `<option value="">최상위 (폴더 없음)</option>`;
        function recurse(parentId, depth) {
            subjectCache
                .filter(s => (s.parentId ?? null) === parentId)
                .forEach(s => {
                    const opt       = document.createElement("option");
                    opt.value       = s.id;
                    opt.textContent = "\u00a0\u00a0".repeat(depth * 2) + s.name;
                    modalFolderSelect.appendChild(opt);
                    recurse(s.id, depth + 1);
                });
        }
        recurse(null, 0);
    }

    function openModal(title, placeholder, showSubjectSelect, action) {
        modalAction            = action;
        modalTitle.textContent = title;
        modalInput.placeholder = placeholder;
        modalInput.value       = "";
        modalFolderField.style.display = showSubjectSelect ? "block" : "none";

        if (showSubjectSelect) buildSubjectOptions();

        modalBackdrop.classList.add("show");
        setTimeout(() => modalInput.focus(), 80);
    }

    function closeModal() {
        modalBackdrop.classList.remove("show");
        modalAction = null;
    }

    function submitModal() {
        const name = modalInput.value.trim();
        if (!name) { toast("이름을 입력해주세요."); return; }
        if (modalAction) modalAction(name);
        closeModal();
    }

    /* ==================================================
        Mobile
    ================================================== */
    function isMobile() { return window.innerWidth <= 768; }

    function showEditorOnMobile() {
        if (!isMobile()) return;
        sidebarEl.classList.add("mobile-hidden");
        editorPanel.classList.add("mobile-active");
    }

    function showSidebarOnMobile() {
        if (!isMobile()) return;
        editorPanel.classList.remove("mobile-active");
        sidebarEl.classList.remove("mobile-hidden");
    }

    /* ==================================================
        Utils
    ================================================== */
    function escHtml(str) {
        return String(str ?? "")
            .replaceAll("&", "&amp;").replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;").replaceAll('"', "&quot;");
    }

    function shortDate(iso) {
        if (!iso) return "";
        return String(iso).slice(0, 10).replaceAll("-", ".");
    }

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

/* ==================================================
    Initialization
================================================== */
(async function init() {
    await Home.init();
})();