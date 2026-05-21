import axios, { AxiosError } from 'axios';
import {
  AppException,
  NetworkException,
  TimeoutException,
  ServerException,
  ConnectionException,
  UnauthorizedException,
  ForbiddenException,
  ValidationException,
  BusinessException,
} from './AppException';

/**
 * ExceptionHandler - Xử lý lỗi từ Axios hoặc app
 *
 * Chức năng:
 * 1. Chuyển đổi AxiosError thành AppException
 * 2. Phân loại lỗi (Network, Auth, Validation, etc.)
 * 3. Log lỗi khi cần
 *
 * Location: src/core/error/ExceptionHandler.ts
 */
export class ExceptionHandler {
  private static _extractMessage(data: any, fallback: string): string {
    const envelopeMessage = data?.error?.message;
    const legacyMessage = data?.message;
    if (typeof envelopeMessage === 'string' && envelopeMessage.trim()) {
      return envelopeMessage;
    }
    if (typeof legacyMessage === 'string' && legacyMessage.trim()) {
      return legacyMessage;
    }
    return fallback;
  }

  private static _extractValidationData(data: any): any {
    return data?.error?.details ?? data?.errors ?? data?.data;
  }

  private static _extractErrorCode(data: any, fallback: string): string {
    const envelopeCode = data?.error?.code;
    const legacyCode = data?.code;
    if (typeof envelopeCode === 'string' && envelopeCode.trim()) {
      return envelopeCode;
    }
    if (typeof legacyCode === 'string' && legacyCode.trim()) {
      return legacyCode;
    }
    return fallback;
  }

  /**
   * Chuyển đổi AxiosError thành AppException
   */
  static handleError(error: unknown): AppException {
    // Nếu đã là AppException, trả về
    if (error instanceof AppException) {
      return error;
    }

    // Xử lý AxiosError
    if (axios.isAxiosError(error)) {
      return this._handleAxiosError(error);
    }

    // Xử lý lỗi khác
    if (error instanceof Error) {
      return new NetworkException({
        message: error.message,
        errorCode: 'UNKNOWN_ERROR',
      });
    }

    return new NetworkException({
      message: 'Đã xảy ra lỗi không xác định',
      errorCode: 'UNKNOWN_ERROR',
    });
  }

  /**
   * Xử lý AxiosError cụ thể
   */
  private static _handleAxiosError(error: AxiosError): AppException {
    // Network error (no response from server)
    if (!error.response) {
      return this._handleNetworkError(error);
    }

    const { status, data } = error.response;

    // Server error (5xx)
    if (status && status >= 500 && status < 600) {
      return new ServerException({
        message: `Server error: ${status}`,
        statusCode: status,
        errorCode: `SERVER_ERROR_${status}`,
        data,
      });
    }

    // Unauthorized (401)
    if (status === 401) {
      return new UnauthorizedException({
        message: this._extractMessage(data, 'Invalid email or password'),
        errorCode: this._extractErrorCode(data, 'HTTP_401'),
        data,
      });
    }

    // Forbidden (403)
    if (status === 403) {
      return new ForbiddenException({
        message: this._extractMessage(data, 'Bạn không có quyền truy cập'),
      });
    }

    // Validation error (400)
    if (status === 400) {
      return new ValidationException({
        message: this._extractMessage(data, 'Dữ liệu không hợp lệ'),
        data: this._extractValidationData(data),
      });
    }

    // Not found (404)
    if (status === 404) {
      return new BusinessException({
        message: this._extractMessage(data, 'Không tìm thấy tài nguyên'),
        errorCode: 'NOT_FOUND',
      });
    }

    // Client error (other 4xx)
    if (status && status >= 400 && status < 500) {
      return new BusinessException({
        message: this._extractMessage(data, `Client error: ${status}`),
        errorCode: `CLIENT_ERROR_${status}`,
        data,
      });
    }

    // Unknown HTTP error
    return new NetworkException({
      message: this._extractMessage(data, 'Đã xảy ra lỗi'),
      statusCode: status,
      data,
    });
  }

  /**
   * Xử lý Network error (no response)
   */
  private static _handleNetworkError(error: AxiosError): AppException {
    // Timeout
    if (
      error.code === 'ECONNABORTED' ||
      error.message === 'timeout of ' + error.config?.timeout + 'ms exceeded'
    ) {
      return new TimeoutException({
        message: 'Yêu cầu hết thời gian chờ',
      });
    }

    // Connection error
    if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
      return new ConnectionException({
        message: 'Lỗi kết nối mạng',
      });
    }

    // Network error (ERR_NETWORK from browser)
    if (error.message === 'Network Error') {
      return new NetworkException({
        message: 'Lỗi kết nối mạng',
        errorCode: 'NETWORK_ERROR',
      });
    }

    // Other errors
    return new NetworkException({
      message: error.message || 'Lỗi kết nối mạng',
      errorCode: 'NETWORK_ERROR',
    });
  }

  /**
   * Log error để debug
   */
  static logError(error: AppException): void {
    if (__DEV__) {
      console.error(
        `[${error.name}] Code: ${error.errorCode}, Message: ${error.message}`,
        error.data
      );
    }
  }
}

/**
 * Type guard để check AppException
 */
export const isAppException = (error: unknown): error is AppException => {
  return error instanceof AppException;
};
