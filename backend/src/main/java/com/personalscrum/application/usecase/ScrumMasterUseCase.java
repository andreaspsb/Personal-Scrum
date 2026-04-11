package com.personalscrum.application.usecase;

import com.personalscrum.application.dto.*;
import com.personalscrum.domain.entity.*;
import com.personalscrum.domain.repository.*;
import com.personalscrum.domain.service.SprintHealthService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class ScrumMasterUseCase {

    private final ProjectRepository projectRepository;
    private final SprintRepository sprintRepository;
    private final UserStoryRepository userStoryRepository;
    private final ImpedimentRepository impedimentRepository;
    private final SprintUseCase sprintUseCase;

    private final SprintHealthService sprintHealthService = new SprintHealthService();

    @Transactional(readOnly = true)
    public DashboardDTO getDashboard(Long userId) {
        List<Project> allProjects = projectRepository.findByUserId(userId);
        List<Sprint> activeSprints = sprintRepository.findActiveSprintsByUserId(userId);

        List<ProjectDTO> activeProjectDTOs = allProjects.stream()
                .filter(p -> p.getStatus() == ProjectStatus.ACTIVE)
                .map(p -> new ProjectDTO(p.getId(), p.getName(), p.getDescription(), p.getType(), p.getFormat(), p.getStatus(), p.getCreatedAt()))
                .toList();

        List<SprintDTO> activeSprintDTOs = activeSprints.stream()
                .map(sprintUseCase::toDTO)
                .toList();

        List<ScrumInsightDTO> insights = generateInsights(userId, allProjects, activeSprints);

        long totalSprints = allProjects.stream()
                .mapToLong(p -> sprintRepository.findByProjectId(p.getId()).size())
                .sum();

        long completedStories = allProjects.stream()
                .flatMap(p -> userStoryRepository.findByProjectId(p.getId()).stream())
                .filter(s -> s.getStatus() == StoryStatus.DONE)
                .count();

        return new DashboardDTO(
                activeProjectDTOs,
                activeSprintDTOs,
                insights,
                allProjects.size(),
                totalSprints,
                completedStories
        );
    }

    @Transactional(readOnly = true)
    public List<ScrumInsightDTO> getInsights(Long userId) {
        List<Project> allProjects = projectRepository.findByUserId(userId);
        List<Sprint> activeSprints = sprintRepository.findActiveSprintsByUserId(userId);
        return generateInsights(userId, allProjects, activeSprints);
    }

    private List<ScrumInsightDTO> generateInsights(Long userId, List<Project> projects, List<Sprint> activeSprints) {
        List<ScrumInsightDTO> insights = new ArrayList<>();

        // Filtrar apenas projetos SCRUM para insights específicos de Sprint
        List<Project> scrumProjects = projects.stream()
                .filter(p -> p.getFormat() == ProjectFormat.SCRUM)
                .toList();

        for (Sprint sprint : activeSprints) {
            // Pular sprints de projetos KANBAN
            if (sprint.getProject().getFormat() != ProjectFormat.SCRUM) continue;
            List<UserStory> stories = userStoryRepository.findBySprintId(sprint.getId());
            SprintHealthService.SprintHealth health = sprintHealthService.calculateHealthScore(sprint, stories);

            if (sprint.getEndDate() != null) {
                long daysLeft = LocalDate.now().until(sprint.getEndDate()).getDays();
                long totalStories = stories.size();
                long completedStories = stories.stream().filter(s -> s.getStatus() == StoryStatus.DONE).count();
                double completionPct = totalStories > 0 ? (double) completedStories / totalStories * 100 : 0;

                String severity;
                if (daysLeft <= 1 && completionPct < 80) {
                    severity = "CRITICAL";
                } else if (daysLeft <= 3 && completionPct < 50) {
                    severity = "WARNING";
                } else if (daysLeft <= 2) {
                    severity = "WARNING";
                } else {
                    severity = "INFO";
                }

                if (daysLeft >= 0 && daysLeft <= 5) {
                    insights.add(new ScrumInsightDTO(
                            "SPRINT_ENDING_SOON",
                            String.format("Sprint '%s' is ending in %d day(s) with %.0f%% completion", sprint.getName(), daysLeft, completionPct),
                            severity,
                            sprint.getId(),
                            sprint.getProject().getId()
                    ));
                } else if (daysLeft < 0) {
                    insights.add(new ScrumInsightDTO(
                            "SPRINT_OVERDUE",
                            String.format("Sprint '%s' is overdue by %d day(s) with %.0f%% completion", sprint.getName(), Math.abs(daysLeft), completionPct),
                            "CRITICAL",
                            sprint.getId(),
                            sprint.getProject().getId()
                    ));
                }
            }

            if (sprint.getGoal() == null || sprint.getGoal().isBlank()) {
                insights.add(new ScrumInsightDTO(
                        "NO_SPRINT_GOAL",
                        String.format("Sprint '%s' has no goal defined. A clear goal helps the team stay focused.", sprint.getName()),
                        "WARNING",
                        sprint.getId(),
                        sprint.getProject().getId()
                ));
            }

            List<Impediment> unresolvedImpediments = impedimentRepository.findBySprintIdAndResolved(sprint.getId(), false);
            if (!unresolvedImpediments.isEmpty()) {
                insights.add(new ScrumInsightDTO(
                        "UNRESOLVED_IMPEDIMENTS",
                        String.format("Sprint '%s' has %d unresolved impediment(s). Address them to keep the team unblocked.", sprint.getName(), unresolvedImpediments.size()),
                        "WARNING",
                        sprint.getId(),
                        sprint.getProject().getId()
                ));
            }

            stories.stream()
                    .filter(s -> s.getStatus() == StoryStatus.IN_PROGRESS)
                    .forEach(s -> {
                        if (s.getUpdatedAt() != null) {
                            long daysInProgress = s.getUpdatedAt().toLocalDate().until(LocalDate.now()).getDays();
                            if (daysInProgress >= 3) {
                                insights.add(new ScrumInsightDTO(
                                        "STORY_STUCK_IN_PROGRESS",
                                        String.format("Story '%s' has been IN PROGRESS for %d days. Consider reviewing or splitting it.", s.getTitle(), daysInProgress),
                                        "WARNING",
                                        sprint.getId(),
                                        sprint.getProject().getId()
                                ));
                            }
                        }
                    });
        }

        for (Project project : scrumProjects) {
            if (project.getStatus() != ProjectStatus.ACTIVE) continue;

            List<Sprint> projectSprints = sprintRepository.findByProjectIdAndStatus(project.getId(), SprintStatus.ACTIVE);
            if (projectSprints.isEmpty()) {
                insights.add(new ScrumInsightDTO(
                        "NO_ACTIVE_SPRINT",
                        String.format("Project '%s' has no active sprint. Consider planning and starting a sprint.", project.getName()),
                        "INFO",
                        null,
                        project.getId()
                ));
            }

            long storiesWithoutPoints = userStoryRepository.countByProjectIdAndStoryPointsIsNull(project.getId());
            if (storiesWithoutPoints > 0) {
                insights.add(new ScrumInsightDTO(
                        "STORIES_WITHOUT_POINTS",
                        String.format("Project '%s' has %d story/stories without story points. Estimate them to improve sprint planning.", project.getName(), storiesWithoutPoints),
                        "INFO",
                        null,
                        project.getId()
                ));
            }

            long backlogSize = userStoryRepository.countByProjectIdAndSprintIsNull(project.getId());
            if (backlogSize > 20) {
                insights.add(new ScrumInsightDTO(
                        "LARGE_BACKLOG",
                        String.format("Project '%s' has %d items in the backlog. Consider grooming and prioritizing.", project.getName(), backlogSize),
                        "INFO",
                        null,
                        project.getId()
                ));
            }
        }

        return insights;
    }
}
