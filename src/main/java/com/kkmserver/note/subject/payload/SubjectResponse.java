package com.kkmserver.note.subject.payload;

import java.time.LocalDate;

import com.kkmserver.note.subject.domain.Subject;

public class SubjectResponse {
    private Long id;
    private String name;
    private Long parentId;
    private Integer sortOrder;
    private LocalDate createdAt;
    private LocalDate modifiedAt;
    private int articleCount;

    public static SubjectResponse fromEntity(Subject s) {
        if (s == null) return null;
        SubjectResponse r = new SubjectResponse();
        r.setId(s.getId());
        r.setName(s.getName());
        r.setParentId(s.getParentId());
        r.setSortOrder(s.getSortOrder());
        r.setCreatedAt(s.getCreatedAt());
        r.setModifiedAt(s.getModifiedAt());
        return r;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public Long getParentId() {
        return parentId;
    }

    public void setParentId(Long parentId) {
        this.parentId = parentId;
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

    public int getArticleCount() {
        return articleCount;
    }

    public void setArticleCount(int articleCount) {
        this.articleCount = articleCount;
    }
}