
const Article_API = (() => {

    /* ==================================================
        API
    ================================================== */
    async function getArticlesBySubject(subjectId) {
        const response = await fetch(`/api/v1/article/subject/${subjectId}`);
        if (!response.ok) {
            throw new Error("Failed to fetch articles");
        }
        return await response.json();
    }

    async function getArticle(id) {
        const response = await fetch(`/api/v1/article/${id}`);
        if (!response.ok) {
            throw new Error("Failed to fetch article");
        }
        return await response.json();
    }

    async function saveArticle(article) {
        const method = article.id ? "PUT" : "POST";
        const url    = article.id ? `/api/v1/article/${article.id}` : "/api/v1/article";

        const response = await fetch(url, {
            method:  method,
            headers: { "Content-Type": "application/json" },
            body:    JSON.stringify(article)
        });

        if (!response.ok) {
            throw new Error("Failed to save article");
        }
        return await response.json();
    }

    async function deleteArticle(id) {
        const response = await fetch(`/api/v1/article/${id}`, { method: "DELETE" });
        if (!response.ok) {
            throw new Error("Failed to delete article");
        }
        return await response.text();
    }

    async function moveArticle(id, subjectId) {
        const response = await fetch(`/api/v1/article/${id}/move`, {
            method:  "PATCH",
            headers: { "Content-Type": "application/json" },
            body:    JSON.stringify({ subjectId })
        });
        if (!response.ok) {
            throw new Error("Failed to move article");
        }
        return await response.json();
    }

    /* ==================================================
        Publish
    ================================================== */
    return {
        getArticlesBySubject,
        getArticle,
        saveArticle,
        deleteArticle,
        moveArticle
    }
})();