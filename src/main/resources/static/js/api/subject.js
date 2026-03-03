const Subject_API = (() => {

    /* ==================================================
        API
    ================================================== */
    async function getSubjects() {
        const response = await fetch("/api/v1/subject");
        if (!response.ok) {
            throw new Error("Failed to fetch subjects");
        }
        return await response.json();
    }

    async function getSubject(id) {
        const response = await fetch(`/api/v1/subject/${id}`);
        if (!response.ok) {
            throw new Error("Failed to fetch subject");
        }
        return await response.json();
    }

    async function saveSubject(subject) {
        const method = subject.id ? "PUT" : "POST";
        const url    = subject.id ? `/api/v1/subject/${subject.id}` : "/api/v1/subject";

        const response = await fetch(url, {
            method:  method,
            headers: { "Content-Type": "application/json" },
            body:    JSON.stringify(subject)
        });

        if (!response.ok) {
            throw new Error("Failed to save subject");
        }
        return await response.json();
    }

    async function deleteSubject(id) {
        const response = await fetch(`/api/v1/subject/${id}`, { method: "DELETE" });
        if (!response.ok) {
            throw new Error("Failed to delete subject");
        }
        return await response.text();
    }

    async function moveSubject(id, parentId) {
        const response = await fetch(`/api/v1/subject/${id}/move`, {
            method:  "PATCH",
            headers: { "Content-Type": "application/json" },
            body:    JSON.stringify({ parentId })
        });
        if (!response.ok) {
            throw new Error("Failed to move subject");
        }
        return await response.json();
    }

    /* ==================================================
        Publish
    ================================================== */
    return {
        getSubjects,
        getSubject,
        saveSubject,
        deleteSubject,
        moveSubject
    }
})();