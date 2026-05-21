package com.ai.fridge.modules.identity.controller;

import com.ai.fridge.common.base.ApiResponse;
import com.ai.fridge.common.dto.UserRequest;
import com.ai.fridge.common.dto.UserResponse;
import com.ai.fridge.modules.identity.service.UserService;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/users")
@RequiredArgsConstructor
public class UserController {

  private final UserService userService;

  @PostMapping
  public ResponseEntity<ApiResponse<UserResponse>> createUser(
      @Valid @RequestBody UserRequest request) {

    System.err.println("POST /api/v1/users - Create new user");
    UserResponse response = userService.createUser(request);

    return ResponseEntity.status(HttpStatus.CREATED)
        .body(ApiResponse.success(response, "User created successfully"));
  }

  @GetMapping("/{id}")
  public ResponseEntity<ApiResponse<UserResponse>> getUserById(@PathVariable Long id) {

    System.err.println("GET /api/v1/users/" + id + " - Fetch user");
    UserResponse response = userService.getUserById(id);

    return ResponseEntity.ok(ApiResponse.success(response));
  }

  @PutMapping("/{id}")
  public ResponseEntity<ApiResponse<UserResponse>> updateUser(
      @PathVariable Long id, @Valid @RequestBody UserRequest request) {

    System.err.println("PUT /api/v1/users/" + id + " - Update user");
    UserResponse response = userService.updateUser(id, request);

    return ResponseEntity.ok(ApiResponse.success(response));
  }

  @DeleteMapping("/{id}")
  public ResponseEntity<ApiResponse<Void>> deleteUser(@PathVariable Long id) {

    System.err.println("DELETE /api/v1/users/" + id + " - Delete user");
    userService.deleteUser(id);

    return ResponseEntity.ok(ApiResponse.success(null, "User deleted successfully"));
  }

  @GetMapping
  public ResponseEntity<ApiResponse<List<UserResponse>>> getAllUsers() {
    System.err.println("GET /api/v1/users - Fetch all users");
    List<UserResponse> responses = userService.getAllUsers();

    return ResponseEntity.ok(ApiResponse.success(responses));
  }
}
