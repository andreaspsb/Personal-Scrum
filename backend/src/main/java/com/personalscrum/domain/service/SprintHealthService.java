package com.personalscrum.domain.service;

import com.personalscrum.domain.entity.Sprint;
import com.personalscrum.domain.entity.StoryStatus;
import com.personalscrum.domain.entity.UserStory;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

public class SprintHealthService {

    public record SprintHealth(int score, HealthStatus status, List<String> issues) {}

    public enum HealthStatus { HEALTHY, AT_RISK, CRITICAL }

    public SprintHealth calculateHealthScore(Sprint sprint, List<UserStory> stories) {
        List<String> issues = new ArrayList<>();
        int score = 100;

        if (sprint.getGoal() == null || sprint.getGoal().isBlank()) {
            issues.add("Sprint has no goal defined");
            score -= 15;
        }

        if (stories.isEmpty()) {
            issues.add("Sprint has no user stories");
            score -= 20;
        } else {
            long totalStories = stories.size();
            long doneStories = stories.stream()
                    .filter(s -> s.getStatus() == StoryStatus.DONE)
                    .count();
            double completionRate = (double) doneStories / totalStories;

            if (sprint.getEndDate() != null) {
                LocalDate today = LocalDate.now();
                if (today.isAfter(sprint.getEndDate())) {
                    issues.add("Sprint is overdue");
                    score -= 30;
                } else if (!today.isBefore(sprint.getStartDate())) {
                    long totalDays = sprint.getStartDate().until(sprint.getEndDate()).getDays();
                    long elapsedDays = sprint.getStartDate().until(today).getDays();
                    if (totalDays > 0) {
                        double timeElapsed = (double) elapsedDays / totalDays;
                        if (timeElapsed > 0.5 && completionRate < 0.25) {
                            issues.add("Sprint is more than halfway done but less than 25% of stories completed");
                            score -= 20;
                        } else if (timeElapsed > 0.75 && completionRate < 0.5) {
                            issues.add("Sprint is 75% done but less than 50% of stories completed");
                            score -= 15;
                        }
                    }
                }
            }

            if (completionRate < 0.1 && !stories.isEmpty()) {
                issues.add("Very low story completion rate (" + Math.round(completionRate * 100) + "%)");
                score -= 10;
            }
        }

        boolean hasUnresolvedImpediments = sprint.getImpediments() != null &&
                sprint.getImpediments().stream().anyMatch(i -> !i.isResolved());
        if (hasUnresolvedImpediments) {
            issues.add("Sprint has unresolved impediments");
            score -= 15;
        }

        score = Math.max(0, score);

        HealthStatus healthStatus;
        if (score >= 70) {
            healthStatus = HealthStatus.HEALTHY;
        } else if (score >= 40) {
            healthStatus = HealthStatus.AT_RISK;
        } else {
            healthStatus = HealthStatus.CRITICAL;
        }

        return new SprintHealth(score, healthStatus, issues);
    }
}
