package com.ai.fridge.modules.social.controller;

import com.ai.fridge.common.base.ApiResponse;
import com.ai.fridge.common.dto.RecipeShareRequest;
import com.ai.fridge.common.dto.RecipeShareResponse;
import com.ai.fridge.modules.social.service.RecipeShareService;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@Slf4j
@RestController
@RequestMapping("/api/v1/recipe-shares")
@RequiredArgsConstructor
public class RecipeShareController {

  private final RecipeShareService recipeShareService;

  @PostMapping
  public ResponseEntity<ApiResponse<RecipeShareResponse>> createRecipeShare(
      @RequestHeader(value = "X-User-Id", required = true) Long userId,
      @Valid @RequestBody RecipeShareRequest request) {

    log.info("POST /api/v1/recipe-shares - Create recipe share for user: {}", userId);
    RecipeShareResponse response = recipeShareService.createRecipeShare(userId, request);

    return ResponseEntity.status(HttpStatus.CREATED)
        .body(ApiResponse.success(response, "Recipe share created successfully"));
  }

  @GetMapping("/{id}")
  public ResponseEntity<ApiResponse<RecipeShareResponse>> getRecipeShareById(
      @PathVariable Long id) {

    log.info("GET /api/v1/recipe-shares/{} - Fetch recipe share", id);
    RecipeShareResponse response = recipeShareService.getRecipeShareById(id);

    return ResponseEntity.ok(ApiResponse.success(response));
  }

  @PutMapping("/{id}")
  public ResponseEntity<ApiResponse<RecipeShareResponse>> updateRecipeShare(
      @PathVariable Long id, @Valid @RequestBody RecipeShareRequest request) {

    log.info("PUT /api/v1/recipe-shares/{} - Update recipe share", id);
    RecipeShareResponse response = recipeShareService.updateRecipeShare(id, request);

    return ResponseEntity.ok(ApiResponse.success(response));
  }

  @DeleteMapping("/{id}")
  public ResponseEntity<ApiResponse<Void>> deleteRecipeShare(@PathVariable Long id) {

    log.info("DELETE /api/v1/recipe-shares/{} - Delete recipe share", id);
    recipeShareService.deleteRecipeShare(id);

    return ResponseEntity.ok(ApiResponse.success(null, "Recipe share deleted successfully"));
  }

  @GetMapping("/user/{userId}")
  public ResponseEntity<ApiResponse<List<RecipeShareResponse>>> getRecipeSharesByUser(
      @PathVariable Long userId) {

    log.info("GET /api/v1/recipe-shares/user/{} - Fetch recipe shares", userId);
    List<RecipeShareResponse> responses = recipeShareService.getRecipeSharesByUser(userId);

    return ResponseEntity.ok(ApiResponse.success(responses));
  }

  @GetMapping
  public ResponseEntity<ApiResponse<List<RecipeShareResponse>>> getAllRecipeShares() {
    log.info("GET /api/v1/recipe-shares - Fetch all recipe shares");
    List<RecipeShareResponse> responses = recipeShareService.getAllRecipeShares();

    return ResponseEntity.ok(ApiResponse.success(responses));
  }

  @PostMapping("/{id}/like")
  public ResponseEntity<ApiResponse<Void>> likeRecipeShare(@PathVariable Long id) {

    log.info("POST /api/v1/recipe-shares/{}/like - Like recipe share", id);
    recipeShareService.likeRecipeShare(id);

    return ResponseEntity.ok(ApiResponse.success(null, "Recipe share liked"));
  }
}
