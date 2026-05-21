package com.ai.fridge.modules.app.recipe.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RecipeStepResponse {

  private Long id;
  private Integer stepNumber;
  private String instruction;
  private String mediaUrl;
}
