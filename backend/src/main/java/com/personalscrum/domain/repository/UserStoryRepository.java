package com.personalscrum.domain.repository;

import com.personalscrum.domain.entity.UserStory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface UserStoryRepository extends JpaRepository<UserStory, Long> {
    List<UserStory> findByProjectId(Long projectId);
    List<UserStory> findBySprintId(Long sprintId);
    List<UserStory> findByProjectIdAndSprintIsNull(Long projectId);
    long countBySprintIdAndStatus(Long sprintId, com.personalscrum.domain.entity.StoryStatus status);
    long countByProjectIdAndStoryPointsIsNull(Long projectId);
    long countByProjectIdAndSprintIsNull(Long projectId);
}
