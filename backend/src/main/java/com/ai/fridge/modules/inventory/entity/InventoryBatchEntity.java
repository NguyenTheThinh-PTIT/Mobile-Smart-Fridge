package com.ai.fridge.modules.inventory.entity;

import jakarta.persistence.*;
import java.time.LocalDate;
import lombok.*;

@Entity
@Table(name = "inventory_batch")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class InventoryBatchEntity {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(name = "inventory_id", nullable = false)
  private Long inventoryId;

  @Column(name = "food_id", nullable = false)
  private Long foodId;

  @Column(nullable = false)
  private Double quantity;

  @Column(nullable = false, length = 50)
  private String unit;

  @Column(name = "entry_date")
  private LocalDate entryDate;

  @Column(name = "expiration_date")
  private LocalDate expirationDate;

  @Column(length = 100)
  private String status;

  @Column(name = "storage_section", length = 255)
  private String storageSection;

  @Column(name = "is_bought")
  private Boolean isBought;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "food_id", insertable = false, updatable = false)
  private FoodEntity food;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "inventory_id", insertable = false, updatable = false)
  private InventoryEntity inventory;
}
