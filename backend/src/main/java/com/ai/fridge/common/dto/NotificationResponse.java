package com.ai.fridge.common.dto;

import java.time.LocalDateTime;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class NotificationResponse {

  private Long id;
  private Long householdId;
  private Long userId;
  private String type;
  private String title;
  private String content;
  private Boolean isRead;
  private Boolean actionRequired;
  private Boolean actionTaken;
  private Long relatedMealId;
  private String metadata;
  private LocalDateTime createdAt;
  private LocalDateTime readAt;
}
