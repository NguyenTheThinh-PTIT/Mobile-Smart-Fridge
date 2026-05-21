package com.ai.fridge.modules.inventory.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "food")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FoodEntity {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(nullable = false, length = 255)
  private String name;

  @Column(name = "image_url", length = 255)
  private String imageUrl;

  @Column(name = "default_shelf_life_day")
  private Integer defaultShelfLifeDay;

  @Column(name = "category_id")
  private Long categoryId;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "category_id", insertable = false, updatable = false)
  private CategoryEntity category;
}
