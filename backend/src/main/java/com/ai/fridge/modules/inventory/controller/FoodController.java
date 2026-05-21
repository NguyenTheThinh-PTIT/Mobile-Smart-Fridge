package com.ai.fridge.modules.inventory.controller;

import com.ai.fridge.common.base.ApiResponse;
import com.ai.fridge.modules.app.recipe.dto.FoodResponse;
import com.ai.fridge.modules.inventory.repository.FoodRepository;
import java.util.List;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Slf4j
@RestController
@RequestMapping("/api/v1/foods")
@RequiredArgsConstructor
public class FoodController {

  private final FoodRepository foodRepository;

  @GetMapping
  public ResponseEntity<ApiResponse<List<FoodResponse>>> getAllFoods() {
    log.info("GET /api/v1/foods - Fetch all foods");

    List<FoodResponse> foods =
        foodRepository.findAll().stream()
            .map(
                food ->
                    FoodResponse.builder()
                        .id(food.getId())
                        .name(food.getName())
                        .defaultShelfLifeDay(food.getDefaultShelfLifeDay())
                        .categoryId(food.getCategoryId())
                        .build())
            .collect(Collectors.toList());

    return ResponseEntity.ok(ApiResponse.success(foods, "Foods fetched successfully"));
  }
}
