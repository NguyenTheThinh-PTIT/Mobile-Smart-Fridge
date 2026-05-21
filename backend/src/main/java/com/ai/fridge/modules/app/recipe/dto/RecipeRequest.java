package com.ai.fridge.modules.app.recipe.dto;

import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RecipeRequest {

  private String name;
  private String instructions;
  private Integer cookTimeMinutes;
  private String difficulty;
  private List<RecipeStepRequest> steps;
  private List<RecipeIngredientRequest> ingredients;
}
