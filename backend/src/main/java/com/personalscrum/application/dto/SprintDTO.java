package com.personalscrum.application.dto;

import com.personalscrum.domain.entity.SprintStatus;

import java.time.LocalDate;

public record SprintDTO(
        Long id,
        String name,
        String goal,
        LocalDate startDate,
        LocalDate endDate,
        SprintStatus status,
        Long projectId,
        Integer velocity,
        int storyCount,
        int completedStoryCount
) {}
