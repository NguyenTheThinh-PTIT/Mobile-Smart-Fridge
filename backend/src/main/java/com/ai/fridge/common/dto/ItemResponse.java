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
public class ItemResponse {

  private Long id;
  private Long inventoryId;
  private String name;
  private String description;
  private Double quantity;
  private String unit;
  private LocalDateTime expiryDate;
  private String category;
  private String barcode;
  private LocalDateTime createdAt;
  private LocalDateTime updatedAt;
}
