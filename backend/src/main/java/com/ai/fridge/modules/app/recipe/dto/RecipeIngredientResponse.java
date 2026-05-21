package com.ai.fridge.modules.app.recipe.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RecipeIngredientResponse {

  private Long id;
  private Long foodId;
  private String foodName;
  private Double requireQuantity;
  private String unit;
}
