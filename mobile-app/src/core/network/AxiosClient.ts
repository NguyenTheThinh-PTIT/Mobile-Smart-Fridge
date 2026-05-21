import axios, { AxiosError, AxiosInstance, AxiosRequestConfig } from 'axios';
import { addRetryInterceptor } from '../retry/RetryInterceptor';

interface ApiErrorEnvelope {
  code?: string;
  message?: string;
  details?: unknown;
}

interface ApiEnvelope<T> {
  success: boolean;
  data?: T;
  error?: ApiErrorEnvelope;
}

/**
 * DioClient - Khởi tạo và cấu hình Axios HTTP client
 *
 * Trách nhiệm:
 * 1. Cấu hình BaseOptions (timeout, header, baseUrl)
 * 2. Gắn Retry Interceptor (auto retry 5xx & timeout)
 * 3. Gắn Logging Interceptor (debug logging)
 * 4. Provide global access via singleton
 *
 * Sử dụng:
 * const axiosClient = AxiosClient.getInstance();
 * const response = await axiosClient.get('/users/1');
 *
 * Location: src/core/network/AxiosClient.ts
 *
 * @author System
 * @since 1.0
 */
export class AxiosClient {
  private static instance: AxiosClient;
  private axiosInstance: AxiosInstance;

  /**
   * Private constructor
   */
  private constructor() {
    this.axiosInstance = this._initializeAxios();
  }

  /**
   * Singleton factory
   */
  static getInstance(): AxiosClient {
    if (!AxiosClient.instance) {
      AxiosClient.instance = new AxiosClient();
    }
    return AxiosClient.instance;
  }

  /**
   * Get Axios instance
   */
  getAxios(): AxiosInstance {
    return this.axiosInstance;
  }

  /**
   * Khởi tạo Axios
   */
  private _initializeAxios(): AxiosInstance {
    const envApiUrl =
      process.env.EXPO_PUBLIC_API_URL ||
      process.env.REACT_APP_API_URL ||
      'http://localhost:8080/api/v1';
    const baseURL = envApiUrl.replace(/\/$/, '');

    const instance = axios.create({
      baseURL,
      timeout: Number(process.env.EXPO_PUBLIC_API_TIMEOUT || process.env.REACT_APP_API_TIMEOUT || 10000), // 10 seconds
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        // TODO: Add Authorization header sau khi có token
      },
      validateStatus: (status) => {
        // Accept all status codes (handle trong response/error interceptor)
        return status ? status < 600 : true;
      },
    });

    // Add logging interceptor
    this._addLoggingInterceptor(instance);

    // Add retry interceptor
    addRetryInterceptor(instance);

    if (__DEV__) {
      console.log(`[AxiosClient] Initialized with baseURL: ${baseURL}`);
    }

