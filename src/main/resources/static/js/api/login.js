const Login_API = (() => {

    /* ==================================================
        API
    ================================================== */
    async function login(email, password) {
        const response = await fetch('/api/v1/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });
        if (!response.ok) {
            throw new Error('login failed');
        }
        return await response.json();
    }

    async function status() {
        const resp = await fetch('/api/v1/auth/status');
        if (!resp.ok) {
            throw new Error('not authenticated');
        }
        return resp.json();
    }

    async function logout() {
        const resp = await fetch('/api/v1/auth/logout', { method: 'POST' });
        if (!resp.ok) {
            throw new Error('logout failed');
        }
        return resp.json();
    }
    
    /* ==================================================
        Publish
    ================================================== */
    return {
        login,
        status,
        logout
    }
})();