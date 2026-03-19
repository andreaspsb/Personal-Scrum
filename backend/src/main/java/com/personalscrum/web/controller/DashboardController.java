package com.personalscrum.web.controller;

import com.personalscrum.application.dto.DashboardDTO;
import com.personalscrum.application.dto.ScrumInsightDTO;
import com.personalscrum.application.usecase.ScrumMasterUseCase;
import com.personalscrum.web.util.SecurityUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/dashboard")
@RequiredArgsConstructor
public class DashboardController {

    private final ScrumMasterUseCase scrumMasterUseCase;
    private final SecurityUtils securityUtils;

    @GetMapping
    public ResponseEntity<DashboardDTO> getDashboard() {
        return ResponseEntity.ok(scrumMasterUseCase.getDashboard(securityUtils.getCurrentUserId()));
    }

    @GetMapping("/insights")
    public ResponseEntity<List<ScrumInsightDTO>> getInsights() {
        return ResponseEntity.ok(scrumMasterUseCase.getInsights(securityUtils.getCurrentUserId()));
    }
}
