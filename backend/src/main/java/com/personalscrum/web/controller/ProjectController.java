package com.personalscrum.web.controller;

import com.personalscrum.application.dto.CreateProjectRequest;
import com.personalscrum.application.dto.ProjectDTO;
import com.personalscrum.application.dto.UpdateProjectRequest;
import com.personalscrum.application.usecase.ProjectUseCase;
import com.personalscrum.domain.entity.ProjectType;
import com.personalscrum.web.util.SecurityUtils;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/projects")
@RequiredArgsConstructor
public class ProjectController {

    private final ProjectUseCase projectUseCase;
    private final SecurityUtils securityUtils;

    @GetMapping
    public ResponseEntity<List<ProjectDTO>> getProjects(@RequestParam(required = false) ProjectType type) {
        Long userId = securityUtils.getCurrentUserId();
        if (type != null) {
            return ResponseEntity.ok(projectUseCase.getProjectsByType(userId, type));
        }
        return ResponseEntity.ok(projectUseCase.getProjects(userId));
    }

    @PostMapping
    public ResponseEntity<ProjectDTO> createProject(@Valid @RequestBody CreateProjectRequest request) {
        return ResponseEntity.ok(projectUseCase.createProject(request, securityUtils.getCurrentUserId()));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ProjectDTO> getProject(@PathVariable Long id) {
        return ResponseEntity.ok(projectUseCase.getProject(id, securityUtils.getCurrentUserId()));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ProjectDTO> updateProject(@PathVariable Long id, @Valid @RequestBody UpdateProjectRequest request) {
        return ResponseEntity.ok(projectUseCase.updateProject(id, request, securityUtils.getCurrentUserId()));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteProject(@PathVariable Long id) {
        projectUseCase.deleteProject(id, securityUtils.getCurrentUserId());
        return ResponseEntity.noContent().build();
    }
}
