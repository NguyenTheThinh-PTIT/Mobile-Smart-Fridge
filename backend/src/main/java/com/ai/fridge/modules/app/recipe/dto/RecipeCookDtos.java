package com.ai.fridge.modules.app.recipe.dto;

import java.util.List;

public class RecipeCookDtos {

  public record RecipeIngredientItem(
      Long foodId,
      String foodName,
      Double requiredPerPerson,
      String unit,
      Double defaultTotalQuantity) {}

  public record RecipeStepItem(Integer stepNumber, String instruction, String mediaUrl) {}

  public record RecipeCookGuideResponse(
      Long recipeId,
      String recipeName,
      Long mealId,
      Integer actualDiners,
      List<RecipeIngredientItem> ingredients,
      List<RecipeStepItem> steps,
      String note) {}

  public record RecipeConsumptionItemRequest(Long foodId, Double consumedQuantity, String unit) {}

  public record RecipeConsumeRequest(
      Long mealId, Integer actualDiners, List<RecipeConsumptionItemRequest> items) {}

  public record RecipeConsumeResponse(
      Long recipeId,
      Long mealId,
      Integer actualDiners,
      List<RecipeIngredientItem> consumedItems,
      String message) {}
}
