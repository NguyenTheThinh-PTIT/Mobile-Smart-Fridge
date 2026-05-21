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
public class MealPlanRequest {

  @NotBlank(message = "Meal type không được để trống")
  @Size(min = 1, max = 100)
  private String mealType;

  @NotBlank(message = "Planned date không được để trống")
  private String plannedDate;

  @Size(max = 500)
  private String notes;

  @Min(value = 0, message = "Số người ăn dự kiến không được âm")
  @Max(value = 50, message = "Số người ăn dự kiến quá lớn")
  private Integer expectedDiners;

  @Min(value = 0, message = "Số khách không được âm")
  @Max(value = 30, message = "Số khách quá lớn")
  private Integer guestCount;
}
