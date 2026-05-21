package com.ai.fridge.modules.inventory.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(
    name = "inventory",
    indexes = {@Index(name = "idx_inventory_household_id", columnList = "household_id")})
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class InventoryEntity {

  @Id private Long id;

  @Column(name = "household_id", nullable = false)
  private Long householdId;
}
