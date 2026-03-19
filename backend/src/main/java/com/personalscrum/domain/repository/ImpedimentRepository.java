package com.personalscrum.domain.repository;

import com.personalscrum.domain.entity.Impediment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ImpedimentRepository extends JpaRepository<Impediment, Long> {
    List<Impediment> findBySprintId(Long sprintId);
    List<Impediment> findBySprintIdAndResolved(Long sprintId, boolean resolved);
}
