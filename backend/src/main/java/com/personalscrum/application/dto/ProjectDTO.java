package com.personalscrum.application.dto;

import com.personalscrum.domain.entity.ProjectStatus;
import com.personalscrum.domain.entity.ProjectType;

import java.time.LocalDateTime;

public record ProjectDTO(
        Long id,
        String name,
        String description,
        ProjectType type,
        ProjectStatus status,
        LocalDateTime createdAt
) {}
