package com.ai.fridge.modules.inventory.controller;

import com.ai.fridge.common.base.ApiResponse;
import com.ai.fridge.common.dto.ItemRequest;
import com.ai.fridge.common.dto.ItemResponse;
import com.ai.fridge.modules.inventory.service.ItemService;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@Slf4j
@RestController
@RequestMapping("/api/v1/inventories")
@RequiredArgsConstructor
public class ItemController {

  private final ItemService itemService;
  private final com.ai.fridge.modules.app.auth.AuthService authService;
  private final com.ai.fridge.modules.app.inventory.InventoryService inventoryService;

  // Endpoint cũ (giữ lại cho tương thích)
  @PostMapping("/{inventoryId}/items")
  public ResponseEntity<ApiResponse<ItemResponse>> createItem(
      @PathVariable Long inventoryId, @Valid @RequestBody ItemRequest request) {
    log.info("POST /api/v1/inventories/{}/items - Create item", inventoryId);
    ItemResponse response = itemService.createItem(inventoryId, request);
    return ResponseEntity.status(HttpStatus.CREATED)
        .body(ApiResponse.success(response, "Item created successfully"));
  }

  // Endpoint mới: FE chỉ gửi payload, backend tự lấy inventoryId
  @PostMapping("/items")
  public ResponseEntity<ApiResponse<ItemResponse>> createItemForCurrentUser(
      @Valid @RequestBody ItemRequest request,
      @RequestHeader("Authorization") String authorizationHeader) {

    Long userId = authService.requireUserIdFromAuthorizationHeader(authorizationHeader);
    Long inventoryId = inventoryService.getOrCreateInventoryIdForUser(userId);

    log.info(
        "POST /api/v1/inventories/items - Create item for user {} (inventoryId={})",
        userId,
        inventoryId);
    ItemResponse response = itemService.createItem(inventoryId, request);

    return ResponseEntity.status(HttpStatus.CREATED)
        .body(ApiResponse.success(response, "Item created successfully"));
  }

  @GetMapping("/{itemId}")
  public ResponseEntity<ApiResponse<ItemResponse>> getItemById(
      @PathVariable Long inventoryId, @PathVariable Long itemId) {

    log.info("GET /api/v1/inventories/{}/items/{} - Fetch item", inventoryId, itemId);
    ItemResponse response = itemService.getItemById(itemId);

    return ResponseEntity.ok(ApiResponse.success(response));
  }

  @PutMapping("/{itemId}")
  public ResponseEntity<ApiResponse<ItemResponse>> updateItem(
      @PathVariable Long inventoryId,
      @PathVariable Long itemId,
      @Valid @RequestBody ItemRequest request) {

    log.info("PUT /api/v1/inventories/{}/items/{} - Update item", inventoryId, itemId);
    ItemResponse response = itemService.updateItem(itemId, request);

    return ResponseEntity.ok(ApiResponse.success(response));
  }

  @DeleteMapping("/{itemId}")
  public ResponseEntity<ApiResponse<Void>> deleteItem(
      @PathVariable Long inventoryId, @PathVariable Long itemId) {

    log.info("DELETE /api/v1/inventories/{}/items/{} - Delete item", inventoryId, itemId);
    itemService.deleteItem(itemId);

    return ResponseEntity.ok(ApiResponse.success(null, "Item deleted successfully"));
  }

  @GetMapping
  public ResponseEntity<ApiResponse<List<ItemResponse>>> getItemsByInventory(
      @PathVariable Long inventoryId, @RequestParam(required = false) String category) {

    log.info("GET /api/v1/inventories/{}/items - Fetch items", inventoryId);

    List<ItemResponse> responses;
    if (category != null && !category.isBlank()) {
      responses = itemService.getItemsByCategory(inventoryId, category);
    } else {
      responses = itemService.getItemsByInventoryId(inventoryId);
    }

    return ResponseEntity.ok(ApiResponse.success(responses));
  }
}
