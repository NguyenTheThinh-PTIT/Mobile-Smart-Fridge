package com.ai.fridge.modules.app.auth;

import com.ai.fridge.common.base.ApiEnvelope;
import com.ai.fridge.modules.app.auth.dto.AuthDtos;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {

  private final AuthService authService;

  public AuthController(AuthService authService) {
    this.authService = authService;
  }

  @PostMapping("/login")
  public ApiEnvelope<AuthDtos.LoginResponse> login(@RequestBody AuthDtos.LoginRequest request) {
    return ApiEnvelope.success(authService.login(request.email(), request.password()));
  }

  @PostMapping("/register")
  public ApiEnvelope<AuthDtos.LoginResponse> register(
      @RequestBody AuthDtos.RegisterRequest request) {
    return ApiEnvelope.success(
        authService.register(request.email(), request.password(), request.name()));
  }

  @PostMapping("/oauth/google")
  public ApiEnvelope<AuthDtos.LoginResponse> loginWithGoogle(
      @RequestBody AuthDtos.GoogleLoginRequest request) {
    return ApiEnvelope.success(authService.loginWithGoogle(request.idToken()));
  }

  @PostMapping("/refresh")
  public ApiEnvelope<AuthDtos.LoginResponse> refresh(@RequestBody AuthDtos.RefreshRequest request) {
    return ApiEnvelope.success(authService.refresh(request.token()));
  }

  @PostMapping("/forgot-password")
  public ApiEnvelope<AuthDtos.ForgotPasswordResponse> forgotPassword(
      @RequestBody AuthDtos.ForgotPasswordRequest request) {
    return ApiEnvelope.success(authService.forgotPassword(request.email()));
  }

  @PostMapping("/verify-otp")
  public ApiEnvelope<AuthDtos.VerifyOtpResponse> verifyOtp(
      @RequestBody AuthDtos.VerifyOtpRequest request) {
    return ApiEnvelope.success(authService.verifyResetOtp(request.email(), request.otpCode()));
  }

  @PostMapping("/reset-password")
  public ApiEnvelope<AuthDtos.MessageResponse> resetPassword(
      @RequestBody AuthDtos.ResetPasswordRequest request) {
    authService.resetPassword(request.email(), request.otpCode(), request.newPassword());
    return ApiEnvelope.success(new AuthDtos.MessageResponse("Password updated successfully"));
  }

  @PostMapping("/logout")
  public ApiEnvelope<AuthDtos.MessageResponse> logout() {
    return ApiEnvelope.success(new AuthDtos.MessageResponse("Logged out"));
  }

  @PostMapping("/join-from-qr/{inviteCode}")
  public ApiEnvelope<AuthDtos.LoginResponse> joinFromQr(@PathVariable String inviteCode) {
    return ApiEnvelope.success(authService.joinFromQr(inviteCode));
  }
}
