const Image_API = (() => {

    /* ==================================================
        API
    ================================================== */
    async function uploadImage(file, articleId) {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("articleId", articleId);

        const response = await fetch("/api/v1/image", {
            method: "POST",
            body:   formData,
        });

        if (!response.ok) {
            throw new Error("Failed to upload image");
        }
        return await response.json();
    }

    /* ==================================================
        Publish
    ================================================== */
    return { uploadImage };
})();
