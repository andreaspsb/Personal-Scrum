package com.personalscrum.domain.repository;

import com.personalscrum.domain.entity.Project;
import com.personalscrum.domain.entity.ProjectType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ProjectRepository extends JpaRepository<Project, Long> {
    List<Project> findByUserId(Long userId);
    List<Project> findByUserIdAndType(Long userId, ProjectType type);
    Optional<Project> findByIdAndUserId(Long id, Long userId);
}
