package com.personalscrum.application.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;

public record CreateSprintRequest(
        @NotBlank String name,
        String goal,
        LocalDate startDate,
        LocalDate endDate,
        @NotNull Long projectId
) {}
