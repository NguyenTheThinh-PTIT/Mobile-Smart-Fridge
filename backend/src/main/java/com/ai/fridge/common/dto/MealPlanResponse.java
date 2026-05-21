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
public class MealPlanResponse {

  private Long id;
  private Long userId;
  private String mealType;
  private LocalDateTime plannedDate;
  private String notes;
  private Integer expectedDiners;
  private Integer actualDiners;
  private Integer guestCount;
  private LocalDateTime createdAt;
  private LocalDateTime updatedAt;
}
