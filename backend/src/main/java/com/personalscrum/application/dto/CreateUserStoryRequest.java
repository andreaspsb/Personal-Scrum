package com.personalscrum.application.dto;

import com.personalscrum.domain.entity.Priority;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record CreateUserStoryRequest(
        @NotBlank String title,
        String description,
        String acceptanceCriteria,
        Integer storyPoints,
        Priority priority,
        @NotNull Long projectId
) {}
