package com.personalscrum.application.dto;

import com.personalscrum.domain.entity.ProjectType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record CreateProjectRequest(
        @NotBlank String name,
        String description,
        @NotNull ProjectType type
) {}
