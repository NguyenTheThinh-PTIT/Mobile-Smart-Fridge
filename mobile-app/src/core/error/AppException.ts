/**
 * App Exceptions Base Class
 * Tất cả custom exceptions kế thừa từ AppException
 *
 * Định nghĩa tất cả exception của ứng dụng
 * Location: src/core/error/AppException.ts
 *
 * Sử dụng:
 * throw new NetworkException({
 *   message: 'Network error',
 *   errorCode: 'NETWORK_ERROR',
 * });
 */
export interface IAppException extends Error {
  /** Mô tả lỗi bằng ngôn ngữ người dùng */
  message: string;

  /** Mã lỗi từ Backend (VD: "ERR_AI_01", "ERR_DB_LOCK") */
  errorCode?: string;

  /** HTTP status code (nếu có) */
  statusCode?: number;

  /** Dữ liệu thêm (VD: validation field errors) */
  data?: unknown;
}

/**
 * Base Exception Class
 */
export abstract class AppException extends Error implements IAppException {
  message: string;
  errorCode?: string;
  statusCode?: number;
  data?: unknown;

  constructor({
    message,
    errorCode,
    statusCode,
    data,
  }: {
    message: string;
    errorCode?: string;
    statusCode?: number;
    data?: unknown;
  }) {
    super(message);
    this.name = this.constructor.name;
    this.message = message;
    this.errorCode = errorCode;
    this.statusCode = statusCode;
    this.data = data;

    // Maintain proper prototype chain
    Object.setPrototypeOf(this, AppException.prototype);
  }

  toString(): string {
    return `${this.name}(code: ${this.errorCode}, message: ${this.message})`;
  }
}

// ==================== Network Exceptions ====================

/**
 * NetworkException - Lỗi liên quan đến network
 *
 * Ví dụ: Timeout, Connection refused, No internet
 */
export class NetworkException extends AppException {
  constructor(params: {
    message: string;
    errorCode?: string;
    statusCode?: number;
    data?: unknown;
  }) {
    super({
      ...params,
      errorCode: params.errorCode || 'NETWORK_ERROR',
    });
    Object.setPrototypeOf(this, NetworkException.prototype);
  }
}

/**
 * TimeoutException - Request hết timeout
 *
 * Thường xảy ra sau khi retry tất cả lần
 */
export class TimeoutException extends NetworkException {
  constructor(params?: { message?: string; errorCode?: string }) {
    super({
      message: params?.message || 'Yêu cầu hết thời gian chờ',
      errorCode: params?.errorCode || 'TIMEOUT_ERROR',
    });
    Object.setPrototypeOf(this, TimeoutException.prototype);
  }
}

/**
 * ServerException - Lỗi 5xx từ Backend
 *
 * VD: 500, 502, 503, 504
 */
export class ServerException extends NetworkException {
  constructor(params: {
    message: string;
    statusCode?: number;
    errorCode?: string;
    data?: unknown;
  }) {
    super({
      ...params,
      errorCode: params.errorCode || 'SERVER_ERROR',
    });
    Object.setPrototypeOf(this, ServerException.prototype);
  }
}

/**
 * ConnectionException - Lỗi kết nối
 */
export class ConnectionException extends NetworkException {
  constructor(params?: { message?: string }) {
    super({
      message: params?.message || 'Lỗi kết nối mạng',
      errorCode: 'CONNECTION_ERROR',
    });
    Object.setPrototypeOf(this, ConnectionException.prototype);
  }
}

// ==================== Authentication Exceptions ====================

/**
 * AuthException - Lỗi xác thực chung
 */
export class AuthException extends AppException {
  constructor(params: {
    message: string;
    errorCode?: string;
    statusCode?: number;
    data?: unknown;
  }) {
    super({
      ...params,
      errorCode: params.errorCode || 'AUTH_ERROR',
    });
    Object.setPrototypeOf(this, AuthException.prototype);
  }
}

/**
 * UnauthorizedException - 401 Unauthorized (Token hết hạn/không hợp lệ)
 */
export class UnauthorizedException extends AuthException {
  constructor(params?: { message?: string; data?: unknown; errorCode?: string }) {
    super({
      message: params?.message || 'Phiên đăng nhập hết hạn',
      errorCode: params?.errorCode || 'HTTP_401',
      statusCode: 401,
      data: params?.data,
    });
    Object.setPrototypeOf(this, UnauthorizedException.prototype);
  }
}

/**
 * ForbiddenException - 403 Forbidden (Không có quyền)
 */
export class ForbiddenException extends AuthException {
  constructor(params?: { message?: string }) {
    super({
      message: params?.message || 'Bạn không có quyền truy cập',
      errorCode: 'FORBIDDEN',
      statusCode: 403,
    });
    Object.setPrototypeOf(this, ForbiddenException.prototype);
  }
}

/**
 * InvalidTokenException - Token không hợp lệ
 */
export class InvalidTokenException extends AuthException {
  constructor(params?: { message?: string }) {
    super({
      message: params?.message || 'Token không hợp lệ',
      errorCode: 'INVALID_TOKEN',
    });
    Object.setPrototypeOf(this, InvalidTokenException.prototype);
  }
}

// ==================== Validation/Business Logic Exceptions ====================

/**
 * ValidationException - Lỗi validation
 */
export class ValidationException extends AppException {
  constructor(params: {
    message: string;
    data?: Record<string, unknown>;
    errorCode?: string;
  }) {
    super({
      message: params.message,
      errorCode: params.errorCode || 'VALIDATION_ERROR',
      data: params.data,
    });
    Object.setPrototypeOf(this, ValidationException.prototype);
  }
}

/**
 * BusinessException - Lỗi business logic
 */
export class BusinessException extends AppException {
  constructor(params: {
    message: string;
    errorCode?: string;
    data?: unknown;
  }) {
    super({
      ...params,
      errorCode: params.errorCode || 'BUSINESS_ERROR',
    });
    Object.setPrototypeOf(this, BusinessException.prototype);
  }
}

// ==================== Local/App Exceptions ====================

/**
 * LocalException - Lỗi local (không liên quan đến network)
 */
export class LocalException extends AppException {
  constructor(params: {
    message: string;
    errorCode?: string;
    data?: unknown;
  }) {
    super({
      ...params,
      errorCode: params.errorCode || 'LOCAL_ERROR',
    });
    Object.setPrototypeOf(this, LocalException.prototype);
  }
}

/**
 * StorageException - Lỗi lưu trữ (AsyncStorage, Database)
 */
export class StorageException extends LocalException {
  constructor(params?: { message?: string }) {
    super({
      message: params?.message || 'Lỗi lưu trữ dữ liệu',
      errorCode: 'STORAGE_ERROR',
    });
    Object.setPrototypeOf(this, StorageException.prototype);
  }
}

/**
 * CacheException - Lỗi cache
 */
export class CacheException extends LocalException {
  constructor(params?: { message?: string }) {
    super({
      message: params?.message || 'Lỗi cache',
      errorCode: 'CACHE_ERROR',
    });
    Object.setPrototypeOf(this, CacheException.prototype);
  }
}
