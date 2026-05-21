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
public class RecipeShareRequest {

  @NotBlank(message = "Title không được để trống")
  @Size(min = 1, max = 100)
  private String title;

  @NotBlank(message = "Description không được để trống")
  private String description;

  private String ingredients;

  private String instructions;
}
