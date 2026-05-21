import { AxiosError, AxiosHeaders, InternalAxiosRequestConfig } from 'axios';

/**
 * RetryConfig - Cấu hình retry
 */
export interface RetryConfig {
  /** Số lần retry tối đa */
  maxRetries: number;

  /** Delay ban đầu (milliseconds) */
  initialDelay: number;

  /** Hệ số backoff (exponential) */
  backoffMultiplier: number;

  /** HTTP status codes nên retry */
  retryableStatusCodes: number[];

  /** Error codes nên retry */
  retryableErrorCodes: string[];
}

/**
 * Default retry config
 */
export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  initialDelay: 2000, // 2 seconds
  backoffMultiplier: 2.0,
  retryableStatusCodes: [408, 429, 500, 502, 503, 504],
  retryableErrorCodes: ['ECONNABORTED', 'ECONNRESET', 'ETIMEDOUT'],
};

/**
 * Tính delay với exponential backoff
 *
 * @param retryCount - Số lần retry hiện tại (bắt đầu từ 1)
 * @param config - RetryConfig
 * @returns Delay tính bằng milliseconds
 */
export const calculateBackoffDelay = (
  retryCount: number,
  config: RetryConfig
): number => {
  return config.initialDelay * Math.pow(config.backoffMultiplier, retryCount - 1);
};

/**
 * Kiểm tra xem có nên retry hay không
 *
 * @param error - AxiosError
 * @param config - RetryConfig
 * @returns true nếu nên retry
 */
export const shouldRetry = (error: AxiosError, config: RetryConfig): boolean => {
  // Kiểm tra HTTP status code
  if (error.response?.status) {
    return config.retryableStatusCodes.includes(error.response.status);
  }

  // Kiểm tra error code
  if (error.code) {
    return config.retryableErrorCodes.includes(error.code);
  }

  return false;
};

/**
 * Clone request options
 */
export const cloneRequestOptions = (
  config: InternalAxiosRequestConfig
): InternalAxiosRequestConfig => {
  return {
    ...config,
    headers: AxiosHeaders.from(config.headers),
    data: config.data ? JSON.parse(JSON.stringify(config.data)) : undefined,
  };
};

/**
 * Lấy unique key từ request options
 */
export const getRequestKey = (config: InternalAxiosRequestConfig): string => {
  return `${config.method?.toUpperCase()}:${config.url}`;
};
