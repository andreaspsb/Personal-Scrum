package com.personalscrum.application.usecase;

import com.personalscrum.application.dto.*;
import com.personalscrum.domain.entity.*;
import com.personalscrum.domain.repository.ProjectRepository;
import com.personalscrum.domain.repository.UserRepository;
import com.personalscrum.web.exception.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class ProjectUseCase {

    private final ProjectRepository projectRepository;
    private final UserRepository userRepository;

    @Transactional
    public ProjectDTO createProject(CreateProjectRequest request, Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        Project project = Project.builder()
                .name(request.name())
                .description(request.description())
                .type(request.type())
                .status(ProjectStatus.ACTIVE)
                .user(user)
                .build();

        return toDTO(projectRepository.save(project));
    }

    @Transactional(readOnly = true)
    public List<ProjectDTO> getProjects(Long userId) {
        return projectRepository.findByUserId(userId).stream().map(this::toDTO).toList();
    }

    @Transactional(readOnly = true)
    public List<ProjectDTO> getProjectsByType(Long userId, ProjectType type) {
        return projectRepository.findByUserIdAndType(userId, type).stream().map(this::toDTO).toList();
    }

    @Transactional(readOnly = true)
    public ProjectDTO getProject(Long id, Long userId) {
        Project project = findProjectForUser(id, userId);
        return toDTO(project);
    }

    @Transactional
    public ProjectDTO updateProject(Long id, UpdateProjectRequest request, Long userId) {
        Project project = findProjectForUser(id, userId);

        if (request.name() != null && !request.name().isBlank()) {
            project.setName(request.name());
        }
        if (request.description() != null) {
            project.setDescription(request.description());
        }
        if (request.status() != null) {
            project.setStatus(request.status());
        }

        return toDTO(projectRepository.save(project));
    }

    @Transactional
    public void deleteProject(Long id, Long userId) {
        Project project = findProjectForUser(id, userId);
        projectRepository.delete(project);
    }

    private Project findProjectForUser(Long id, Long userId) {
        return projectRepository.findByIdAndUserId(id, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Project not found"));
    }

    private ProjectDTO toDTO(Project project) {
        return new ProjectDTO(
                project.getId(),
                project.getName(),
                project.getDescription(),
                project.getType(),
                project.getStatus(),
                project.getCreatedAt()
        );
    }
}
