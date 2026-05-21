package com.ai.fridge.modules.notification.service;

import com.ai.fridge.common.dto.MealAttendanceDecisionRequest;
import com.ai.fridge.common.dto.NotificationResponse;
import java.util.List;

public interface NotificationService {

  List<NotificationResponse> getNotificationsByUser(Long userId);

  NotificationResponse markNotificationAsRead(Long userId, Long notificationId);

  NotificationResponse handleMealAttendanceDecision(
      Long userId, Long notificationId, MealAttendanceDecisionRequest request);
}
