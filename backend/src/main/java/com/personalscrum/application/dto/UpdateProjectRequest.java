package com.personalscrum.application.dto;

import com.personalscrum.domain.entity.ProjectStatus;

public record UpdateProjectRequest(
        String name,
        String description,
        ProjectStatus status
) {}
