package com.personalscrum.application.dto;

public record AuthResponse(
        String token,
        String refreshToken,
        UserDTO user
) {}
