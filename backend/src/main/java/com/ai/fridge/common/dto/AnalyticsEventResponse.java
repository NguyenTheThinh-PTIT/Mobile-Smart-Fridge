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
public class AnalyticsEventResponse {

  private Long id;
  private Long userId;
  private String eventType;
  private String eventData;
  private LocalDateTime createdAt;
}
