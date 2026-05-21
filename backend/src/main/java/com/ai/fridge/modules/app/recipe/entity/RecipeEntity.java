package com.ai.fridge.modules.app.recipe.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import lombok.*;

@Entity
@Table(name = "recipe")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RecipeEntity {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(nullable = false, length = 255)
  private String name;

  @Column(columnDefinition = "TEXT")
  private String instructions;

  @Column(name = "cook_time_minutes")
  private Integer cookTimeMinutes;

  @Column(length = 100)
  private String difficulty;

  @Column(length = 50)
  @Builder.Default
  private String source = "ai"; // 'ai' or 'user'

  @Column(name = "created_by")
  private Long createdBy; // user_id

  @Column(name = "household_id")
  private Long householdId;

  @Column(name = "created_date")
  private LocalDateTime createdDate;

  @Column(name = "updated_date")
  private LocalDateTime updatedDate;

  @PrePersist
  protected void onCreate() {
    createdDate = LocalDateTime.now();
    updatedDate = LocalDateTime.now();
  }

  @PreUpdate
  protected void onUpdate() {
    updatedDate = LocalDateTime.now();
  }
}
