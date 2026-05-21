package com.ai.fridge.modules.identity.service;

import com.ai.fridge.common.dto.UserRequest;
import com.ai.fridge.common.dto.UserResponse;
import java.util.List;

public interface UserService {

  UserResponse createUser(UserRequest request);

  UserResponse getUserById(Long id);

  UserResponse updateUser(Long id, UserRequest request);

  void deleteUser(Long id);

  List<UserResponse> getAllUsers();

  UserResponse getUserByEmail(String email);
}
