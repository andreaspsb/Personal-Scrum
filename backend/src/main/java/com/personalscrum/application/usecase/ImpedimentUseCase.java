package com.personalscrum.application.usecase;

import com.personalscrum.application.dto.*;
import com.personalscrum.domain.entity.Impediment;
import com.personalscrum.domain.entity.Sprint;
import com.personalscrum.domain.repository.ImpedimentRepository;
import com.personalscrum.domain.repository.SprintRepository;
import com.personalscrum.web.exception.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class ImpedimentUseCase {

    private final ImpedimentRepository impedimentRepository;
    private final SprintRepository sprintRepository;

    @Transactional
    public ImpedimentDTO createImpediment(CreateImpedimentRequest request, Long userId) {
        Sprint sprint = findSprintForUser(request.sprintId(), userId);

        Impediment impediment = Impediment.builder()
                .title(request.title())
                .description(request.description())
                .resolved(false)
                .sprint(sprint)
                .build();

        return toDTO(impedimentRepository.save(impediment));
    }

    @Transactional(readOnly = true)
    public List<ImpedimentDTO> getImpediments(Long sprintId, Long userId) {
        findSprintForUser(sprintId, userId);
        return impedimentRepository.findBySprintId(sprintId).stream().map(this::toDTO).toList();
    }

    @Transactional
    public ImpedimentDTO resolveImpediment(Long id, Long userId) {
        Impediment impediment = impedimentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Impediment not found"));

        if (!impediment.getSprint().getProject().getUser().getId().equals(userId)) {
            throw new ResourceNotFoundException("Impediment not found");
        }

        impediment.setResolved(true);
        return toDTO(impedimentRepository.save(impediment));
    }

    private Sprint findSprintForUser(Long sprintId, Long userId) {
        Sprint sprint = sprintRepository.findById(sprintId)
                .orElseThrow(() -> new ResourceNotFoundException("Sprint not found"));
        if (!sprint.getProject().getUser().getId().equals(userId)) {
            throw new ResourceNotFoundException("Sprint not found");
        }
        return sprint;
    }

    private ImpedimentDTO toDTO(Impediment impediment) {
        return new ImpedimentDTO(
                impediment.getId(),
                impediment.getTitle(),
                impediment.getDescription(),
                impediment.isResolved(),
                impediment.getSprint().getId()
        );
    }
}
