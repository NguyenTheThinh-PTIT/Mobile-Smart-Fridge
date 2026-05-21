package com.ai.fridge.modules.app.recipe;

import com.ai.fridge.common.base.ApiResponse;
import com.ai.fridge.modules.app.recipe.dto.RecipeRequestWithHousehold;
import com.ai.fridge.modules.app.recipe.dto.RecipeResponse;
import com.ai.fridge.modules.app.recipe.service.RecipeManagementService;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@Slf4j
@RestController
@RequestMapping("/api/v1/recipes")
@RequiredArgsConstructor
public class RecipeManagementController {

  private final RecipeManagementService recipeManagementService;

  @GetMapping("/household")
  public ResponseEntity<ApiResponse<List<RecipeResponse>>> getUserRecipes(
      @RequestParam Long householdId) {
    log.info("GET /api/v1/recipes/household - Fetch user recipes for household: {}", householdId);

    List<RecipeResponse> recipes = recipeManagementService.getUserRecipes(householdId);

    return ResponseEntity.ok(ApiResponse.success(recipes, "User recipes fetched successfully"));
  }

  @PostMapping
  public ResponseEntity<ApiResponse<RecipeResponse>> createRecipe(
      @Valid @RequestBody RecipeRequestWithHousehold requestWithHousehold,
      Authentication authentication) {
    Long householdId = requestWithHousehold.getHouseholdId();
    log.info("POST /api/v1/recipes - Create recipe for household: {}", householdId);

    Long userId = Long.parseLong(authentication.getName());
    RecipeResponse recipe =
        recipeManagementService.createUserRecipe(
            householdId, userId, requestWithHousehold.toRequest());

    return ResponseEntity.status(HttpStatus.CREATED)
        .body(ApiResponse.success(recipe, "Recipe created successfully"));
  }

  @PutMapping("/{recipeId}")
  public ResponseEntity<ApiResponse<RecipeResponse>> updateRecipe(
      @PathVariable Long recipeId,
      @Valid @RequestBody RecipeRequestWithHousehold requestWithHousehold) {
    Long householdId = requestWithHousehold.getHouseholdId();
    log.info("PUT /api/v1/recipes/{} - Update recipe for household: {}", recipeId, householdId);

    RecipeResponse recipe =
        recipeManagementService.updateUserRecipe(
            recipeId, householdId, requestWithHousehold.toRequest());

    return ResponseEntity.ok(ApiResponse.success(recipe, "Recipe updated successfully"));
  }

  @DeleteMapping("/{recipeId}")
  public ResponseEntity<ApiResponse<Void>> deleteRecipe(
      @PathVariable Long recipeId, @RequestParam Long householdId) {
    log.info("DELETE /api/v1/recipes/{} - Delete recipe for household: {}", recipeId, householdId);

    recipeManagementService.deleteUserRecipe(recipeId, householdId);

    return ResponseEntity.ok(ApiResponse.success(null, "Recipe deleted successfully"));
  }
}
