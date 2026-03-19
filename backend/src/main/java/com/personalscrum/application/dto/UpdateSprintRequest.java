package com.personalscrum.application.dto;

import com.personalscrum.domain.entity.SprintStatus;

import java.time.LocalDate;

public record UpdateSprintRequest(
        String name,
        String goal,
        LocalDate startDate,
        LocalDate endDate,
        SprintStatus status
) {}
