package com.personalscrum.web.controller;

import com.personalscrum.application.dto.CreateSprintRequest;
import com.personalscrum.application.dto.SprintDTO;
import com.personalscrum.application.dto.UpdateSprintRequest;
import com.personalscrum.application.usecase.SprintUseCase;
import com.personalscrum.web.util.SecurityUtils;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/sprints")
@RequiredArgsConstructor
public class SprintController {

    private final SprintUseCase sprintUseCase;
    private final SecurityUtils securityUtils;

    @GetMapping
    public ResponseEntity<List<SprintDTO>> getSprints(@RequestParam Long projectId) {
        return ResponseEntity.ok(sprintUseCase.getSprints(projectId, securityUtils.getCurrentUserId()));
    }

    @PostMapping
    public ResponseEntity<SprintDTO> createSprint(@Valid @RequestBody CreateSprintRequest request) {
        return ResponseEntity.ok(sprintUseCase.createSprint(request, securityUtils.getCurrentUserId()));
    }

    @GetMapping("/{id}")
    public ResponseEntity<SprintDTO> getSprint(@PathVariable Long id) {
        return ResponseEntity.ok(sprintUseCase.getSprint(id, securityUtils.getCurrentUserId()));
    }

    @PutMapping("/{id}")
    public ResponseEntity<SprintDTO> updateSprint(@PathVariable Long id, @Valid @RequestBody UpdateSprintRequest request) {
        return ResponseEntity.ok(sprintUseCase.updateSprint(id, request, securityUtils.getCurrentUserId()));
    }

    @PostMapping("/{id}/start")
    public ResponseEntity<SprintDTO> startSprint(@PathVariable Long id) {
        return ResponseEntity.ok(sprintUseCase.startSprint(id, securityUtils.getCurrentUserId()));
    }

    @PostMapping("/{id}/complete")
    public ResponseEntity<SprintDTO> completeSprint(@PathVariable Long id) {
        return ResponseEntity.ok(sprintUseCase.completeSprint(id, securityUtils.getCurrentUserId()));
    }
}
