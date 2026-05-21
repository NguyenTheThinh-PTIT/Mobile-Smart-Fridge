package com.ai.fridge.modules.app.auth.dto;

public class AuthDtos {

  public record LoginRequest(String email, String password) {}

  public record RegisterRequest(String email, String password, String name) {}

  public record GoogleLoginRequest(String idToken) {}

  public record RefreshRequest(String token) {}

  public record ForgotPasswordRequest(String email) {}

  public record VerifyOtpRequest(String email, String otpCode) {}

  public record ResetPasswordRequest(String email, String otpCode, String newPassword) {}

  public record UserDto(String id, String email, String name, String householdId) {}

  public record LoginResponse(String token, String refreshToken, UserDto user, String inviteCode) {}

  public record ForgotPasswordResponse(String email, boolean otpSent, long expiresInSeconds) {}

  public record VerifyOtpResponse(String email, boolean valid) {}

  public record MessageResponse(String message) {}
}
