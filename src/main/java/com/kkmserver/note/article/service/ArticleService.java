package com.kkmserver.note.article.service;

import java.util.List;
import java.util.Optional;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.kkmserver.note.article.domain.Article;
import com.kkmserver.note.article.payload.ArticleRequest;
import com.kkmserver.note.article.repository.ArticleRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class ArticleService {

    private final ArticleRepository repository;

    public List<Article> findBySubjectId(Long subjectId) {
        if (subjectId == null) {
            return repository.findBySubjectIdIsNull();
        }
        return repository.findBySubjectId(subjectId);
    }

    public Optional<Article> findById(Long id) {
        return repository.findById(id);
    }

    @Transactional
    public Article create(ArticleRequest req) {
        Article a = new Article();
        a.setTitle(req.getTitle());
        a.setDescription(req.getDescription());
        a.setContents(req.getContents());
        a.setSubjectId(req.getSubjectId());
        if (req.getSortOrder() != null) {
            a.setSortOrder(req.getSortOrder());
        }
        return repository.save(a);
    }

    @Transactional
    public Article update(ArticleRequest req) {
        Article a = repository.findById(req.getId())
                    .orElseThrow(() -> new IllegalArgumentException("Article not found"));
        if (req.getTitle() != null) {
            a.setTitle(req.getTitle());
        }
        a.setDescription(req.getDescription());
        a.setContents(req.getContents());
        // when subjectId is absent (null) we leave the current value in place
        if (req.getSubjectId() != null) {
            a.setSubjectId(req.getSubjectId());
        }
        if (req.getSortOrder() != null) {
            a.setSortOrder(req.getSortOrder());
        }
        return repository.save(a);
    }

    @Transactional
    public void delete(Long id) {
        repository.deleteById(id);
    }

    @Transactional
    public Article move(Long id, Long subjectId) {
        Article a = repository.findById(id)
                    .orElseThrow(() -> new IllegalArgumentException("Article not found"));
        a.setSubjectId(subjectId);
        return repository.save(a);
    }
}
