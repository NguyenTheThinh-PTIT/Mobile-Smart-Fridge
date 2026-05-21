package com.ai.fridge.common.exceptions;

import com.fasterxml.jackson.annotation.JsonInclude;
import java.io.Serializable;
import java.time.Instant;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * ErrorResponse - DTO cho API error response
 *
 * <p>Format JSON trả về cho Mobile: { "code": "ERR_01", "message": "Dữ liệu không hợp lệ",
 * "timestamp": "2026-03-18T10:30:45.123Z", "data": null }
 *
 * @author System
 * @since 1.0
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public class ErrorResponse implements Serializable {

  private static final long serialVersionUID = 1L;

  /** Mã lỗi text (VD: "ERR_01") để Frontend map chính xác */
  private String code;

  /** Mô tả lỗi bằng ngôn ngữ người dùng */
  private String message;

  /** Timestamp ISO khi lỗi xảy ra */
  private String timestamp;

  /** Dữ liệu thêm (thường là null với lỗi) */
  private Object data;

  // Explicit setters (in case Lombok @Data doesn't work)
  public void setCode(String code) {
    this.code = code;
  }

  public void setMessage(String message) {
    this.message = message;
  }

  public void setTimestamp(String timestamp) {
    this.timestamp = timestamp;
  }

  public void setData(Object data) {
    this.data = data;
  }

  public String getCode() {
    return code;
  }

  public String getMessage() {
    return message;
  }

  public String getTimestamp() {
    return timestamp;
  }

  public Object getData() {
    return data;
  }

  /**
   * Factory method để tạo ErrorResponse từ BaseException
   *
   * @param exception BaseException
   * @return ErrorResponse instance
   */
  public static ErrorResponse fromException(BaseException exception) {
    ErrorResponse response = new ErrorResponse();
    response.setCode(exception.getErrorCodeString());
    response.setMessage(exception.getErrorCode().getMessage());
    response.setTimestamp(Instant.now().toString());
    response.setData(null);
    return response;
  }

  /**
   * Factory method để tạo ErrorResponse từ ErrorCode
   *
   * @param errorCode ErrorCode enum
   * @return ErrorResponse instance
   */
  public static ErrorResponse fromErrorCode(ErrorCode errorCode) {
    ErrorResponse response = new ErrorResponse();
    response.setCode(errorCode.getCode());
    response.setMessage(errorCode.getMessage());
    response.setTimestamp(Instant.now().toString());
    response.setData(null);
    return response;
  }
}
