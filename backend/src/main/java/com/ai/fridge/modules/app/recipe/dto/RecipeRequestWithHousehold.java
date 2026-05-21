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
public class RecipeRequestWithHousehold {

  private Long householdId;
  private String name;
  private String instructions;
  private Integer cookTimeMinutes;
  private String difficulty;
  private List<RecipeStepRequest> steps;
  private List<RecipeIngredientRequest> ingredients;

  public RecipeRequest toRequest() {
    return RecipeRequest.builder()
        .name(this.name)
        .instructions(this.instructions)
        .cookTimeMinutes(this.cookTimeMinutes)
        .difficulty(this.difficulty)
        .steps(this.steps)
        .ingredients(this.ingredients)
        .build();
  }
}
