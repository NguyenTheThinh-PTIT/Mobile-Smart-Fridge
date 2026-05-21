import { AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import {
  DEFAULT_RETRY_CONFIG,
  RetryConfig,
  calculateBackoffDelay,
  shouldRetry,
  cloneRequestOptions,
  getRequestKey,
} from './RetryConfig';
import { ExceptionHandler } from '../error/ExceptionHandler';

/**
 * RetryInterceptor - Tự động retry các request lỗi
 *
 * Chức năng:
 * 1. Bắt lỗi Timeout hoặc HTTP >= 500
 * 2. Thực hiện retry tự động với exponential backoff
 * 3. Delay: Lần 1 (2s), Lần 2 (4s), Lần 3 (8s)
 * 4. Quá 3 lần -> Ném NetworkException
 *
 * Sử dụng:
 * addRetryInterceptor(dioInstance, customRetryConfig);
 *
 * Location: src/core/retry/RetryInterceptor.ts
 */
export class RetryInterceptor {
  private retryCount: Map<string, number> = new Map();
  private config: RetryConfig;

  constructor(config: Partial<RetryConfig> = {}) {
    this.config = {
      ...DEFAULT_RETRY_CONFIG,
      ...config,
    };
  }

  /**
   * Gắn retry interceptor vào Axios instance
   */
  attach(axiosInstance: AxiosInstance): void {
    axiosInstance.interceptors.response.use(
      (response) => response,
      async (error) => this.handleError(error, axiosInstance)
    );
  }

  /**
   * Xử lý error và thực hiện retry
   */
  private async handleError(error: any, axiosInstance: AxiosInstance): Promise<any> {
    const config = error.config as InternalAxiosRequestConfig | undefined;

    if (!config) {
      return Promise.reject(error);
    }

    const requestKey = getRequestKey(config);

    // Kiểm tra xem có nên retry hay không
    if (!shouldRetry(error, this.config)) {
      this.cleanupRetryCount(requestKey);
      return Promise.reject(error);
    }

    // Lấy current retry count
    let currentRetry = this.retryCount.get(requestKey) || 0;

    // Nếu đạt tối đa, ném exception
    if (currentRetry >= this.config.maxRetries) {
      this.cleanupRetryCount(requestKey);
      const exception = ExceptionHandler.handleError(error);
      ExceptionHandler.logError(exception);
      return Promise.reject(exception);
    }

    // Tăng retry count
    currentRetry++;
    this.retryCount.set(requestKey, currentRetry);

    // Tính delay (exponential backoff)
    const delayDuration = calculateBackoffDelay(currentRetry, this.config);

    if (__DEV__) {
      console.log(
        `[RetryInterceptor] Retry attempt ${currentRetry}/${this.config.maxRetries} ` +
          `after ${delayDuration / 1000}s - ` +
          `Path: ${config.url}`
      );
    }

    // Delay trước khi retry
    await this.delay(delayDuration);

    try {
      // Clone request options để retry
      const clonedConfig = cloneRequestOptions(config);

      // Thực hiện request lại
      const response = await axiosInstance.request(clonedConfig);

      this.cleanupRetryCount(requestKey);
      return response;
    } catch (retryError) {
      // Nếu retry vẫn fail, pass lỗi lên
      this.cleanupRetryCount(requestKey);
      return Promise.reject(retryError);
    }
  }

  /**
   * Dừng chương trình trong milliseconds
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Cleanup retry count sau khi thành công hoặc hết số lần retry
   */
  private cleanupRetryCount(key: string): void {
    this.retryCount.delete(key);
  }

  /**
   * Reset all retry counts (sử dụng cho testing)
   */
  resetAllRetries(): void {
    this.retryCount.clear();
  }
}

/**
 * Helper function để thêm RetryInterceptor vào Axios instance
 */
export const addRetryInterceptor = (
  axiosInstance: AxiosInstance,
  config?: Partial<RetryConfig>
): void => {
  const retryInterceptor = new RetryInterceptor(config);
  retryInterceptor.attach(axiosInstance);
};
