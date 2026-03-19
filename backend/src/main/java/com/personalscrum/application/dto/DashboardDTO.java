package com.personalscrum.application.dto;

import java.util.List;

public record DashboardDTO(
        List<ProjectDTO> activeProjects,
        List<SprintDTO> activeSprints,
        List<ScrumInsightDTO> insights,
        long totalProjects,
        long totalSprints,
        long completedStories
) {}
