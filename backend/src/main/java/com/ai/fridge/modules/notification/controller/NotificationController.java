package com.ai.fridge.modules.notification.controller;

import com.ai.fridge.common.base.ApiResponse;
import com.ai.fridge.common.dto.MealAttendanceDecisionRequest;
import com.ai.fridge.common.dto.NotificationResponse;
import com.ai.fridge.modules.notification.service.NotificationService;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@Slf4j
@RestController
@RequestMapping("/api/v1/users/{userId}/notifications")
@RequiredArgsConstructor
public class NotificationController {

  private final NotificationService notificationService;

  @GetMapping
  public ResponseEntity<ApiResponse<List<NotificationResponse>>> getNotifications(
      @PathVariable Long userId) {

    log.info("GET /api/v1/users/{}/notifications - Fetch notifications", userId);
    List<NotificationResponse> response = notificationService.getNotificationsByUser(userId);
    return ResponseEntity.ok(ApiResponse.success(response));
  }

  @PatchMapping("/{notificationId}/read")
  public ResponseEntity<ApiResponse<NotificationResponse>> markAsRead(
      @PathVariable Long userId, @PathVariable Long notificationId) {

    log.info("PATCH /api/v1/users/{}/notifications/{}/read - Mark read", userId, notificationId);
    NotificationResponse response =
        notificationService.markNotificationAsRead(userId, notificationId);
    return ResponseEntity.ok(ApiResponse.success(response, "Đã đánh dấu đã đọc"));
  }

  @PostMapping("/{notificationId}/meal-response")
  public ResponseEntity<ApiResponse<NotificationResponse>> respondMealAttendance(
      @PathVariable Long userId,
      @PathVariable Long notificationId,
      @Valid @RequestBody MealAttendanceDecisionRequest request) {

    log.info(
        "POST /api/v1/users/{}/notifications/{}/meal-response - Attendance decision",
        userId,
        notificationId);
    NotificationResponse response =
        notificationService.handleMealAttendanceDecision(userId, notificationId, request);

    return ResponseEntity.ok(ApiResponse.success(response, "Đã cập nhật xác nhận bữa ăn"));
  }
}
