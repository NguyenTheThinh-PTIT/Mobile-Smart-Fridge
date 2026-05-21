package com.ai.fridge.modules.inventory.entity;

import jakarta.persistence.*;
import java.time.LocalDate;
import lombok.*;

@Entity
@Table(
    name = "inventory_batch",
    indexes = {
      @Index(name = "idx_ib_inventory_id", columnList = "inventory_id"),
      @Index(name = "idx_ib_food_id", columnList = "food_id")
    })
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ItemEntity {

  @Id private Long id;

  @Column(name = "inventory_id", nullable = false)
  private Long inventoryId;

  @Column(name = "food_id")
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

  @PrePersist
  protected void onCreate() {
    if (entryDate == null) {
      entryDate = LocalDate.now();
    }
    if (status == null || status.isBlank()) {
      status = "active";
    }
    if (isBought == null) {
      isBought = Boolean.TRUE;
    }
  }
}
