package com.ai.fridge.common.base;

import com.fasterxml.jackson.annotation.JsonInclude;
import java.io.Serializable;
import java.time.Instant;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * ApiResponse - DTO cho toàn bộ API response (success & error)
 *
 * <p>Format: { "code": 200, "message": "Success", "data": {...}, "timestamp":
 * "2026-03-18T10:30:45.123Z" }
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public class ApiResponse<T> implements Serializable {

  private static final long serialVersionUID = 1L;

  private int code;
  private String message;
  private T data;
  private String timestamp;

  public void setCode(int code) {
    this.code = code;
  }

  public void setMessage(String message) {
    this.message = message;
  }

  public void setData(T data) {
    this.data = data;
  }

  public void setTimestamp(String timestamp) {
    this.timestamp = timestamp;
  }

  public int getCode() {
    return code;
  }

  public String getMessage() {
    return message;
  }

  public T getData() {
    return data;
  }

  public String getTimestamp() {
    return timestamp;
  }

  public static <T> ApiResponse<T> success(T data) {
    return success(data, "Success");
  }

  public static <T> ApiResponse<T> success(T data, String message) {
    ApiResponse<T> response = new ApiResponse<>();
    response.setCode(200);
    response.setMessage(message);
    response.setData(data);
    response.setTimestamp(Instant.now().toString());
    return response;
  }

  public static <T> ApiResponse<T> error(int code, String message) {
    ApiResponse<T> response = new ApiResponse<>();
    response.setCode(code);
    response.setMessage(message);
    response.setTimestamp(Instant.now().toString());
    return response;
  }
}
