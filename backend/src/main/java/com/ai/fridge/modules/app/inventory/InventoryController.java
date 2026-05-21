package com.ai.fridge.modules.app.inventory;

import com.ai.fridge.common.base.ApiEnvelope;
import com.ai.fridge.modules.app.inventory.dto.InventoryDtos;
import com.ai.fridge.modules.inventory.service.InvoiceConfirmService;
import com.ai.fridge.modules.inventory.service.InvoiceOcrService;
import com.ai.fridge.modules.inventory.service.InvoiceOcrService.OcrItemDto;
import java.util.List;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/v1/inventory")
public class InventoryController {

  private final InventoryService inventoryService;
  private final InvoiceOcrService invoiceOcrService;
  private final InvoiceConfirmService invoiceConfirmService;
  private final com.ai.fridge.modules.app.auth.AuthService authService;

  public InventoryController(
      InventoryService inventoryService,
      InvoiceOcrService invoiceOcrService,
      InvoiceConfirmService invoiceConfirmService,
      com.ai.fridge.modules.app.auth.AuthService authService) {
    this.inventoryService = inventoryService;
    this.invoiceOcrService = invoiceOcrService;
    this.invoiceConfirmService = invoiceConfirmService;
    this.authService = authService;
  }

  @GetMapping
  public ApiEnvelope<List<InventoryDtos.InventoryItemDto>> getItems(
      @RequestHeader(value = "Authorization", required = false) String authorization) {
    return ApiEnvelope.success(inventoryService.getItems(authorization));
  }

  @PostMapping
  public ApiEnvelope<InventoryDtos.InventoryItemDto> createItem(
      @RequestHeader(value = "Authorization", required = false) String authorization,
      @RequestBody InventoryDtos.InventoryItemRequest request) {
    return ApiEnvelope.success(inventoryService.createItem(authorization, request));
  }

  @PutMapping("/{id}")
  public ApiEnvelope<InventoryDtos.InventoryItemDto> updateItem(
      @RequestHeader(value = "Authorization", required = false) String authorization,
      @PathVariable Long id,
      @RequestBody InventoryDtos.InventoryItemRequest request) {
    return ApiEnvelope.success(inventoryService.updateItem(authorization, id, request));
  }

  @DeleteMapping("/{id}")
  public ApiEnvelope<Void> deleteItem(
      @RequestHeader(value = "Authorization", required = false) String authorization,
      @PathVariable Long id) {
    inventoryService.deleteItem(authorization, id);
    return ApiEnvelope.success(null);
  }

  // ====== NEW: Scan hóa đơn bằng Gemini ======
  @PostMapping(value = "/invoice/scan", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
  public ResponseEntity<ApiEnvelope<List<InventoryDtos.InvoiceScanItemResponse>>> scanInvoice(
      @RequestPart("file") MultipartFile file) {

    List<OcrItemDto> items = invoiceOcrService.extractItemsFromInvoice(file);
    List<InventoryDtos.InvoiceScanItemResponse> response =
        items.stream()
            .map(
                i ->
                    new InventoryDtos.InvoiceScanItemResponse(
                        i.name(), i.quantity(), i.unit(), i.estimatedExpiryDays()))
            .toList();

    return ResponseEntity.ok(ApiEnvelope.success(response));
  }

  // ====== NEW: Xác nhận & nạp thực phẩm vào kho ======
  @PostMapping("/invoice/confirm")
  public ResponseEntity<ApiEnvelope<Void>> confirmInvoiceItems(
      @RequestHeader(value = "Authorization", required = false) String authorization,
      @RequestBody InventoryDtos.InvoiceConfirmRequest request) {

    // Resolve user and inventory from authorization header
    Long userId = authService.requireUserIdFromAuthorizationHeader(authorization);
    Long inventoryId = resolveInventoryIdForUser(userId);

    // Confirm and save items to database
    invoiceConfirmService.confirmAndSaveInvoiceItems(inventoryId, request.items());

    return ResponseEntity.ok(ApiEnvelope.success(null));
  }

  private Long resolveInventoryIdForUser(Long userId) {
    // Query inventory by household (user's household contains inventory)
    Long inventoryId =
        inventoryService
            .getJdbcTemplate()
            .queryForObject(
                """
            SELECT i.id
            FROM inventory i
            JOIN household h ON h.id = i.household_id
            JOIN household_member hm ON hm.household_id = h.id
            WHERE hm.user_id = ?
            LIMIT 1
            """,
                Long.class,
                userId);
    if (inventoryId == null) {
      throw new IllegalStateException("No inventory found for user: " + userId);
    }
    return inventoryId;
  }
}
