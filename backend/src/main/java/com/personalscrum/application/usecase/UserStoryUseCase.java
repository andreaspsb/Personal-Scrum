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

import java.util.List;

@Service
@RequiredArgsConstructor
public class UserStoryUseCase {

    private final UserStoryRepository userStoryRepository;
    private final ProjectRepository projectRepository;
    private final SprintRepository sprintRepository;

    @Transactional
    public UserStoryDTO createUserStory(CreateUserStoryRequest request, Long userId) {
        Project project = projectRepository.findByIdAndUserId(request.projectId(), userId)
                .orElseThrow(() -> new ResourceNotFoundException("Project not found"));

        StoryStatus initialStatus = project.getFormat() == ProjectFormat.KANBAN
                ? StoryStatus.TODO
                : StoryStatus.BACKLOG;

        UserStory story = UserStory.builder()
                .title(request.title())
                .description(request.description())
                .acceptanceCriteria(request.acceptanceCriteria())
                .storyPoints(request.storyPoints())
                .priority(request.priority() != null ? request.priority() : Priority.MEDIUM)
                .status(initialStatus)
                .project(project)
                .build();

        return toDTO(userStoryRepository.save(story));
    }

    @Transactional(readOnly = true)
    public List<UserStoryDTO> getBacklog(Long projectId, Long userId) {
        projectRepository.findByIdAndUserId(projectId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Project not found"));
        return userStoryRepository.findByProjectIdAndSprintIsNull(projectId).stream().map(this::toDTO).toList();
    }

    @Transactional(readOnly = true)
    public List<UserStoryDTO> getSprintStories(Long sprintId, Long userId) {
        Sprint sprint = sprintRepository.findById(sprintId)
                .orElseThrow(() -> new ResourceNotFoundException("Sprint not found"));
        if (!sprint.getProject().getUser().getId().equals(userId)) {
            throw new ResourceNotFoundException("Sprint not found");
        }
        return userStoryRepository.findBySprintId(sprintId).stream().map(this::toDTO).toList();
    }

    @Transactional
    public UserStoryDTO updateUserStory(Long id, UpdateUserStoryRequest request, Long userId) {
        UserStory story = findStoryForUser(id, userId);

        if (request.title() != null && !request.title().isBlank()) {
            story.setTitle(request.title());
        }
        if (request.description() != null) {
            story.setDescription(request.description());
        }
        if (request.acceptanceCriteria() != null) {
            story.setAcceptanceCriteria(request.acceptanceCriteria());
        }
        if (request.storyPoints() != null) {
            story.setStoryPoints(request.storyPoints());
        }
        if (request.priority() != null) {
            story.setPriority(request.priority());
        }
        if (request.status() != null) {
            story.setStatus(request.status());
        }
        if (request.sprintId() != null) {
            if (story.getProject().getFormat() != ProjectFormat.SCRUM) {
                throw new IllegalStateException("Only SCRUM projects can assign stories to a sprint");
            }
            Sprint sprint = sprintRepository.findById(request.sprintId())
                    .orElseThrow(() -> new ResourceNotFoundException("Sprint not found"));
            if (!sprint.getProject().getId().equals(story.getProject().getId())) {
                throw new IllegalArgumentException("Story and sprint must belong to the same project");
            }
            story.setSprint(sprint);
        }

        return toDTO(userStoryRepository.save(story));
    }

    @Transactional
    public UserStoryDTO moveToSprint(Long storyId, Long sprintId, Long userId) {
        UserStory story = findStoryForUser(storyId, userId);
        if (story.getProject().getFormat() != ProjectFormat.SCRUM) {
            throw new IllegalStateException("Only SCRUM projects can move stories to a sprint");
        }

        Sprint sprint = sprintRepository.findById(sprintId)
                .orElseThrow(() -> new ResourceNotFoundException("Sprint not found"));

        if (!sprint.getProject().getUser().getId().equals(userId)) {
            throw new ResourceNotFoundException("Sprint not found");
        }
        if (!sprint.getProject().getId().equals(story.getProject().getId())) {
            throw new IllegalArgumentException("Story and sprint must belong to the same project");
        }

        story.setSprint(sprint);
        story.setStatus(StoryStatus.TODO);
        return toDTO(userStoryRepository.save(story));
    }

    @Transactional
    public void deleteUserStory(Long id, Long userId) {
        UserStory story = findStoryForUser(id, userId);
        userStoryRepository.delete(story);
    }

    private UserStory findStoryForUser(Long id, Long userId) {
        UserStory story = userStoryRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User story not found"));
        if (!story.getProject().getUser().getId().equals(userId)) {
            throw new ResourceNotFoundException("User story not found");
        }
        return story;
    }

    private UserStoryDTO toDTO(UserStory story) {
        return new UserStoryDTO(
                story.getId(),
                story.getTitle(),
                story.getDescription(),
                story.getAcceptanceCriteria(),
                story.getStoryPoints(),
                story.getPriority(),
                story.getStatus(),
                story.getSprint() != null ? story.getSprint().getId() : null,
                story.getProject().getId()
        );
    }
}
