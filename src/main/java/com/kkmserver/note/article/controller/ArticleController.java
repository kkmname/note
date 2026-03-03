package com.kkmserver.note.article.controller;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.kkmserver.note.article.domain.Article;
import com.kkmserver.note.article.payload.ArticleRequest;
import com.kkmserver.note.article.payload.ArticleResponse;
import com.kkmserver.note.article.service.ArticleService;

import lombok.AllArgsConstructor;

@RestController
@AllArgsConstructor
@RequestMapping("/api/v1/article")
public class ArticleController {

    private final ArticleService service;

    /**
     * path variable comes as string because frontend may send "null".
     */
    @GetMapping("/subject/{subjectId}")
    public ResponseEntity<List<ArticleResponse>> listBySubject(@PathVariable String subjectId) {
        Long id = null;
        if (subjectId != null && !"null".equals(subjectId)) {
            try {
                id = Long.valueOf(subjectId);
            } catch (NumberFormatException e) {
                // ignore, keep as null
            }
        }
        List<ArticleResponse> list = service.findBySubjectId(id).stream()
                .map(ArticleResponse::fromEntity)
                .collect(Collectors.toList());
        return ResponseEntity.ok(list);
    }

    @GetMapping("/{id}")
    public ResponseEntity<ArticleResponse> get(@PathVariable Long id) {
        return service.findById(id)
                .map(ArticleResponse::fromEntity)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<ArticleResponse> create(@RequestBody ArticleRequest req) {
        Article saved = service.create(req);
        return ResponseEntity.ok(ArticleResponse.fromEntity(saved));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ArticleResponse> update(@PathVariable Long id, @RequestBody ArticleRequest req) {
        req.setId(id);
        Article updated = service.update(req);
        return ResponseEntity.ok(ArticleResponse.fromEntity(updated));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(@PathVariable Long id) {
        service.delete(id);
        return ResponseEntity.ok(Map.of("message", "deleted"));
    }

    @PatchMapping("/{id}/move")
    public ResponseEntity<ArticleResponse> move(@PathVariable Long id, @RequestBody Map<String, Long> body) {
        Long subjectId = body.get("subjectId");
        Article moved = service.move(id, subjectId);
        return ResponseEntity.ok(ArticleResponse.fromEntity(moved));
    }
}
