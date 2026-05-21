package com.ai.fridge.modules.app.recipe;

import com.ai.fridge.common.base.ApiEnvelope;
import com.ai.fridge.modules.app.recipe.dto.RecipeCookDtos;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/recipes")
public class RecipeCookController {

  private final RecipeCookService recipeCookService;

  public RecipeCookController(RecipeCookService recipeCookService) {
    this.recipeCookService = recipeCookService;
  }

  @GetMapping("/{recipeId}/cook-guide")
  public ApiEnvelope<RecipeCookDtos.RecipeCookGuideResponse> getCookGuide(
      @RequestHeader(value = "Authorization", required = false) String authorization,
      @PathVariable Long recipeId,
      @RequestParam(value = "mealId", required = false) Long mealId) {
    return ApiEnvelope.success(recipeCookService.getCookGuide(authorization, recipeId, mealId));
  }

  @PostMapping("/{recipeId}/consume")
  public ApiEnvelope<RecipeCookDtos.RecipeConsumeResponse> consumeRecipeIngredients(
      @RequestHeader(value = "Authorization", required = false) String authorization,
      @PathVariable Long recipeId,
      @RequestBody RecipeCookDtos.RecipeConsumeRequest request) {
    return ApiEnvelope.success(
        recipeCookService.consumeIngredients(authorization, recipeId, request));
  }
}
