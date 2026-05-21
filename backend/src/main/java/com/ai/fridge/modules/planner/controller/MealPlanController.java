package com.ai.fridge.modules.planner.controller;

import com.ai.fridge.common.base.ApiResponse;
import com.ai.fridge.common.dto.MealPlanRequest;
import com.ai.fridge.common.dto.MealPlanResponse;
import com.ai.fridge.modules.planner.service.MealPlanService;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@Slf4j
@RestController
@RequestMapping("/api/v1/users/{userId}/meals")
@RequiredArgsConstructor
public class MealPlanController {

  private final MealPlanService mealPlanService;

  @PostMapping
  public ResponseEntity<ApiResponse<MealPlanResponse>> createMealPlan(
      @PathVariable Long userId, @Valid @RequestBody MealPlanRequest request) {

    log.info("POST /api/v1/users/{}/meals - Create meal", userId);
    MealPlanResponse response = mealPlanService.createMealPlan(userId, request);

    return ResponseEntity.status(HttpStatus.CREATED)
        .body(ApiResponse.success(response, "Meal created successfully"));
  }

  @GetMapping("/{mealId}")
  public ResponseEntity<ApiResponse<MealPlanResponse>> getMealPlanById(
      @PathVariable Long userId, @PathVariable Long mealId) {

    log.info("GET /api/v1/users/{}/meals/{} - Fetch meal", userId, mealId);
    MealPlanResponse response = mealPlanService.getMealPlanById(mealId);

    return ResponseEntity.ok(ApiResponse.success(response));
  }

  @PutMapping("/{mealId}")
  public ResponseEntity<ApiResponse<MealPlanResponse>> updateMealPlan(
      @PathVariable Long userId,
      @PathVariable Long mealId,
      @Valid @RequestBody MealPlanRequest request) {

    log.info("PUT /api/v1/users/{}/meals/{} - Update meal", userId, mealId);
    MealPlanResponse response = mealPlanService.updateMealPlan(mealId, request);

    return ResponseEntity.ok(ApiResponse.success(response));
  }

  @DeleteMapping("/{mealId}")
  public ResponseEntity<ApiResponse<Void>> deleteMealPlan(
      @PathVariable Long userId, @PathVariable Long mealId) {

    log.info("DELETE /api/v1/users/{}/meals/{} - Delete meal", userId, mealId);
    mealPlanService.deleteMealPlan(mealId);

    return ResponseEntity.ok(ApiResponse.success(null, "Meal deleted successfully"));
  }

  @GetMapping
  public ResponseEntity<ApiResponse<List<MealPlanResponse>>> getMealPlansByUser(
      @PathVariable Long userId) {

    log.info("GET /api/v1/users/{}/meals - Fetch all meals", userId);
    List<MealPlanResponse> responses = mealPlanService.getMealPlansByUser(userId);

    return ResponseEntity.ok(ApiResponse.success(responses));
  }
}
