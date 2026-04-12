package com.personalscrum.application.usecase;

import com.personalscrum.application.dto.*;
import com.personalscrum.domain.entity.*;
import com.personalscrum.domain.repository.ProjectRepository;
import com.personalscrum.domain.repository.SprintRepository;
import com.personalscrum.domain.repository.UserStoryRepository;
import com.personalscrum.web.exception.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class SprintUseCase {

    private final SprintRepository sprintRepository;
    private final ProjectRepository projectRepository;
    private final UserStoryRepository userStoryRepository;

    @Transactional
    public SprintDTO createSprint(CreateSprintRequest request, Long userId) {
        Project project = projectRepository.findByIdAndUserId(request.projectId(), userId)
                .orElseThrow(() -> new ResourceNotFoundException("Project not found"));

        if (project.getFormat() != ProjectFormat.SCRUM) {
            throw new IllegalStateException("Sprints are only available for SCRUM projects");
        }

        Sprint sprint = Sprint.builder()
                .name(request.name())
                .goal(request.goal())
                .startDate(request.startDate())
                .endDate(request.endDate())
                .status(SprintStatus.PLANNED)
                .project(project)
                .build();

        return toDTO(sprintRepository.save(sprint));
    }

    @Transactional(readOnly = true)
    public List<SprintDTO> getSprints(Long projectId, Long userId) {
        projectRepository.findByIdAndUserId(projectId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Project not found"));
        return sprintRepository.findByProjectId(projectId).stream().map(this::toDTO).toList();
    }

    @Transactional(readOnly = true)
    public Optional<SprintDTO> getActiveSprint(Long projectId, Long userId) {
        projectRepository.findByIdAndUserId(projectId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Project not found"));
        return sprintRepository.findFirstByProjectIdAndStatus(projectId, SprintStatus.ACTIVE)
                .map(this::toDTO);
    }

    @Transactional(readOnly = true)
    public SprintDTO getSprint(Long id, Long userId) {
        Sprint sprint = findSprintForUser(id, userId);
        return toDTO(sprint);
    }

    @Transactional
    public SprintDTO updateSprint(Long id, UpdateSprintRequest request, Long userId) {
        Sprint sprint = findSprintForUser(id, userId);

        if (request.name() != null && !request.name().isBlank()) {
            sprint.setName(request.name());
        }
        if (request.goal() != null) {
            sprint.setGoal(request.goal());
        }
        if (request.startDate() != null) {
            sprint.setStartDate(request.startDate());
        }
        if (request.endDate() != null) {
            sprint.setEndDate(request.endDate());
        }
        if (request.status() != null) {
            sprint.setStatus(request.status());
        }

        return toDTO(sprintRepository.save(sprint));
    }

    @Transactional
    public SprintDTO startSprint(Long id, Long userId) {
        Sprint sprint = findSprintForUser(id, userId);
        sprint.start();
        return toDTO(sprintRepository.save(sprint));
    }

    @Transactional
    public SprintDTO completeSprint(Long id, Long userId) {
        Sprint sprint = findSprintForUser(id, userId);
        sprint.complete();
        return toDTO(sprintRepository.save(sprint));
    }

    private Sprint findSprintForUser(Long id, Long userId) {
        Sprint sprint = sprintRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Sprint not found"));
        if (!sprint.getProject().getUser().getId().equals(userId)) {
            throw new ResourceNotFoundException("Sprint not found");
        }
        return sprint;
    }

    SprintDTO toDTO(Sprint sprint) {
        List<UserStory> stories = userStoryRepository.findBySprintId(sprint.getId());
        int completedCount = (int) stories.stream()
                .filter(s -> s.getStatus() == StoryStatus.DONE)
                .count();

        return new SprintDTO(
                sprint.getId(),
                sprint.getName(),
                sprint.getGoal(),
                sprint.getStartDate(),
                sprint.getEndDate(),
                sprint.getStatus(),
                sprint.getProject().getId(),
                sprint.getVelocity(),
                stories.size(),
                completedCount
        );
    }
}
