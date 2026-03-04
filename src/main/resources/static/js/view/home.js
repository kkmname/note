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
    let mdeInstance      = null;
    let mdeTimer         = null;
    let mdePreviewTimer  = null;
    let currentNote  = null;
    let isEditMode   = false;
    let ctxTarget    = null;
    let modalAction  = null;
    let toastTimer   = null;
    let subjectCache = [];
    let dnd          = null; /* [FIX-2] { type, noteId?, subjectId?, fromSubjectId?, el } */

    const LS_THEME = "journal:theme";
    const SS_AUTH  = "note:auth";

    /* ==================================================
        DOM refs
    ================================================== */
    const $                  = (sel) => document.querySelector(sel);
    const themeBtn           = $("#themeBtn");
    const toastEl            = $("#toast");
    const toastTxt           = $("#toastText");
    const newNoteBtn         = $("#newNoteBtn");
    const newFolderBtn       = $("#newFolderBtn");
    const logoutBtn          = $("#logoutBtn");
    const editModeBtn        = $("#editModeBtn");
    const editModeBtnText    = $("#editModeBtnText");
    const saveBtn            = $("#saveBtn");
    const editorTitle        = $("#editorTitle");
    const editorActions      = $("#editorActions");
    const editorEmpty        = $("#editorEmpty");
    const mdeTarget          = $("#mdeTarget");
    const noteCount          = $("#noteCount");
    const treeEl             = $("#tree");
    const ctxMenu            = $("#ctxMenu");
    const ctxNewNote         = $("#ctxNewNote");
    const ctxNewFolder       = $("#ctxNewFolder");
    const ctxRename          = $("#ctxRename");
    const ctxDelete          = $("#ctxDelete");
    const modalBackdrop      = $("#modalBackdrop");
    const modalTitle         = $("#modalTitle");
    const modalInput         = $("#modalInput");
    const modalLabel         = $("#modalLabel");
    const modalFolderField   = $("#modalFolderField");
    const modalFolderSelect  = $("#modalFolderSelect");
    const modalClose         = $("#modalClose");
    const modalCancel        = $("#modalCancel");
    const modalSubmit        = $("#modalSubmit");
    const sidebarBody        = $("#sidebarBody");
    const sidebarEl          = $("#sidebar");
    const editorPanel        = $("#editorPanel");
    const mobileBackBtn      = $("#mobileBackBtn");

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
            if (subjectCache.length === 0) { toast("먼저 폴더를 만들어주세요."); return; }
            openModal("새 노트", "노트 제목", true, (name) => {
                const subjectId = modalFolderSelect.value ? Number(modalFolderSelect.value) : null;
                if (!subjectId) { toast("폴더를 선택해주세요."); return; }
                createNote(name, subjectId);
            });
        });

        newFolderBtn.addEventListener("click", () => {
            /* [FIX-3] 최상위 폴더 생성 — parentId null */
            openModal("새 폴더", "폴더 이름", false, (name) => createSubject(name, null));
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

        /* [FIX-3] subject 컨텍스트면 해당 subject 하위에 폴더 생성 */
        ctxNewFolder.addEventListener("click", () => {
            const parentId = ctxTarget?.type === "subject"
                ? Number(ctxTarget.subjectId)
                : null;
            closeCtxMenu();
            openModal("새 폴더", "폴더 이름", false, (name) => createSubject(name, parentId));
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

        document.addEventListener("mousedown", (e) => {
            if (ctxMenu.classList.contains("show") && !e.target.closest("#ctxMenu")) closeCtxMenu();
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

        /* [FIX-2] Sidebar body: 루트 드롭 타겟 */
        sidebarBody.addEventListener("dragover", (e) => {
            if (!dnd) return;
            if (e.target.closest(".tree-folder-row")) return;
            if (dnd.type === "note"    && dnd.fromSubjectId === null) return;
            if (dnd.type === "subject" && isSubjectRoot(dnd.subjectId)) return;
            e.preventDefault();
            e.dataTransfer.dropEffect = "move";
            sidebarBody.classList.add("dnd-root-over");
        });
        sidebarBody.addEventListener("dragleave", (e) => {
            if (!sidebarBody.contains(e.relatedTarget))
                sidebarBody.classList.remove("dnd-root-over");
        });
        sidebarBody.addEventListener("drop", (e) => {
            sidebarBody.classList.remove("dnd-root-over");
            if (!dnd) return;
            if (e.target.closest(".tree-folder-row")) return;
            e.preventDefault();
            if (dnd.type === "note"    && dnd.fromSubjectId !== null) moveNote(dnd.noteId, dnd.fromSubjectId, null);
            if (dnd.type === "subject")                                moveSubject(dnd.subjectId, null);
            endDnd();
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
        try {
            subjectCache = await Subject_API.getSubjects();
        } catch (e) {
            toast("폴더 목록을 불러오지 못했습니다.");
            return;
        }

        const frag = document.createDocumentFragment();
        const roots = subjectCache
            .filter(s => (s.parentId ?? null) === null)
            .sort((a, b) => a.name.localeCompare(b.name, "ko"));
        roots.forEach(s => frag.appendChild(makeSubjectItem(s)));

        if (subjectCache.length === 0) {
            const hint = document.createElement("li");
            hint.className   = "tree-empty";
            hint.textContent = "폴더가 없습니다.";
            frag.appendChild(hint);
        }

        treeEl.innerHTML = "";
        treeEl.appendChild(frag);

        noteCount.textContent = subjectCache.length + "개의 폴더";

        if (currentNote) highlightNote(currentNote.id);
    }

    function makeSubjectItem(subject) {
        const children = subjectCache
            .filter(s => s.parentId === subject.id)
            .sort((a, b) => a.name.localeCompare(b.name, "ko"));

        const li = document.createElement("li");
        li.role              = "treeitem";
        li.className         = "tree-folder-item";
        li.draggable         = true;                /* [FIX-2] */
        li.dataset.subjectId = subject.id;

        const row = document.createElement("div");
        row.className = "tree-folder-row";
        row.innerHTML =
            '<svg class="tree-chevron" viewBox="0 0 24 24" fill="none" aria-hidden="true">' +
                '<path d="M9 18l6-6-6-6" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>' +
            '</svg>' +
            '<span class="folder-emoji" aria-hidden="true">\u{1F4C1}</span>' +
            '<span class="tree-folder-name">' + escHtml(subject.name) + '</span>' +
            '<span class="tree-folder-count">' + children.length + '</span>';

        row.addEventListener("click", () => toggleSubjectFolder(li, subject.id));
        row.addEventListener("contextmenu", (e) => {
            e.preventDefault();
            e.stopPropagation();
            openCtxMenu(e, { type: "subject", subjectId: subject.id });
        });

        /* [FIX-2] Subject drag */
        li.addEventListener("dragstart", (e) => {
            if (e.target.closest(".tree-note-row")) return;
            /* 하위 중첩 li에서 bubble된 경우 — 가장 가까운 tree-folder-item이 이 li여야만 처리 */
            if (e.target.closest(".tree-folder-item") !== li) return;
            e.stopPropagation();
            dnd = { type: "subject", subjectId: subject.id, el: li };
            e.dataTransfer.effectAllowed = "move";
            e.dataTransfer.setData("text/plain", "subject");
            setTimeout(() => li.classList.add("dnd-dragging"), 0);
        });
        li.addEventListener("dragend", endDnd);

        /* [FIX-2] Subject row drop target */
        row.addEventListener("dragover", (e) => {
            if (!dnd) return;
            if (dnd.type === "subject") {
                if (String(dnd.subjectId) === String(subject.id)) return;
                if (isSubjectDescendant(dnd.subjectId, subject.id)) return;
            }
            if (dnd.type === "note" && String(dnd.fromSubjectId) === String(subject.id)) return;
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
            if (dnd.type === "note")    moveNote(dnd.noteId, dnd.fromSubjectId, subject.id);
            if (dnd.type === "subject") moveSubject(dnd.subjectId, subject.id);
            endDnd();
        });

        const childrenEl = document.createElement("ul");
        childrenEl.className         = "tree-children";
        childrenEl.role              = "group";
        childrenEl.dataset.subjectId = subject.id;

        children.forEach(c => childrenEl.appendChild(makeSubjectItem(c)));

        li.appendChild(row);
        li.appendChild(childrenEl);

        return li;
    }

    /* ==================================================
        Load Notes Into Folder
        [FIX-1] 닫았다 열어도 중복 방지
        - notesLoaded="1" 이면 스킵
        - 강제 갱신 필요 시 호출 전 "0"으로 세팅
        - 기존 note row를 먼저 제거 후 재삽입 (안전장치)
    ================================================== */
    async function loadNotesIntoFolder(subjectId, childrenEl) {
        if (childrenEl.dataset.notesLoaded === "1") {
            /* 이미 로드됨 — 직접 자식 note row 수만 반환 (중첩 폴더 제외) */
            return childrenEl.querySelectorAll(":scope > .tree-note-row").length;
        }
        /* fetch 시작 전에 즉시 flag 세팅 → 동시 호출로 인한 중복 실행 방지 */
        childrenEl.dataset.notesLoaded = "1";

        let articles = [];
        try {
            articles = await Article_API.getArticlesBySubject(subjectId);
            if (articles.content) articles = articles.content;
        } catch (e) {
            /* 실패 시 flag 초기화해서 재시도 가능하게 */
            childrenEl.dataset.notesLoaded = "0";
            toast("노트 목록을 불러오지 못했습니다.");
            return 0;
        }

        /* 기존 note row 제거 후 이름순 정렬하여 재삽입 */
        childrenEl.querySelectorAll(".tree-note-row").forEach(el => el.remove());
        articles
            .sort((a, b) => (a.title || "").localeCompare(b.title || "", "ko"))
            .forEach(article => childrenEl.appendChild(makeNoteRow(article)));

        /* 실제 로드된 article 수 반환 — 호출자가 badge 업데이트에 사용 */
        return articles.length;
    }

    function makeNoteRow(article) {
        const li = document.createElement("li");
        li.role           = "treeitem";
        li.className      = "tree-note-row";
        li.draggable      = true;                   /* [FIX-2] */
        li.dataset.noteId = article.id;

        li.innerHTML =
            '<svg class="tree-note-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">' +
                '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6Z" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/>' +
                '<path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>' +
            '</svg>' +
            '<span class="tree-note-name">' + escHtml(article.title || "제목 없음") + '</span>' +
            '<span class="tree-note-date">' + shortDate(article.modifiedAt || article.createdAt) + '</span>';

        li.addEventListener("click", () => openNote(article.id));
        li.addEventListener("contextmenu", (e) => {
            e.preventDefault();
            e.stopPropagation();
            openCtxMenu(e, { type: "note", subjectId: article.subjectId, noteId: article.id });
        });

        /* [FIX-2] Note drag */
        li.addEventListener("dragstart", (e) => {
            e.stopPropagation(); /* [FIX] 중첩 li bubble 방지 */
            dnd = { type: "note", noteId: article.id, fromSubjectId: article.subjectId ?? null, el: li };
            e.dataTransfer.effectAllowed = "move";
            e.dataTransfer.setData("text/plain", "note");
            setTimeout(() => li.classList.add("dnd-dragging"), 0);
        });
        li.addEventListener("dragend", endDnd);

        return li;
    }

    /* [FIX-1] 닫을 때 notesLoaded 를 초기화하지 않음
       → 재열기 시 "1"이므로 스킵 (중복 없음) */
    async function toggleSubjectFolder(li, subjectId) {
        const childrenEl = li.querySelector(".tree-children");
        const chevron    = li.querySelector(".tree-chevron");
        const emoji      = li.querySelector(".folder-emoji");
        const isOpen     = !childrenEl.classList.contains("open");

        chevron.classList.toggle("open", isOpen);
        emoji.textContent = isOpen ? "\u{1F4C2}" : "\u{1F4C1}";

        if (isOpen) {
            childrenEl.classList.add("open");
            childrenEl.classList.add("slide-in");
            childrenEl.addEventListener("animationend", () =>
                childrenEl.classList.remove("slide-in")
            , { once: true });
            const articleCount = await loadNotesIntoFolder(subjectId, childrenEl);
            /* badge 갱신 — loadNotesIntoFolder 반환값 직접 사용 (DOM 쿼리 제거) */
            const badge    = li.querySelector(":scope > .tree-folder-row .tree-folder-count");
            const subCount = subjectCache.filter(s => s.parentId === Number(subjectId)).length;
            if (badge) badge.textContent = subCount + articleCount;
        } else {
            childrenEl.classList.remove("open");
        }
    }

    function highlightNote(noteId) {
        document.querySelectorAll(".tree-note-row").forEach(el =>
            el.classList.toggle("active", String(el.dataset.noteId) === String(noteId))
        );
    }

    /* ==================================================
        Drag & Drop  [FIX-2]
    ================================================== */
    function endDnd() {
        if (!dnd) return;
        dnd.el && dnd.el.classList.remove("dnd-dragging");
        document.querySelectorAll(".dnd-over").forEach(el => el.classList.remove("dnd-over"));
        sidebarBody.classList.remove("dnd-root-over");
        dnd = null;
    }

    async function moveNote(noteId, fromSubjectId, toSubjectId) {
        if (String(fromSubjectId) === String(toSubjectId)) return;
        try {
            await Article_API.moveArticle(noteId, toSubjectId);
            toast("노트 이동 완료");
            invalidateFolder(fromSubjectId);
            invalidateFolder(toSubjectId);
            await renderTree();
            if (currentNote && String(currentNote.id) === String(noteId))
                currentNote.subjectId = toSubjectId;
        } catch (e) { toast("노트 이동에 실패했습니다."); }
    }

    async function moveSubject(subjectId, intoSubjectId) {
        if (String(subjectId) === String(intoSubjectId)) return;
        if (intoSubjectId && isSubjectDescendant(subjectId, intoSubjectId)) {
            toast("하위 폴더로 이동할 수 없습니다.");
            return;
        }
        try {
            await Subject_API.moveSubject(subjectId, intoSubjectId ?? null);
            toast("폴더 이동 완료");
            await renderTree();
        } catch (e) { toast("폴더 이동에 실패했습니다."); }
    }

    function isSubjectRoot(subjectId) {
        const s = subjectCache.find(x => String(x.id) === String(subjectId));
        return s ? (s.parentId ?? null) === null : true;
    }

    function isSubjectDescendant(ancestorId, checkId) {
        /* ancestorId 의 자손 전체를 DFS로 수집 후 checkId 포함 여부 확인 */
        function collectDescendants(id, set) {
            subjectCache
                .filter(s => String(s.parentId) === String(id))
                .forEach(s => {
                    set.add(String(s.id));
                    collectDescendants(s.id, set);
                });
        }
        const descendants = new Set();
        collectDescendants(ancestorId, descendants);
        return descendants.has(String(checkId));
    }

    function invalidateFolder(subjectId) {
        if (subjectId == null) return;
        const li = document.querySelector('[data-subject-id="' + subjectId + '"]');
        const ch = li ? li.querySelector(".tree-children") : null;
        if (ch) ch.dataset.notesLoaded = "0";
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

        editorTitle.textContent      = article.title || "제목 없음";
        editorTitle.classList.remove("placeholder");
        editorActions.style.display  = "flex";
        editorEmpty.style.display    = "none";
        editModeBtnText.textContent  = "편집";

        highlightNote(article.id);
        showEditorOnMobile();

        if (article.subjectId) {
            const li = document.querySelector('.tree-folder-item[data-subject-id="' + article.subjectId + '"]');
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
        // 이전에 예약된 타이머가 있으면 모두 취소
        if (mdeTimer !== null)        { clearTimeout(mdeTimer);        mdeTimer        = null; }
        if (mdePreviewTimer !== null) { clearTimeout(mdePreviewTimer); mdePreviewTimer = null; }

        if (mdeInstance) {
            try { mdeInstance.toTextArea(); } catch (e) {}
            mdeInstance = null;
        }
        // toTextArea()가 display를 복원할 수 있으므로 즉시 다시 숨김
        mdeTarget.style.display = "none";

        mdeTimer = setTimeout(() => {
            mdeTimer = null;
            mdeTarget.value = content;   /* initialValue가 ""일 때 EasyMDE가 무시하는 버그 방어 */
            mdeTarget.style.display = "";
            mdeInstance = new EasyMDE({
                element:      mdeTarget,
                initialValue: content,
                spellChecker: false,
                lineWrapping: true,
                placeholder:  "마크다운으로 내용을 작성하세요\u2026",
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
                const mdeContainer = mdeTarget.parentElement;
                if (mdeContainer) mdeContainer.style.visibility = "hidden";
                mdePreviewTimer = setTimeout(() => {
                    mdePreviewTimer = null;
                    if (mdeInstance && !mdeInstance.isPreviewActive()) {
                        mdeInstance.togglePreview();
                    }
                    if (mdeContainer) mdeContainer.style.visibility = "";
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
            toast("이미지 읽는 중\u2026");
            const reader = new FileReader();
            reader.onload = (ev) => {
                const cm  = editor.codemirror;
                const alt = file.name.replace(/\.[^.]+$/, "");
                cm.replaceSelection("![" + alt + "](" + ev.target.result + ")");
                cm.focus();
                toast("이미지 삽입됨 \u2713");
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
            toast("저장되었습니다 \u2713");
            const noteRow = document.querySelector('.tree-note-row[data-note-id="' + currentNote.id + '"]');
            const dateEl  = noteRow ? noteRow.querySelector(".tree-note-date") : null;
            if (dateEl) dateEl.textContent = shortDate(currentNote.modifiedAt);
        } catch (e) {
            toast("저장에 실패했습니다.");
        }
    }

    /* ==================================================
        Clear Editor
    ================================================== */
    function clearEditor() {
        if (mdeTimer !== null)        { clearTimeout(mdeTimer);        mdeTimer        = null; }
        if (mdePreviewTimer !== null) { clearTimeout(mdePreviewTimer); mdePreviewTimer = null; }

        currentNote = null;
        isEditMode  = false;

        if (mdeInstance) {
            try { mdeInstance.toTextArea(); } catch (e) {}
            mdeInstance = null;
        }

        mdeTarget.style.display      = "none";
        editorTitle.textContent      = "노트를 선택하세요";
        editorTitle.classList.add("placeholder");
        editorActions.style.display  = "none";
        editorEmpty.style.display    = "flex";

        document.querySelectorAll(".tree-note-row").forEach(el => el.classList.remove("active"));
        showSidebarOnMobile();
    }

    /* ==================================================
        CRUD - Note
    ================================================== */
    async function createNote(title, subjectId) {
        if (!subjectId) { toast("폴더를 선택해주세요."); return; }

        let article;
        try {
            article = await Article_API.saveArticle({
                title:     title || "제목 없음",
                contents:  "",
                subjectId: subjectId,
                sortOrder: 0,
            });
            toast("'" + title + "' 노트 생성됨");
        } catch (e) {
            toast("노트 생성에 실패했습니다.");
            return;
        }

        const li = document.querySelector('.tree-folder-item[data-subject-id="' + subjectId + '"]');
        if (li) {
            const ch = li.querySelector(".tree-children");
            ch.dataset.notesLoaded = "0";
            if (!ch.classList.contains("open")) {
                await toggleSubjectFolder(li, subjectId);
            } else {
                await loadNotesIntoFolder(subjectId, ch);
            }
        }
        await openNote(article.id);
    }

    /* ==================================================
        CRUD - Subject
        [FIX-3] parentId 인자 추가
    ================================================== */
    async function createSubject(name, parentId) {
        try {
            await Subject_API.saveSubject({ name, parentId: parentId ?? null, sortOrder: 0 });
            toast("'" + name + "' 폴더 생성됨");
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
        [FIX-3] subject 컨텍스트에서 ctxNewFolder 표시
    ================================================== */
    function openCtxMenu(e, target) {
        ctxTarget = target;

        /* 타입별 가시성 테이블: [ctxNewNote, ctxNewFolder, ctxRename, ctxDelete, ctx-sep-rename] */
        const VIS = {
            root:    [false, true,  false, false, false],
            subject: [true,  true,  true,  true,  true ],
            note:    [false, false, true,  true,  true ],
        };
        const ids = ["ctxNewNote", "ctxNewFolder", "ctxRename", "ctxDelete"];
        const vis = VIS[target.type] ?? VIS.note;
        ids.forEach((id, i) => {
            const el = document.getElementById(id);
            if (el) el.style.display = vis[i] ? "flex" : "none";
        });
        const sep = document.querySelector(".ctx-sep-rename");
        if (sep) sep.style.display = vis[4] ? "block" : "none";

        ctxMenu.style.left = Math.min(e.clientX, window.innerWidth  - 170) + "px";
        ctxMenu.style.top  = Math.min(e.clientY, window.innerHeight - 140) + "px";
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
        /* 스택 기반 순회 — 재귀 대비 콜스택 안전, 이름순 정렬 적용 */
        const frag = document.createDocumentFragment();
        const def  = document.createElement("option");
        def.value = ""; def.textContent = "폴더 선택";
        frag.appendChild(def);

        const stack = subjectCache
            .filter(s => (s.parentId ?? null) === null)
            .sort((a, b) => a.name.localeCompare(b.name, "ko"))
            .reverse()
            .map(s => ({ s, depth: 0 }));

        while (stack.length) {
            const { s, depth } = stack.pop();
            const opt = document.createElement("option");
            opt.value       = s.id;
            opt.textContent = "\u00a0\u00a0".repeat(depth * 2) + s.name;
            frag.appendChild(opt);

            subjectCache
                .filter(c => c.parentId === s.id)
                .sort((a, b) => a.name.localeCompare(b.name, "ko"))
                .reverse()
                .forEach(c => stack.push({ s: c, depth: depth + 1 }));
        }

        modalFolderSelect.innerHTML = "";
        modalFolderSelect.appendChild(frag);
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
            if (resp.ok) {
                const data = await resp.json();
                if (!data.authenticated) location.replace('login.html');
            } else {
                location.replace('login.html');
            }
        } catch (e) {
            location.replace('login.html');
        }
    }

    /* ==================================================
        Publish
    ================================================== */
    return { init }
})();

/* ==================================================
    Initialization
================================================== */
(async function init() {
    await Home.init();
})();