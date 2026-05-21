package com.ai.fridge.modules.planner.service;

import com.ai.fridge.common.dto.MealPlanRequest;
import com.ai.fridge.common.dto.MealPlanResponse;
import java.util.List;

public interface MealPlanService {

  MealPlanResponse createMealPlan(Long userId, MealPlanRequest request);

  MealPlanResponse getMealPlanById(Long mealPlanId);

  MealPlanResponse updateMealPlan(Long mealPlanId, MealPlanRequest request);

  void deleteMealPlan(Long mealPlanId);

  List<MealPlanResponse> getMealPlansByUser(Long userId);
}
