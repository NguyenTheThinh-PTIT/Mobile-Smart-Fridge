package com.ai.fridge.modules.app.recipe.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "recipe_food")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RecipeFoodEntity {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(name = "recipe_id", nullable = false)
  private Long recipeId;

  @Column(name = "food_id", nullable = false)
  private Long foodId;

  @Column(name = "require_quantity")
  private Double requireQuantity;

  @Column(length = 50)
  private String unit;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "recipe_id", insertable = false, updatable = false)
  private RecipeEntity recipe;
}
