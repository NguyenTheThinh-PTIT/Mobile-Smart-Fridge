package com.ai.fridge.common.exceptions;

import com.ai.fridge.common.base.ApiEnvelope;
import java.util.HashMap;
import java.util.Map;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.context.request.WebRequest;
import org.springframework.web.server.ResponseStatusException;

/**
 * GlobalExceptionHandler - Xử lý tất cả exception ở mức global cho toàn hệ thống
 *
 * <p>Trách nhiệm: 1. Bắt tất cả custom BaseException 2. Bắt MethodArgumentNotValidException
 * (validation failures) 3. Bắt Exception chung (fallback) 4. Ghi log lỗi đầy đủ stacktrace
 * (BE-only) 5. Trả về ErrorResponse chuẩn hóa (không trả stacktrace cho Frontend)
 *
 * <p>Lưu ý: - Chỉ log stacktrace ở server, KHÔNG trả về cho Frontend - Frontend chỉ nhận được code,
 * message, timestamp, data
 *
 * @author System
 * @since 1.0
 */
@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler {

  @ExceptionHandler(AppException.class)
  public ResponseEntity<ApiEnvelope<Void>> handleAppException(AppException ex, WebRequest request) {

    System.err.println(
        "AppException occurred - Code: "
            + ex.getErrorCode().getCode()
            + ", Message: "
            + ex.getErrorCode().getMessage()
            + ", Detail: "
            + ex.getMessage());

    return new ResponseEntity<>(
        ApiEnvelope.failure(ex.getErrorCode().getCode(), ex.getErrorCode().getMessage()),
        ex.getErrorCode().getHttpStatus());
  }

  /**
   * Bắt BaseException (custom exceptions)
   *
   * @param ex BaseException
   * @param request WebRequest
   * @return ResponseEntity với ErrorResponse
   */
  @ExceptionHandler(BaseException.class)
  public ResponseEntity<ApiEnvelope<Void>> handleBaseException(
      BaseException ex, WebRequest request) {

    System.err.println(
        "BaseException occurred - Code: "
            + ex.getErrorCodeString()
            + ", Message: "
            + ex.getErrorCode().getMessage()
            + ", Detail: "
            + ex.getDetail());

    String message =
        ex.getDetail() != null && !ex.getDetail().isBlank()
            ? ex.getDetail()
            : ex.getErrorCode().getMessage();

    return new ResponseEntity<>(
        ApiEnvelope.failure(ex.getErrorCodeString(), message, ex.getDetail()),
        ex.getErrorCode().getHttpStatus());
  }

  /**
   * Bắt MethodArgumentNotValidException (validation errors)
   *
   * <p>Xảy ra khi @Valid validation thất bại
   *
   * @param ex MethodArgumentNotValidException
   * @param request WebRequest
   * @return ResponseEntity với ErrorResponse
   */
  @ExceptionHandler(MethodArgumentNotValidException.class)
  public ResponseEntity<ApiEnvelope<Void>> handleMethodArgumentNotValid(
      MethodArgumentNotValidException ex, WebRequest request) {

    // Collect all validation errors
    Map<String, String> errors = new HashMap<>();
    ex.getBindingResult()
        .getAllErrors()
        .forEach(
            error -> {
              String fieldName = ((FieldError) error).getField();
              String errorMessage = error.getDefaultMessage();
              errors.put(fieldName, errorMessage);
            });

    System.err.println("MethodArgumentNotValidException occurred - Validation errors: " + errors);

    return new ResponseEntity<>(
        ApiEnvelope.failure(
            ErrorCode.ERR_VALIDATION.getCode(), "Dữ liệu không hợp lệ: " + errors.keySet(), errors),
        HttpStatus.BAD_REQUEST);
  }

  @ExceptionHandler(HttpMessageNotReadableException.class)
  public ResponseEntity<ApiEnvelope<Void>> handleHttpMessageNotReadable(
      HttpMessageNotReadableException ex, WebRequest request) {

    System.err.println("HttpMessageNotReadableException occurred - Message: " + ex.getMessage());

    return new ResponseEntity<>(
        ApiEnvelope.failure(ErrorCode.ERR_INVALID_FORMAT.getCode(), "JSON payload không hợp lệ"),
        HttpStatus.BAD_REQUEST);
  }

  @ExceptionHandler(ResponseStatusException.class)
  public ResponseEntity<ApiEnvelope<Void>> handleResponseStatusException(
      ResponseStatusException ex, WebRequest request) {
    HttpStatus status = HttpStatus.valueOf(ex.getStatusCode().value());
    String code = "HTTP_" + status.value();
    String message =
        ex.getReason() == null || ex.getReason().isBlank()
            ? status.getReasonPhrase()
            : ex.getReason();
    return new ResponseEntity<>(ApiEnvelope.failure(code, message), status);
  }

  /**
   * Bắt tất cả Exception không được catch (fallback)
   *
   * @param ex Exception
   * @param request WebRequest
   * @return ResponseEntity với ErrorResponse
   */
  @ExceptionHandler(Exception.class)
  public ResponseEntity<ApiEnvelope<Void>> handleGlobalException(Exception ex, WebRequest request) {

    System.err.println(
        "Unexpected Exception occurred - Type: "
            + ex.getClass().getSimpleName()
            + ", Message: "
            + ex.getMessage());
    ex.printStackTrace();

    return new ResponseEntity<>(
        ApiEnvelope.failure(
            ErrorCode.ERR_INTERNAL_SERVER.getCode(), ErrorCode.ERR_INTERNAL_SERVER.getMessage()),
        HttpStatus.INTERNAL_SERVER_ERROR);
  }

  /**
   * Bắt IllegalArgumentException
   *
   * @param ex IllegalArgumentException
   * @param request WebRequest
   * @return ResponseEntity với ErrorResponse
   */
  @ExceptionHandler(IllegalArgumentException.class)
  public ResponseEntity<ApiEnvelope<Void>> handleIllegalArgument(
      IllegalArgumentException ex, WebRequest request) {

    System.err.println("IllegalArgumentException occurred - Message: " + ex.getMessage());
    ex.printStackTrace();

    return new ResponseEntity<>(
        ApiEnvelope.failure(
            ErrorCode.ERR_VALIDATION.getCode(),
            ex.getMessage() != null ? ex.getMessage() : ErrorCode.ERR_VALIDATION.getMessage()),
        HttpStatus.BAD_REQUEST);
  }
}
