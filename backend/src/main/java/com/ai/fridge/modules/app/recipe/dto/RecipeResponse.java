package com.ai.fridge.modules.app.recipe.dto;

import java.time.LocalDateTime;
import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RecipeResponse {

  private Long id;
  private String name;
  private String instructions;
  private Integer cookTimeMinutes;
  private String difficulty;
  private String source;
  private Long createdBy;
  private Long householdId;
  private LocalDateTime createdDate;
  private LocalDateTime updatedDate;
  private List<RecipeStepResponse> steps;
  private List<RecipeIngredientResponse> ingredients;
}
