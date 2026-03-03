package com.kkmserver.note.subject.service;

import java.util.List;
import java.util.Optional;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.kkmserver.note.subject.domain.Subject;
import com.kkmserver.note.subject.payload.SubjectRequest;
import com.kkmserver.note.subject.repository.SubjectRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class SubjectService {

    private final SubjectRepository repository;

    public List<Subject> findAll() {
        return repository.findAll();
    }

    public Optional<Subject> findById(Long id) {
        return repository.findById(id);
    }

    @Transactional
    public Subject save(SubjectRequest req) {
        Subject s;
        if (req.getId() != null) {
            s = repository.findById(req.getId()).orElse(new Subject());
        } else {
            s = new Subject();
        }
        if (req.getName() != null) {
            s.setName(req.getName());
        }
        s.setParentId(req.getParentId());
        if (req.getSortOrder() != null) {
            s.setSortOrder(req.getSortOrder());
        }
        return repository.save(s);
    }

    @Transactional
    public void delete(Long id) {
        repository.deleteById(id);
    }

    @Transactional
    public Subject move(Long id, Long parentId) {
        if (id != null && id.equals(parentId)) {
            throw new IllegalArgumentException("Cannot move subject into itself");
        }
        if (parentId != null && isDescendant(id, parentId)) {
            throw new IllegalArgumentException("Cannot move subject into its descendant");
        }
        Subject s = repository.findById(id)
                              .orElseThrow(() -> new IllegalArgumentException("Subject not found"));
        s.setParentId(parentId);
        return repository.save(s);
    }

    /**
     * Walk upwards from checkId and see if we encounter ancestorId.
     */
    private boolean isDescendant(Long ancestorId, Long checkId) {
        Long current = checkId;
        while (current != null) {
            if (current.equals(ancestorId)) {
                return true;
            }
            Optional<Subject> opt = repository.findById(current);
            if (opt.isEmpty()) break;
            current = opt.get().getParentId();
        }
        return false;
    }
}
