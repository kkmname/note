package com.kkmserver.note.subject.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.kkmserver.note.subject.domain.Subject;

@Repository
public interface SubjectRepository extends JpaRepository<Subject, Long> {
    // additional query methods can be added if needed
}
