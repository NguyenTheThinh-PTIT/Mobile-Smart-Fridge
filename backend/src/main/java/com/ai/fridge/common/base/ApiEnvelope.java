package com.ai.fridge.common.base;

import com.fasterxml.jackson.annotation.JsonInclude;
import java.io.Serializable;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public class ApiEnvelope<T> implements Serializable {

  private static final long serialVersionUID = 1L;

  private boolean success;
  private T data;
  private ApiError error;

  public static <T> ApiEnvelope<T> success(T data) {
    return ApiEnvelope.<T>builder().success(true).data(data).build();
  }

  public static <T> ApiEnvelope<T> failure(String code, String message) {
    return ApiEnvelope.<T>builder().success(false).error(new ApiError(code, message, null)).build();
  }

  public static <T> ApiEnvelope<T> failure(String code, String message, Object details) {
    return ApiEnvelope.<T>builder()
        .success(false)
        .error(new ApiError(code, message, details))
        .build();
  }

  @Data
  @NoArgsConstructor
  @AllArgsConstructor
  @JsonInclude(JsonInclude.Include.NON_NULL)
  public static class ApiError implements Serializable {

    private static final long serialVersionUID = 1L;

    private String code;
    private String message;
    private Object details;
  }
}
