package com.ai.fridge.modules.app.recipe.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "recipe_step")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RecipeStepEntity {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(name = "recipe_id", nullable = false)
  private Long recipeId;

  @Column(name = "step_number")
  private Integer stepNumber;

  @Column(columnDefinition = "TEXT")
  private String instruction;

  @Column(name = "media_url")
  private String mediaUrl;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "recipe_id", insertable = false, updatable = false)
  private RecipeEntity recipe;
}
