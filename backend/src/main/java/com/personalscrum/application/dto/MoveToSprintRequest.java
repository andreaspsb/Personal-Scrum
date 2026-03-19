package com.personalscrum.application.dto;

import jakarta.validation.constraints.NotNull;

public record MoveToSprintRequest(@NotNull Long sprintId) {}
