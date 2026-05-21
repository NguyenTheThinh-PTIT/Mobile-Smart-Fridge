package com.ai.fridge.modules.app.recipe.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RecipeIngredientRequest {

  private Long foodId;
  private Double requireQuantity;
  private String unit;
}
