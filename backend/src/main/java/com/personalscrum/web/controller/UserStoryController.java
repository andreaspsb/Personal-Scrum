package com.personalscrum.web.controller;

import com.personalscrum.application.dto.CreateUserStoryRequest;
import com.personalscrum.application.dto.MoveToSprintRequest;
import com.personalscrum.application.dto.UpdateUserStoryRequest;
import com.personalscrum.application.dto.UserStoryDTO;
import com.personalscrum.application.usecase.UserStoryUseCase;
import com.personalscrum.web.util.SecurityUtils;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/stories")
@RequiredArgsConstructor
public class UserStoryController {

    private final UserStoryUseCase userStoryUseCase;
    private final SecurityUtils securityUtils;

    @GetMapping
    public ResponseEntity<List<UserStoryDTO>> getStories(
            @RequestParam(required = false) Long projectId,
            @RequestParam(required = false) Long sprintId) {
        Long userId = securityUtils.getCurrentUserId();
        if (sprintId != null) {
            return ResponseEntity.ok(userStoryUseCase.getSprintStories(sprintId, userId));
        }
        if (projectId != null) {
            return ResponseEntity.ok(userStoryUseCase.getBacklog(projectId, userId));
        }
        return ResponseEntity.badRequest().build();
    }

    @PostMapping
    public ResponseEntity<UserStoryDTO> createStory(@Valid @RequestBody CreateUserStoryRequest request) {
        return ResponseEntity.ok(userStoryUseCase.createUserStory(request, securityUtils.getCurrentUserId()));
    }

    @PutMapping("/{id}")
    public ResponseEntity<UserStoryDTO> updateStory(@PathVariable Long id, @Valid @RequestBody UpdateUserStoryRequest request) {
        return ResponseEntity.ok(userStoryUseCase.updateUserStory(id, request, securityUtils.getCurrentUserId()));
    }

    @PostMapping("/{id}/move-to-sprint")
    public ResponseEntity<UserStoryDTO> moveToSprint(@PathVariable Long id, @Valid @RequestBody MoveToSprintRequest request) {
        return ResponseEntity.ok(userStoryUseCase.moveToSprint(id, request.sprintId(), securityUtils.getCurrentUserId()));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteStory(@PathVariable Long id) {
        userStoryUseCase.deleteUserStory(id, securityUtils.getCurrentUserId());
        return ResponseEntity.noContent().build();
    }
}
