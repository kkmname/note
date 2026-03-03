package com.kkmserver.note.subject.controller;

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

import com.kkmserver.note.subject.domain.Subject;
import com.kkmserver.note.subject.payload.SubjectRequest;
import com.kkmserver.note.subject.payload.SubjectResponse;
import com.kkmserver.note.subject.service.SubjectService;

import lombok.AllArgsConstructor;

@RestController
@AllArgsConstructor
@RequestMapping("/api/v1/subject")
public class SubjectController {

    private final SubjectService service;

    @GetMapping
    public ResponseEntity<List<SubjectResponse>> list() {
        List<SubjectResponse> list = service.findAll().stream()
                .map(SubjectResponse::fromEntity)
                .collect(Collectors.toList());
        return ResponseEntity.ok(list);
    }

    @GetMapping("/{id}")
    public ResponseEntity<SubjectResponse> get(@PathVariable Long id) {
        return service.findById(id)
                .map(SubjectResponse::fromEntity)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<SubjectResponse> create(@RequestBody SubjectRequest req) {
        Subject saved = service.save(req);
        return ResponseEntity.ok(SubjectResponse.fromEntity(saved));
    }

    @PutMapping("/{id}")
    public ResponseEntity<SubjectResponse> update(@PathVariable Long id, @RequestBody SubjectRequest req) {
        req.setId(id);
        Subject updated = service.save(req);
        return ResponseEntity.ok(SubjectResponse.fromEntity(updated));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(@PathVariable Long id) {
        service.delete(id);
        return ResponseEntity.ok(Map.of("message", "deleted"));
    }

    @PatchMapping("/{id}/move")
    public ResponseEntity<SubjectResponse> move(@PathVariable Long id, @RequestBody Map<String, Long> body) {
        Long parentId = body.get("parentId");
        Subject moved = service.move(id, parentId);
        return ResponseEntity.ok(SubjectResponse.fromEntity(moved));
    }
}
