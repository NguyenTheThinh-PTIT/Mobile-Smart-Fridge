package com.ai.fridge.common.exceptions;

import lombok.Getter;

/**
 * BaseException - Exception cơ sở cho tất cả custom exceptions trong hệ thống
 *
 * <p>Bắt buộc phải kế thừa RuntimeException để tránh phải khai báo throws và cho phép global
 * exception handler bắt được.
 *
 * <p>Sử dụng: - throw new BaseException(ErrorCode.ERR_VALIDATION, "Email không hợp lệ"); - throw
 * new BaseException(ErrorCode.ERR_NOT_FOUND);
 *
 * @author System
 * @since 1.0
 */
@Getter
public class BaseException extends RuntimeException {

  private final ErrorCode errorCode;
  private final String detail;

  /**
   * Constructor với ErrorCode
   *
   * @param errorCode Mã lỗi từ enum ErrorCode
   */
  public BaseException(ErrorCode errorCode) {
    super(errorCode.getMessage());
    this.errorCode = errorCode;
    this.detail = null;
  }

  /**
   * Constructor với ErrorCode và chi tiết lỗi
   *
   * @param errorCode Mã lỗi từ enum ErrorCode
   * @param detail Chi tiết lỗi thêm (sẽ được log nhưng không trả về Frontend)
   */
  public BaseException(ErrorCode errorCode, String detail) {
    super(detail != null ? detail : errorCode.getMessage());
    this.errorCode = errorCode;
    this.detail = detail;
  }

  /**
   * Constructor với ErrorCode và cause
   *
   * @param errorCode Mã lỗi từ enum ErrorCode
   * @param cause Nguyên nhân (stacktrace sẽ được log)
   */
  public BaseException(ErrorCode errorCode, Throwable cause) {
    super(errorCode.getMessage(), cause);
    this.errorCode = errorCode;
    this.detail = cause != null ? cause.getMessage() : null;
  }

  /**
   * Constructor đầy đủ
   *
   * @param errorCode Mã lỗi từ enum ErrorCode
   * @param detail Chi tiết lỗi
   * @param cause Nguyên nhân
   */
  public BaseException(ErrorCode errorCode, String detail, Throwable cause) {
    super(detail != null ? detail : errorCode.getMessage(), cause);
    this.errorCode = errorCode;
    this.detail = detail;
  }

  /**
   * Lấy mã lỗi dưới dạng string
   *
   * @return Mã lỗi (VD: "ERR_01")
   */
  public String getErrorCodeString() {
    return this.errorCode.getCode();
  }

  public ErrorCode getErrorCode() {
    return errorCode;
  }

  public String getDetail() {
    return detail;
  }
}
