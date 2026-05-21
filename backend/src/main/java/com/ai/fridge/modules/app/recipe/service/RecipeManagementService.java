package com.ai.fridge.modules.app.recipe.service;

import com.ai.fridge.modules.app.recipe.dto.RecipeIngredientResponse;
import com.ai.fridge.modules.app.recipe.dto.RecipeRequest;
import com.ai.fridge.modules.app.recipe.dto.RecipeResponse;
import com.ai.fridge.modules.app.recipe.dto.RecipeStepResponse;
import com.ai.fridge.modules.app.recipe.entity.RecipeEntity;
import com.ai.fridge.modules.app.recipe.entity.RecipeFoodEntity;
import com.ai.fridge.modules.app.recipe.entity.RecipeStepEntity;
import com.ai.fridge.modules.app.recipe.repository.RecipeFoodRepository;
import com.ai.fridge.modules.app.recipe.repository.RecipeRepository;
import com.ai.fridge.modules.app.recipe.repository.RecipeStepRepository;
import com.ai.fridge.modules.inventory.entity.FoodEntity;
import com.ai.fridge.modules.inventory.repository.FoodRepository;
import java.util.List;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
public class RecipeManagementService {

  private final RecipeRepository recipeRepository;
  private final RecipeStepRepository recipeStepRepository;
  private final RecipeFoodRepository recipeFoodRepository;
  private final FoodRepository foodRepository;

  @Transactional
  public RecipeResponse createUserRecipe(Long householdId, Long userId, RecipeRequest request) {
    log.info("Creating user recipe for household: {} by user: {}", householdId, userId);

    // Create recipe entity
    RecipeEntity recipe =
        RecipeEntity.builder()
            .name(request.getName())
            .instructions(request.getInstructions())
            .cookTimeMinutes(request.getCookTimeMinutes())
            .difficulty(request.getDifficulty())
            .source("user")
            .createdBy(userId)
            .householdId(householdId)
            .build();

    RecipeEntity savedRecipe = recipeRepository.save(recipe);

    // Save recipe steps
    if (request.getSteps() != null && !request.getSteps().isEmpty()) {
      request
          .getSteps()
          .forEach(
              step -> {
                RecipeStepEntity stepEntity =
                    RecipeStepEntity.builder()
                        .recipeId(savedRecipe.getId())
                        .stepNumber(step.getStepNumber())
                        .instruction(step.getInstruction())
                        .mediaUrl(step.getMediaUrl())
                        .build();
                recipeStepRepository.save(stepEntity);
              });
    }

    // Save recipe ingredients
    if (request.getIngredients() != null && !request.getIngredients().isEmpty()) {
      request
          .getIngredients()
          .forEach(
              ingredient -> {
                RecipeFoodEntity foodEntity =
                    RecipeFoodEntity.builder()
                        .recipeId(savedRecipe.getId())
                        .foodId(ingredient.getFoodId())
                        .requireQuantity(ingredient.getRequireQuantity())
                        .unit(ingredient.getUnit())
                        .build();
                recipeFoodRepository.save(foodEntity);
              });
    }

    return convertToResponse(savedRecipe);
  }

  @Transactional
  public RecipeResponse updateUserRecipe(Long recipeId, Long householdId, RecipeRequest request) {
    log.info("Updating user recipe: {} for household: {}", recipeId, householdId);

    RecipeEntity recipe =
        recipeRepository
            .findByIdAndHouseholdId(recipeId, householdId)
            .orElseThrow(
                () -> new RuntimeException("Recipe not found or not authorized to update"));

    recipe.setName(request.getName());
    recipe.setInstructions(request.getInstructions());
    recipe.setCookTimeMinutes(request.getCookTimeMinutes());
    recipe.setDifficulty(request.getDifficulty());

    RecipeEntity updatedRecipe = recipeRepository.save(recipe);

    // Delete old steps and ingredients
    recipeStepRepository.deleteByRecipeId(recipeId);
    recipeFoodRepository.deleteByRecipeId(recipeId);

    // Save new steps
    if (request.getSteps() != null && !request.getSteps().isEmpty()) {
      request
          .getSteps()
          .forEach(
              step -> {
                RecipeStepEntity stepEntity =
                    RecipeStepEntity.builder()
                        .recipeId(updatedRecipe.getId())
                        .stepNumber(step.getStepNumber())
                        .instruction(step.getInstruction())
                        .mediaUrl(step.getMediaUrl())
                        .build();
                recipeStepRepository.save(stepEntity);
              });
    }

    // Save new ingredients
    if (request.getIngredients() != null && !request.getIngredients().isEmpty()) {
      request
          .getIngredients()
          .forEach(
              ingredient -> {
                RecipeFoodEntity foodEntity =
                    RecipeFoodEntity.builder()
                        .recipeId(updatedRecipe.getId())
                        .foodId(ingredient.getFoodId())
                        .requireQuantity(ingredient.getRequireQuantity())
                        .unit(ingredient.getUnit())
                        .build();
                recipeFoodRepository.save(foodEntity);
              });
    }

    return convertToResponse(updatedRecipe);
  }

  @Transactional
  public void deleteUserRecipe(Long recipeId, Long householdId) {
    log.info("Deleting user recipe: {} for household: {}", recipeId, householdId);

    RecipeEntity recipe =
        recipeRepository
            .findByIdAndHouseholdId(recipeId, householdId)
            .orElseThrow(
                () -> new RuntimeException("Recipe not found or not authorized to delete"));

    // Delete cascade: steps and ingredients
    recipeStepRepository.deleteByRecipeId(recipeId);
    recipeFoodRepository.deleteByRecipeId(recipeId);
    recipeRepository.deleteById(recipeId);
  }

  public List<RecipeResponse> getUserRecipes(Long householdId) {
    log.info("Fetching user recipes for household: {}", householdId);
    List<RecipeEntity> recipes = recipeRepository.findUserRecipesByHouseholdId(householdId, "user");
    return recipes.stream().map(this::convertToResponse).collect(Collectors.toList());
  }

  private RecipeResponse convertToResponse(RecipeEntity recipe) {
    List<RecipeStepEntity> steps =
        recipeStepRepository.findByRecipeIdOrderByStepNumber(recipe.getId());
    List<RecipeFoodEntity> ingredients = recipeFoodRepository.findByRecipeId(recipe.getId());

    return RecipeResponse.builder()
        .id(recipe.getId())
        .name(recipe.getName())
        .instructions(recipe.getInstructions())
        .cookTimeMinutes(recipe.getCookTimeMinutes())
        .difficulty(recipe.getDifficulty())
        .source(recipe.getSource())
        .createdBy(recipe.getCreatedBy())
        .householdId(recipe.getHouseholdId())
        .createdDate(recipe.getCreatedDate())
        .updatedDate(recipe.getUpdatedDate())
        .steps(
            steps.stream()
                .map(
                    s ->
                        RecipeStepResponse.builder()
                            .id(s.getId())
                            .stepNumber(s.getStepNumber())
                            .instruction(s.getInstruction())
                            .mediaUrl(s.getMediaUrl())
                            .build())
                .collect(Collectors.toList()))
        .ingredients(
            ingredients.stream()
                .map(
                    i -> {
                      FoodEntity food = foodRepository.findById(i.getFoodId()).orElse(null);
                      return RecipeIngredientResponse.builder()
                          .id(i.getId())
                          .foodId(i.getFoodId())
                          .foodName(food != null ? food.getName() : "Unknown")
                          .requireQuantity(i.getRequireQuantity())
                          .unit(i.getUnit())
                          .build();
                    })
                .collect(Collectors.toList()))
        .build();
  }
}
