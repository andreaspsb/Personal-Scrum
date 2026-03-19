package com.personalscrum.web.controller;

import com.personalscrum.application.dto.CreateImpedimentRequest;
import com.personalscrum.application.dto.ImpedimentDTO;
import com.personalscrum.application.usecase.ImpedimentUseCase;
import com.personalscrum.web.util.SecurityUtils;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/impediments")
@RequiredArgsConstructor
public class ImpedimentController {

    private final ImpedimentUseCase impedimentUseCase;
    private final SecurityUtils securityUtils;

    @GetMapping
    public ResponseEntity<List<ImpedimentDTO>> getImpediments(@RequestParam Long sprintId) {
        return ResponseEntity.ok(impedimentUseCase.getImpediments(sprintId, securityUtils.getCurrentUserId()));
    }

    @PostMapping
    public ResponseEntity<ImpedimentDTO> createImpediment(@Valid @RequestBody CreateImpedimentRequest request) {
        return ResponseEntity.ok(impedimentUseCase.createImpediment(request, securityUtils.getCurrentUserId()));
    }

    @PostMapping("/{id}/resolve")
    public ResponseEntity<ImpedimentDTO> resolveImpediment(@PathVariable Long id) {
        return ResponseEntity.ok(impedimentUseCase.resolveImpediment(id, securityUtils.getCurrentUserId()));
    }
}
