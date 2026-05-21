package com.ai.fridge.common.exceptions;

import lombok.Getter;
import org.springframework.http.HttpStatus;

/**
 * ErrorCode Enum - Định nghĩa toàn bộ mã lỗi của hệ thống
 *
 * <p>Mỗi ErrorCode bao gồm: - code: Mã lỗi text (VD: "ERR_01") để Frontend map chính xác - message:
 * Mô tả lỗi mặc định - httpStatus: HTTP status code tương ứng
 *
 * <p>Sử dụng: throw new BaseException(ErrorCode.ERR_VALIDATION, "Chi tiết lỗi");
 *
 * @author System
 * @since 1.0
 */
@Getter
public enum ErrorCode {

  // Success (200-299)
  SUCCESS("SUCCESS_00", "Yêu cầu thành công", HttpStatus.OK),

  // Validation Errors (400-499)
  ERR_VALIDATION("ERR_VAL_01", "Dữ liệu không hợp lệ", HttpStatus.BAD_REQUEST),
  ERR_MISSING_PARAM("ERR_VAL_02", "Thiếu tham số bắt buộc", HttpStatus.BAD_REQUEST),
  ERR_INVALID_FORMAT("ERR_VAL_03", "Định dạng dữ liệu không đúng", HttpStatus.BAD_REQUEST),

  // Authentication & Authorization (401-403)
  ERR_UNAUTHORIZED("ERR_AUTH_01", "Chưa xác thực", HttpStatus.UNAUTHORIZED),
  ERR_INVALID_TOKEN("ERR_AUTH_02", "Token không hợp lệ hoặc đã hết hạn", HttpStatus.UNAUTHORIZED),
  ERR_FORBIDDEN("ERR_AUTH_03", "Không có quyền truy cập", HttpStatus.FORBIDDEN),
  ERR_USER_NOT_FOUND("ERR_AUTH_04", "Người dùng không tồn tại", HttpStatus.NOT_FOUND),

  // Resource Not Found (404)
  ERR_NOT_FOUND("ERR_NOT_FOUND_01", "Tài nguyên không tìm thấy", HttpStatus.NOT_FOUND),
  ERR_ITEM_NOT_FOUND("ERR_NOT_FOUND_02", "Mục không tìm thấy", HttpStatus.NOT_FOUND),

  // Database Errors (500)
  ERR_DB_LOCK("ERR_DB_01", "Cơ sở dữ liệu đang bị khóa, vui lòng thử lại", HttpStatus.CONFLICT),
  ERR_DUPLICATE_ENTRY("ERR_DB_02", "Dữ liệu đã tồn tại", HttpStatus.CONFLICT),
  ERR_DB_ERROR("ERR_DB_03", "Lỗi cơ sở dữ liệu", HttpStatus.INTERNAL_SERVER_ERROR),

  // AI/Vision Processing Errors (503)
  ERR_AI_TIMEOUT(
      "ERR_AI_01", "Xử lý AI hết thời gian, vui lòng thử lại", HttpStatus.SERVICE_UNAVAILABLE),
  ERR_AI_PROCESSING("ERR_AI_02", "Lỗi trong quá trình xử lý AI", HttpStatus.INTERNAL_SERVER_ERROR),
  ERR_VISION_FAILED("ERR_AI_03", "Nhận dạng hình ảnh thất bại", HttpStatus.INTERNAL_SERVER_ERROR),
  ERR_AI_PROVIDER(
      "ERR_AI_04", "Dịch vụ AI đang bận, vui lòng thử lại", HttpStatus.SERVICE_UNAVAILABLE),

  // Business Logic Errors (422)
  ERR_BUSINESS_LOGIC("ERR_BIZ_01", "Lỗi logic kinh doanh", HttpStatus.UNPROCESSABLE_ENTITY),
  ERR_INSUFFICIENT_INVENTORY(
      "ERR_BIZ_02", "Hàng tồn kho không đủ", HttpStatus.UNPROCESSABLE_ENTITY),
  ERR_EXPIRED_ITEM("ERR_BIZ_03", "Mục đã hết hạn sử dụng", HttpStatus.UNPROCESSABLE_ENTITY),

  // External Service Errors (502-503)
  ERR_EXTERNAL_SERVICE("ERR_EXT_01", "Lỗi từ dịch vụ bên ngoài", HttpStatus.BAD_GATEWAY),
  ERR_SERVICE_UNAVAILABLE(
      "ERR_EXT_02", "Dịch vụ tạm thời không khả dụng", HttpStatus.SERVICE_UNAVAILABLE),

  // Internal Server Errors (500)
  ERR_INTERNAL_SERVER("ERR_INTERNAL_01", "Lỗi máy chủ nội bộ", HttpStatus.INTERNAL_SERVER_ERROR),
  ERR_UNKNOWN("ERR_UNKNOWN_01", "Lỗi không xác định", HttpStatus.INTERNAL_SERVER_ERROR);

  private final String code;
  private final String message;
  private final HttpStatus httpStatus;

  /**
   * Constructor cho ErrorCode enum
   *
   * @param code Mã lỗi text (VD: "ERR_01")
   * @param message Mô tả lỗi
   * @param httpStatus HTTP status code tương ứng
   */
  ErrorCode(String code, String message, HttpStatus httpStatus) {
    this.code = code;
    this.message = message;
    this.httpStatus = httpStatus;
  }

  public String getCode() {
    return code;
  }

  public String getMessage() {
    return message;
  }

  public HttpStatus getHttpStatus() {
    return httpStatus;
  }
}
