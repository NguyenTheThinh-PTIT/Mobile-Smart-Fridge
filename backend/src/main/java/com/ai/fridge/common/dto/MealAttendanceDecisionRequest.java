package com.ai.fridge.common.dto;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MealAttendanceDecisionRequest {

  @NotNull(message = "Thiếu quyết định tham gia bữa ăn")
  private Boolean willEat;
}
