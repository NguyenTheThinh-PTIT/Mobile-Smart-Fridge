package com.ai.fridge.modules.inventory.service;

import java.util.List;
import org.springframework.web.multipart.MultipartFile;

/** Service trích xuất thực phẩm từ ảnh hóa đơn bằng Gemini Vision. */
public interface InvoiceOcrService {

  List<OcrItemDto> extractItemsFromInvoice(MultipartFile image);

  record OcrItemDto(String name, double quantity, String unit, Integer estimatedExpiryDays) {}
}
