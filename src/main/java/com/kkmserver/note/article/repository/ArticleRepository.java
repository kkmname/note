package com.kkmserver.note.article.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import com.kkmserver.note.article.domain.Article;

@Repository
public interface ArticleRepository extends JpaRepository<Article, Long> {
    List<Article> findBySubjectId(Long subjectId);
    List<Article> findBySubjectIdIsNull();

    @Query("SELECT a.subjectId, COUNT(a) FROM Article a WHERE a.subjectId IS NOT NULL GROUP BY a.subjectId")
    List<Object[]> countGroupedBySubjectId();
}
