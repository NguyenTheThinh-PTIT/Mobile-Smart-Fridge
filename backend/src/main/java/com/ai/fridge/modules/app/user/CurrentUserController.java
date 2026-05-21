package com.ai.fridge.modules.app.user;

import com.ai.fridge.common.base.ApiEnvelope;
import com.ai.fridge.modules.app.auth.AuthService;
import com.ai.fridge.modules.app.auth.dto.AuthDtos;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/users")
public class CurrentUserController {

  private final AuthService authService;

  public CurrentUserController(AuthService authService) {
    this.authService = authService;
  }

  @GetMapping("/me")
  public ApiEnvelope<AuthDtos.UserDto> getCurrentUser(
      @RequestHeader(value = "Authorization", required = false) String authorization) {
    return ApiEnvelope.success(authService.getUserByToken(authorization));
  }

  @PutMapping("/me")
  public ApiEnvelope<AuthDtos.UserDto> updateCurrentUser(
      @RequestHeader(value = "Authorization", required = false) String authorization,
      @RequestBody UpdateProfileRequest request) {
    return ApiEnvelope.success(authService.updateCurrentUserName(authorization, request.name()));
  }

  public record UpdateProfileRequest(String name) {}
}
