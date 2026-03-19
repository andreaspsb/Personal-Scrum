package com.personalscrum.application.dto;

import com.personalscrum.domain.entity.Priority;
import com.personalscrum.domain.entity.StoryStatus;

public record UserStoryDTO(
        Long id,
        String title,
        String description,
        String acceptanceCriteria,
        Integer storyPoints,
        Priority priority,
        StoryStatus status,
        Long sprintId,
        Long projectId
) {}
