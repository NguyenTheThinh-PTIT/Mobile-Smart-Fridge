package com.ai.fridge.modules.inventory.mapper;

import com.ai.fridge.common.dto.ItemRequest;
import com.ai.fridge.common.dto.ItemResponse;
import com.ai.fridge.modules.inventory.entity.ItemEntity;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import org.springframework.stereotype.Component;

@Component
public class ItemMapper {

  private static final DateTimeFormatter DATE_TIME_FORMATTER = DateTimeFormatter.ISO_DATE_TIME;

  public ItemResponse toResponse(ItemEntity entity) {
    if (entity == null) return null;

    LocalDateTime expiryDate =
        entity.getExpirationDate() == null ? null : entity.getExpirationDate().atStartOfDay();

    return ItemResponse.builder()
        .id(entity.getId())
        .inventoryId(entity.getInventoryId())
        .name(null)
        .description(null)
        .quantity(entity.getQuantity())
        .unit(entity.getUnit())
        .expiryDate(expiryDate)
        .category(entity.getStorageSection())
        .barcode(null)
        .createdAt(null)
        .updatedAt(null)
        .build();
  }

  public ItemEntity toEntity(ItemRequest request, Long inventoryId) {
    if (request == null) return null;

    LocalDate expirationDate = null;
    if (request.getExpiryDate() != null && !request.getExpiryDate().isBlank()) {
      expirationDate =
          LocalDateTime.parse(request.getExpiryDate(), DATE_TIME_FORMATTER).toLocalDate();
    }

    return ItemEntity.builder()
        .inventoryId(inventoryId)
        .quantity(request.getQuantity())
        .unit(request.getUnit())
        .expirationDate(expirationDate)
        .storageSection(request.getCategory())
        .status("active")
        .isBought(Boolean.TRUE)
        .build();
  }

  public void updateEntity(ItemRequest request, ItemEntity entity) {
    if (request == null || entity == null) return;

    if (request.getQuantity() != null) {
      entity.setQuantity(request.getQuantity());
    }
    if (request.getUnit() != null) {
      entity.setUnit(request.getUnit());
    }
    if (request.getCategory() != null) {
      entity.setStorageSection(request.getCategory());
    }
    if (request.getExpiryDate() != null && !request.getExpiryDate().isBlank()) {
      entity.setExpirationDate(
          LocalDateTime.parse(request.getExpiryDate(), DATE_TIME_FORMATTER).toLocalDate());
    }
  }
}
