package com.personalscrum.application.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record CreateImpedimentRequest(
        @NotBlank String title,
        String description,
        @NotNull Long sprintId
) {}
