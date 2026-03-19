package com.personalscrum.domain.repository;

import com.personalscrum.domain.entity.Sprint;
import com.personalscrum.domain.entity.SprintStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface SprintRepository extends JpaRepository<Sprint, Long> {
    List<Sprint> findByProjectId(Long projectId);
    List<Sprint> findByProjectIdAndStatus(Long projectId, SprintStatus status);
    Optional<Sprint> findFirstByProjectIdAndStatus(Long projectId, SprintStatus status);

    @Query("SELECT s FROM Sprint s WHERE s.project.user.id = :userId AND s.status = 'ACTIVE'")
    List<Sprint> findActiveSprintsByUserId(@Param("userId") Long userId);
}