    return instance;
  }

  /**
   * Tạo Logging Interceptor cho debug
   */
  private _addLoggingInterceptor(instance: AxiosInstance): void {
    // Request interceptor
    instance.interceptors.request.use(
      (config) => {
        if (__DEV__) {
          console.log(
            `[HTTP Request] ${config.method?.toUpperCase()} ${config.url}\n` +
            `Headers: ${JSON.stringify(config.headers)}\n` +
            `Params: ${JSON.stringify(config.params)}\n` +
            `Data: ${JSON.stringify(config.data)}`
          );
        }
        return config;
      },
      (error) => {
        if (__DEV__) {
          console.error('[HTTP Request Error]', error);
        }
        return Promise.reject(error);
      }
    );

    // Response interceptor
    instance.interceptors.response.use(
      (response) => {
        if (__DEV__) {
          console.log(
            `[HTTP Response] ${response.status} ${response.config.url}\n` +
            `Data: ${JSON.stringify(response.data)}`
          );
        }
        
        // Status 400+ should be handled as errors
        if (response.status >= 400) {
          const message = this.extractApiErrorMessage(response.data, response.status);
          return Promise.reject(
            new AxiosError(message, undefined, response.config, response.request, response)
          );
        }
        
        return response;
      },
      (error) => {
        if (__DEV__) {
          console.error('[HTTP Response Error]', error.message);
        }
        return Promise.reject(error);
      }
    );
  }

  /**
   * Update baseURL (sử dụng khi cấu hình đổi)
   */
  setBaseURL(baseURL: string): void {
    this.axiosInstance.defaults.baseURL = baseURL;
    if (__DEV__) {
      console.log(`[AxiosClient] Updated baseURL: ${baseURL}`);
    }
  }

  /**
   * Update default headers
   */
  setDefaultHeaders(headers: Record<string, string>): void {
    this.axiosInstance.defaults.headers.common = {
      ...this.axiosInstance.defaults.headers.common,
      ...headers,
    };
  }

  /**
   * Update Authorization header
   */
  setAuthToken(token: string): void {
    this.setDefaultHeaders({
      Authorization: `Bearer ${token}`,
    });
  }

  /**
   * Clear Authorization header
   */
  clearAuthToken(): void {
    delete this.axiosInstance.defaults.headers.common['Authorization'];
  }

  /**
   * Generic GET request
   */
  async get<T = any>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.axiosInstance.get<T>(url, config);
    return this.unwrapApiEnvelope<T>(response.data);
  }

  /**
   * Generic POST request
   */
  async post<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.axiosInstance.post<T>(url, data, config);
    return this.unwrapApiEnvelope<T>(response.data);
  }

  /**
   * Generic PUT request
   */
  async put<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.axiosInstance.put<T>(url, data, config);
    return this.unwrapApiEnvelope<T>(response.data);
  }

  /**
   * Generic PATCH request
   */
  async patch<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.axiosInstance.patch<T>(url, data, config);
    return this.unwrapApiEnvelope<T>(response.data);
  }

  /**
   * Generic DELETE request
   */
  async delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.axiosInstance.delete<T>(url, config);
    return this.unwrapApiEnvelope<T>(response.data);
  }

  private unwrapApiEnvelope<T>(payload: unknown): T {
    if (this.isApiEnvelope<T>(payload)) {
      if (payload.success) {
        return payload.data as T;
      }

      const derivedStatus = this.deriveStatusFromCode(payload.error?.code);
      const axiosLikeError = {
        isAxiosError: true,
        name: 'AxiosError',
        message: payload.error?.message || 'Request failed',
        response: {
          status: derivedStatus,
          data: payload,
        },
      } as AxiosError;

      throw axiosLikeError;
    }
    return payload as T;
  }

  private extractApiErrorMessage(payload: unknown, status: number): string {
    if (!payload || typeof payload !== 'object') {
      return `Request failed with status ${status}`;
    }

    const data = payload as Record<string, unknown>;
    const error = data.error as Record<string, unknown> | undefined;
    const errorMessage = error?.message;
    const message = data.message;

    if (typeof errorMessage === 'string' && errorMessage.trim()) {
      return errorMessage;
    }

    if (typeof message === 'string' && message.trim()) {
      return message;
    }

    return `Request failed with status ${status}`;
  }

  private isApiEnvelope<T>(payload: unknown): payload is ApiEnvelope<T> {
    if (!payload || typeof payload !== 'object') {
      return false;
    }

    return (
      'success' in payload &&
      typeof (payload as Record<string, unknown>).success === 'boolean' &&
      ('data' in payload || 'error' in payload)
    );
  }

  private deriveStatusFromCode(code?: string): number {
    if (!code) {
      return 400;
    }

    const matched = code.match(/HTTP_(\d{3})/);
    if (!matched) {
      return 400;
    }

    const parsed = Number(matched[1]);
    return Number.isFinite(parsed) ? parsed : 400;
  }
}

/**
 * Export singleton instance
 */
export const axiosClient = AxiosClient.getInstance();
