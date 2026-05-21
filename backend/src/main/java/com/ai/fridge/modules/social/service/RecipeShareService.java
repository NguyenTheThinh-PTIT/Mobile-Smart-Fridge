package com.ai.fridge.modules.social.service;

import com.ai.fridge.common.dto.RecipeShareRequest;
import com.ai.fridge.common.dto.RecipeShareResponse;
import java.util.List;

public interface RecipeShareService {

  RecipeShareResponse createRecipeShare(Long userId, RecipeShareRequest request);

  RecipeShareResponse getRecipeShareById(Long recipeShareId);

  RecipeShareResponse updateRecipeShare(Long recipeShareId, RecipeShareRequest request);

  void deleteRecipeShare(Long recipeShareId);

  List<RecipeShareResponse> getRecipeSharesByUser(Long userId);

  List<RecipeShareResponse> getAllRecipeShares();

  void likeRecipeShare(Long recipeShareId);
}
