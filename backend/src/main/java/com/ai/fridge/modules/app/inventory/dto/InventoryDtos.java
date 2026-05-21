package com.ai.fridge.modules.app.inventory.dto;

import java.util.List;

public class InventoryDtos {

  public record InventoryItemDto(
      String id, String name, double quantity, String unit, String expiryDate, String category) {}

  public record InventoryItemRequest(
      String name, double quantity, String unit, String expiryDate, String category) {}

  // Kết quả trả về khi AI quét hóa đơn
  public record InvoiceScanItemResponse(
      String name, double quantity, String unit, Integer estimatedExpiryDays) {}

  // Item mà người dùng đã chỉnh sửa/xác nhận để nạp vào kho
  public record InvoiceConfirmItemRequest(
      String name, double quantity, String unit, String expiryDate, String category) {}

  // Request tổng cho API xác nhận hóa đơn
  public record InvoiceConfirmRequest(List<InvoiceConfirmItemRequest> items) {}
}
