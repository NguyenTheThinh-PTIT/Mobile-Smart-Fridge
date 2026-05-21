package com.ai.fridge.modules.social.mapper;

import com.ai.fridge.common.dto.RecipeShareRequest;
import com.ai.fridge.common.dto.RecipeShareResponse;
import com.ai.fridge.modules.social.entity.RecipeShareEntity;
import org.springframework.stereotype.Component;

@Component
public class RecipeShareMapper {

  public RecipeShareResponse toResponse(RecipeShareEntity entity) {
    if (entity == null) return null;

    return RecipeShareResponse.builder()
        .id(entity.getId())
        .userId(entity.getUserId())
        .title(entity.getTitle())
        .description(entity.getDescription())
        .ingredients(entity.getIngredients())
        .instructions(entity.getInstructions())
        .likesCount(entity.getLikesCount())
        .createdAt(entity.getCreatedAt())
        .updatedAt(entity.getUpdatedAt())
        .build();
  }

  public RecipeShareEntity toEntity(RecipeShareRequest request, Long userId) {
    if (request == null) return null;

    return RecipeShareEntity.builder()
        .userId(userId)
        .title(request.getTitle())
        .description(request.getDescription())
        .ingredients(request.getIngredients())
        .instructions(request.getInstructions())
        .build();
  }

  public void updateEntity(RecipeShareRequest request, RecipeShareEntity entity) {
    if (request == null || entity == null) return;

    if (request.getTitle() != null) {
      entity.setTitle(request.getTitle());
    }
    if (request.getDescription() != null) {
      entity.setDescription(request.getDescription());
    }
    if (request.getIngredients() != null) {
      entity.setIngredients(request.getIngredients());
    }
    if (request.getInstructions() != null) {
      entity.setInstructions(request.getInstructions());
    }
  }
}
