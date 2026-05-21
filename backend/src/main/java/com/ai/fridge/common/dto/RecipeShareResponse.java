package com.ai.fridge.common.dto;

import java.time.LocalDateTime;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RecipeShareResponse {

  private Long id;
  private Long userId;
  private String title;
  private String description;
  private String ingredients;
  private String instructions;
  private Long likesCount;
  private LocalDateTime createdAt;
  private LocalDateTime updatedAt;
}
