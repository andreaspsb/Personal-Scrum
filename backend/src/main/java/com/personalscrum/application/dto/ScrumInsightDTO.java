package com.personalscrum.application.dto;

public record ScrumInsightDTO(
        String type,
        String message,
        String severity,
        Long sprintId,
        Long projectId
) {}
