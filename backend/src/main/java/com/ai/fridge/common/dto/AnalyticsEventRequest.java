package com.ai.fridge.common.dto;

import jakarta.validation.constraints.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AnalyticsEventRequest {

  @NotBlank(message = "Event type không được để trống")
  @Size(min = 1, max = 100)
  private String eventType;

  private String eventData;
}
