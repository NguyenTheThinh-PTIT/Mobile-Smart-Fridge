import { axiosClient } from '@/core/network/AxiosClient';
import { ExceptionHandler } from '@/core/error/ExceptionHandler';

/**
 * User API - API endpoints for user management
 *
 * TODO: Implement all endpoints
 */
export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  refreshToken?: string;
  user: {
    id: string;
    email: string;
    name: string;
    inventoryId?: number;
    inviteCode?: string;
  };
  inviteCode?: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ForgotPasswordResponse {
  email: string;
  otpSent: boolean;
  expiresInSeconds: number;
}

export interface VerifyOtpRequest {
  email: string;
  otpCode: string;
}

export interface VerifyOtpResponse {
  email: string;
  valid: boolean;
}

export interface ResetPasswordRequest {
  email: string;
  otpCode: string;
  newPassword: string;
}

export interface MessageResponse {
  message: string;
}

export interface QRJoinRequest {
  inviteCode: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
}

export const userApi = {
  /**
   * Login user
   */
  login: async (params: LoginRequest): Promise<LoginResponse> => {
    try {
      return await axiosClient.post<LoginResponse>('/auth/login', params);
    } catch (error) {
      throw ExceptionHandler.handleError(error);
    }
  },

  /**
   * Register user
   */
  register: async (params: RegisterRequest): Promise<LoginResponse> => {
    try {
      return await axiosClient.post<LoginResponse>('/auth/register', params);
    } catch (error) {
      throw ExceptionHandler.handleError(error);
    }
  },

  /**
   * Get current user profile
   */
  getProfile: async (): Promise<any> => {
    try {
      return await axiosClient.get('/users/me');
    } catch (error) {
      throw ExceptionHandler.handleError(error);
    }
  },

  /**
   * Update user profile
   */
  updateProfile: async (data: any): Promise<any> => {
    try {
      return await axiosClient.put('/users/me', data);
    } catch (error) {
      throw ExceptionHandler.handleError(error);
    }
  },

  /**
   * Refresh token
   */
  refreshToken: async (token: string): Promise<LoginResponse> => {
    try {
      return await axiosClient.post<LoginResponse>('/auth/refresh', { token });
    } catch (error) {
      throw ExceptionHandler.handleError(error);
    }
  },

  /**
   * Request forgot password OTP
   */
  forgotPassword: async (params: ForgotPasswordRequest): Promise<ForgotPasswordResponse> => {
    try {
      return await axiosClient.post<ForgotPasswordResponse>('/auth/forgot-password', params);
    } catch (error) {
      throw ExceptionHandler.handleError(error);
    }
  },

  /**
   * Verify forgot-password OTP
   */
  verifyOtp: async (params: VerifyOtpRequest): Promise<VerifyOtpResponse> => {
    try {
      return await axiosClient.post<VerifyOtpResponse>('/auth/verify-otp', params);
    } catch (error) {
      throw ExceptionHandler.handleError(error);
    }
  },

  /**
   * Reset password with valid OTP
   */
  resetPassword: async (params: ResetPasswordRequest): Promise<MessageResponse> => {
    try {
      return await axiosClient.post<MessageResponse>('/auth/reset-password', params);
    } catch (error) {
      throw ExceptionHandler.handleError(error);
    }
  },

  /**
   * Logout user
   */
  logout: async (): Promise<void> => {
    try {
      await axiosClient.post('/auth/logout', {});
    } catch (error) {
      throw ExceptionHandler.handleError(error);
    }
  },

  /**
   * Join household via QR - creates temp guest user + auto-login
   */
  joinWithQR: async (inviteCode: string): Promise<LoginResponse> => {
    try {
      const cleanCode = inviteCode.replace(/\D/g, '');
      return await axiosClient.post<LoginResponse>(`/auth/join-from-qr/${cleanCode}`, {});
    } catch (error) {
      throw ExceptionHandler.handleError(error);
    }
  },
};
