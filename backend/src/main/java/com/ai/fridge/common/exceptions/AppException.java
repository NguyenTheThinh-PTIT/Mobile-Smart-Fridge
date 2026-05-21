package com.ai.fridge.common.exceptions;

import lombok.Getter;

/** Base Custom Exception Tất cả custom exception của ứng dụng kế thừa từ class này */
@Getter
public class AppException extends RuntimeException {
  private final ErrorCode errorCode;

  public AppException(ErrorCode errorCode) {
    super(errorCode.getMessage());
    this.errorCode = errorCode;
  }

  public AppException(ErrorCode errorCode, String detail) {
    super(detail);
    this.errorCode = errorCode;
  }

  public AppException(ErrorCode errorCode, Throwable cause) {
    super(errorCode.getMessage(), cause);
    this.errorCode = errorCode;
  }
}
