package com.personalscrum.application.dto;

public record ImpedimentDTO(
        Long id,
        String title,
        String description,
        boolean resolved,
        Long sprintId
) {}
