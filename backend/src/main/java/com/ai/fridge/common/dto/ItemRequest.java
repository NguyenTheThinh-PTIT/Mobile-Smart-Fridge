package com.ai.fridge.common.dto;

import jakarta.validation.constraints.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ItemRequest {

  @NotBlank(message = "Item name không được để trống")
  @Size(min = 1, max = 100)
  private String name;

  @Size(max = 500)
  private String description;

  @NotNull(message = "Quantity không được để trống")
  @DecimalMin(value = "0.01", message = "Quantity phải > 0")
  private Double quantity;

  @NotBlank(message = "Unit không được để trống")
  @Size(max = 50)
  private String unit;

  @Size(max = 50)
  private String category;

  @Size(max = 100)
  private String barcode;

  private String expiryDate;
}
