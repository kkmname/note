/* =============================================================
   script for login.html
============================================================= */
const Login = (() => {
    /* ==================================================
        Initialization
    ================================================== */
    async function init() {
        await serverSessionCheck();
        loadTheme();
        eventHandlers();
    }

    /* ==================================================
        Variables & Constants
    ================================================== */
    let toastTimer       = null;
    const LS_THEME = "journal:theme";
    const EYE_OPEN = `
        <path d="M1 12S5 4 12 4s11 8 11 8-4 8-11 8S1 12 1 12Z" stroke="currentColor" stroke-width="1.6"/>
        <circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="1.6"/>
    `;
    const EYE_OFF = `
        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"
            stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"
            stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
        <line x1="1" y1="1" x2="23" y2="23" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
    `;

    /* ==================================================
        DOM refs
    ================================================== */
    const $                 = (sel) => document.querySelector(sel);
    const themeBtn          = $("#themeBtn");
    const loginForm         = $("#loginForm");
    const loginId           = $("#loginId");
    const loginPw           = $("#loginPw");
    const pwInput           = $("#loginPw");
    const pwToggle          = $("#pwToggle");
    const pwIcon            = $("#pwEyeIcon");
    const toastEl           = $("#toast");
    const toastTxt          = $("#toastText");
    const otpForm           = $("#otpForm");
    const otpCode           = $("#otpCode");
    const otpBackBtn        = $("#otpBackBtn");

    /* ==================================================
        Event Handlers
    ================================================== */
    function eventHandlers() {
        themeBtn.addEventListener("click", toggleTheme);
        loginForm.addEventListener("submit", handleLogin);
        otpForm.addEventListener("submit", handleOtp);
        otpBackBtn.addEventListener("click", showLoginStep);
        otpCode.addEventListener("input", () => $("#otpError").classList.remove("show"));
        pwToggle.addEventListener("click", () => {
            const isHidden   = pwInput.type === "password";
            pwInput.type     = isHidden ? "text" : "password";
            pwIcon.innerHTML = isHidden ? EYE_OFF : EYE_OPEN;
        });
        loginId.addEventListener("input", hideError);
        loginPw.addEventListener("input", hideError);
        loginId.addEventListener("keydown", (e) => {
            if (e.key === "Enter") {
            e.preventDefault();
            loginPw.focus();
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
        toast(next === "dark" ? "Dark mode" : "Light mode");
    }
    
    /* ==================================================
        Toast
    ================================================== */
    function toast(msg) {
        toastTxt.textContent = msg;
        toastEl.classList.add("show");
        clearTimeout(toastTimer);
        toastTimer = setTimeout(() => toastEl.classList.remove("show"), 1600);
    }

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

    function hideError() {
        $("#loginError").classList.remove("show");
    }

    function showError(msg) {
        $("#loginErrorMsg").textContent = msg || "아이디 또는 비밀번호가 올바르지 않습니다.";
        $("#loginError").classList.add("show");
    }

    /* ==================================================
        Login Handler
    ================================================== */
    async function handleLogin(e) {
        e.preventDefault();
        hideError();

        const id = $("#loginId").value.trim();
        const pw = $("#loginPw").value;

        if (!id || !pw) {
            showError("아이디와 비밀번호를 모두 입력해주세요.");
            return;
        }

        try {
            const res = await Login_API.login(id, pw);
            if (res.step === "otp_required") {
                showOtpStep();
            } else {
                toast("로그인 성공");
                setTimeout(() => location.replace("/home"), 650);
            }
        } catch (err) {
            showError("아이디 또는 비밀번호가 올바르지 않습니다.");
            $("#loginPw").value = "";
            $("#loginPw").focus();
            shakeCard();
        }
    }

    async function handleOtp(e) {
        e.preventDefault();
        const code = otpCode.value.trim();
        if (!code) {
            showOtpError("OTP 코드를 입력해주세요.");
            return;
        }
        try {
            await Login_API.verifyOtp(code);
            toast("로그인 성공");
            setTimeout(() => location.replace("/home"), 650);
        } catch (err) {
            showOtpError("OTP 코드가 올바르지 않습니다.");
            otpCode.value = "";
            otpCode.focus();
            shakeCard();
        }
    }

    function showOtpStep() {
        loginForm.style.display = "none";
        otpForm.style.display   = "flex";
        otpCode.value = "";
        $("#otpError").classList.remove("show");
        setTimeout(() => otpCode.focus(), 80);
    }

    function showLoginStep() {
        otpForm.style.display   = "none";
        loginForm.style.display = "flex";
        $("#loginPw").value = "";
        hideError();
    }

    function showOtpError(msg) {
        $("#otpErrorMsg").textContent = msg || "OTP 코드가 올바르지 않습니다.";
        $("#otpError").classList.add("show");
    }

    function shakeCard() {
        const card = document.querySelector(".login-card");
        card.style.animation = "none";
        card.offsetHeight;
        card.style.animation = "shake .35s var(--ease)";
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
    Login.init();
})();
