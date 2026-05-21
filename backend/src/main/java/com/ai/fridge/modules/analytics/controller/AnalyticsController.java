package com.ai.fridge.modules.analytics.controller;

import com.ai.fridge.common.base.ApiResponse;
import com.ai.fridge.common.dto.AnalyticsEventRequest;
import com.ai.fridge.common.dto.AnalyticsEventResponse;
import com.ai.fridge.modules.analytics.service.AnalyticsEventService;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@Slf4j
@RestController
@RequestMapping("/api/v1/analytics")
@RequiredArgsConstructor
public class AnalyticsController {

  private final AnalyticsEventService analyticsEventService;

  @PostMapping("/events")
  public ResponseEntity<ApiResponse<AnalyticsEventResponse>> createEvent(
      @RequestHeader(value = "X-User-Id", required = true) Long userId,
      @Valid @RequestBody AnalyticsEventRequest request) {

    log.info("POST /api/v1/analytics/events - Create analytics event for user: {}", userId);
    AnalyticsEventResponse response = analyticsEventService.createEvent(userId, request);

    return ResponseEntity.status(HttpStatus.CREATED)
        .body(ApiResponse.success(response, "Analytics event created successfully"));
  }

  @GetMapping("/events/user/{userId}")
  public ResponseEntity<ApiResponse<List<AnalyticsEventResponse>>> getEventsByUser(
      @PathVariable Long userId) {

    log.info("GET /api/v1/analytics/events/user/{} - Fetch analytics events", userId);
    List<AnalyticsEventResponse> responses = analyticsEventService.getEventsByUser(userId);

    return ResponseEntity.ok(ApiResponse.success(responses));
  }

  @GetMapping("/events/type/{eventType}")
  public ResponseEntity<ApiResponse<List<AnalyticsEventResponse>>> getEventsByType(
      @PathVariable String eventType) {

    log.info("GET /api/v1/analytics/events/type/{} - Fetch analytics events by type", eventType);
    List<AnalyticsEventResponse> responses = analyticsEventService.getEventsByType(eventType);

    return ResponseEntity.ok(ApiResponse.success(responses));
  }

  @GetMapping("/events/user/{userId}/type/{eventType}")
  public ResponseEntity<ApiResponse<List<AnalyticsEventResponse>>> getEventsByUserAndType(
      @PathVariable Long userId, @PathVariable String eventType) {

    log.info(
        "GET /api/v1/analytics/events/user/{}/type/{} - Fetch analytics events", userId, eventType);
    List<AnalyticsEventResponse> responses =
        analyticsEventService.getEventsByUserAndType(userId, eventType);

    return ResponseEntity.ok(ApiResponse.success(responses));
  }
}
