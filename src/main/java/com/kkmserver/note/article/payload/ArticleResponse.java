package com.kkmserver.note.article.payload;

import java.time.LocalDate;

import com.kkmserver.note.article.domain.Article;

public class ArticleResponse {
    private Long id;
    private String title;
    private String description;
    private String contents;
    private Long subjectId;
    private Integer sortOrder;
    private LocalDate createdAt;
    private LocalDate modifiedAt;

    public static ArticleResponse fromEntity(Article a) {
        if (a == null) return null;
        ArticleResponse r = new ArticleResponse();
        r.setId(a.getId());
        r.setTitle(a.getTitle());
        r.setDescription(a.getDescription());
        r.setContents(a.getContents());
        r.setSubjectId(a.getSubjectId());
        r.setSortOrder(a.getSortOrder());
        r.setCreatedAt(a.getCreatedAt());
        r.setModifiedAt(a.getModifiedAt());
        return r;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public String getContents() {
        return contents;
    }

    public void setContents(String contents) {
        this.contents = contents;
    }

    public Long getSubjectId() {
        return subjectId;
    }

    public void setSubjectId(Long subjectId) {
        this.subjectId = subjectId;
    }

    public Integer getSortOrder() {
        return sortOrder;
    }

    public void setSortOrder(Integer sortOrder) {
        this.sortOrder = sortOrder;
    }

    public LocalDate getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDate createdAt) {
        this.createdAt = createdAt;
    }

    public LocalDate getModifiedAt() {
        return modifiedAt;
    }

    public void setModifiedAt(LocalDate modifiedAt) {
        this.modifiedAt = modifiedAt;
    }
}