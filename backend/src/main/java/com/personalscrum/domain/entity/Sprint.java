package com.personalscrum.domain.entity;

import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "sprints")
@EntityListeners(AuditingEntityListener.class)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Sprint {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    @Column(columnDefinition = "TEXT")
    private String goal;

    private LocalDate startDate;

    private LocalDate endDate;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private SprintStatus status = SprintStatus.PLANNED;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "project_id", nullable = false)
    private Project project;

    @OneToMany(mappedBy = "sprint", cascade = CascadeType.ALL)
    @Builder.Default
    private List<UserStory> userStories = new ArrayList<>();

    @OneToMany(mappedBy = "sprint", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<Impediment> impediments = new ArrayList<>();

    private Integer velocity;

    @CreatedDate
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    @Column(nullable = false)
    private LocalDateTime updatedAt;

    public void start() {
        if (this.status != SprintStatus.PLANNED) {
            throw new IllegalStateException("Only PLANNED sprints can be started");
        }
        this.status = SprintStatus.ACTIVE;
        if (this.startDate == null) {
            this.startDate = LocalDate.now();
        }
    }

    public void complete() {
        if (this.status != SprintStatus.ACTIVE) {
            throw new IllegalStateException("Only ACTIVE sprints can be completed");
        }
        this.status = SprintStatus.COMPLETED;
        this.velocity = calculateVelocity();
        if (this.endDate == null) {
            this.endDate = LocalDate.now();
        }
    }

    private int calculateVelocity() {
        if (this.userStories == null) {
            return 0;
        }
        return this.userStories.stream()
                .filter(s -> s.getStatus() == StoryStatus.DONE)
                .mapToInt(s -> s.getStoryPoints() != null ? s.getStoryPoints() : 0)
                .sum();
    }

    public int getCompletedStoriesCount() {
        if (this.userStories == null) {
            return 0;
        }
        return (int) this.userStories.stream()
                .filter(s -> s.getStatus() == StoryStatus.DONE)
                .count();
    }
}
