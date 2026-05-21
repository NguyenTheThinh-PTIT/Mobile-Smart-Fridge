package com.ai.fridge.modules.inventory.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.Base64;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.multipart.MultipartFile;

@Service
public class InvoiceOcrServiceImpl implements InvoiceOcrService {

  private static final Logger log = LoggerFactory.getLogger(InvoiceOcrServiceImpl.class);

  private final RestTemplate restTemplate;
  private final ObjectMapper objectMapper;

  @Value("${gemini.api-key:}")
  private String apiKey;

  @Value("${gemini.model-name:gemini-2.5-flash}")
  private String modelName;

  private static final String PROMPT =
      """
      Bạn là một trợ lý ảo thông minh chuyên quản lý thực phẩm gia đình.
      Nhiệm vụ của bạn là trích xuất thông tin từ ảnh hóa đơn siêu thị này và trả về DỮ LIỆU ĐỊNH DẠNG JSON.

      QUY TẮC LỌC DỮ LIỆU (RẤT QUAN TRỌNG):
      1. CHỈ trích xuất các mặt hàng là thực phẩm TƯƠI SỐNG hoặc ĐỒ UỐNG cần bảo quản trong tủ lạnh (ví dụ: Rau, củ, quả, thịt, cá, trứng, sữa, bơ, phô mai...).
      2. BỎ QUA HOÀN TOÀN các mặt hàng không phải thực phẩm (ví dụ: chổi, sọt rác, giấy vệ sinh, tăm bông...).
      3. BỎ QUA các đồ ăn liền không cần để tủ lạnh (ví dụ: mì tôm, snack, bánh kẹo khô).
      4. Tên sản phẩm phải ngắn gọn, dễ hiểu. Nếu có thể, tự động loại bỏ các mã số thừa trên tên hóa đơn.
      5. Dự đoán ngày hết hạn (estimatedExpiryDays) tính từ hôm nay dựa trên loại thực phẩm (VD: Sữa tươi ~ 5 ngày, Thịt bò ~ 3 ngày, Táo ~ 10 ngày).

      ĐỊNH DẠNG ĐẦU RA BẮT BUỘC:
      Chỉ trả về duy nhất một mảng JSON (không kèm markdown), theo cấu trúc sau:
      [
        {
          \"name\": \"Sữa tươi\",
          \"quantity\": 2,
          \"unit\": \"Hộp\",
          \"estimatedExpiryDays\": 5
        }
      ]
      """;

  public InvoiceOcrServiceImpl() {
    this.restTemplate = new RestTemplate();
    this.objectMapper = new ObjectMapper();
  }

  @Override
  public List<OcrItemDto> extractItemsFromInvoice(MultipartFile image) {
    if (apiKey == null || apiKey.isBlank()) {
      throw new IllegalStateException("GEMINI_API_KEY chưa được cấu hình");
    }
    try {
      String base64 = Base64.getEncoder().encodeToString(image.getBytes());
      String mimeType = image.getContentType();

      var url =
          "https://generativelanguage.googleapis.com/v1beta/models/"
              + modelName
              + ":generateContent?key="
              + apiKey;

      String payload = buildPayload(base64, mimeType);

      HttpHeaders headers = new HttpHeaders();
      headers.setContentType(MediaType.APPLICATION_JSON);
      HttpEntity<String> entity = new HttpEntity<>(payload, headers);

      String response = restTemplate.postForObject(url, entity, String.class);
      if (response == null) {
        throw new IllegalStateException("Gemini trả về rỗng");
      }

      String text = extractTextFromGeminiResponse(response);
      log.debug("Gemini raw text: {}", text);

      return objectMapper.readValue(text, new TypeReference<List<OcrItemDto>>() {});

    } catch (Exception e) {
      log.error("Lỗi khi gọi Gemini OCR", e);
      throw new RuntimeException("Không thể trích xuất dữ liệu từ hóa đơn", e);
    }
  }

  private String buildPayload(String base64Image, String mimeType) {
    try {
      // 1. Tạo Part chứa Prompt (Văn bản)
      var textPart = java.util.Map.of("text", PROMPT);

      // 2. Tạo Part chứa Ảnh (inlineData)
      var inlineDataContent =
          java.util.Map.of(
              "mimeType", (mimeType != null ? mimeType : "image/jpeg"), "data", base64Image);
      var imagePart = java.util.Map.of("inlineData", inlineDataContent);

      var contents = java.util.Map.of("parts", java.util.List.of(textPart, imagePart));
      var root = java.util.Map.of("contents", java.util.List.of(contents));

      return objectMapper.writeValueAsString(root);
    } catch (Exception e) {
      throw new RuntimeException("Lỗi build payload JSON", e);
    }
  }

  private String extractTextFromGeminiResponse(String responseJson) throws Exception {
    var node = objectMapper.readTree(responseJson);
    var candidates = node.path("candidates");
    if (!candidates.isArray() || candidates.isEmpty()) {
      throw new IllegalStateException("Gemini không trả về candidates");
    }
    var content = candidates.get(0).path("content");
    var parts = content.path("parts");
    if (!parts.isArray() || parts.isEmpty()) {
      throw new IllegalStateException("Gemini không trả về parts");
    }
    var textNode = parts.get(0).path("text");
    if (textNode.isMissingNode()) {
      throw new IllegalStateException("Gemini không trả về text");
    }
    String rawText = textNode.asText().trim();

    if (rawText.startsWith("```")) {
      rawText =
          rawText
              .replaceAll("^```json\\s*", "") // Xóa ```json ở đầu
              .replaceAll("\\s*```$", ""); // Xóa ``` ở cuối
    }
    return rawText.trim();
  }
}
