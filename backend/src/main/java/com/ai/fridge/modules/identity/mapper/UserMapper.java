package com.ai.fridge.modules.identity.mapper;

import com.ai.fridge.common.dto.UserRequest;
import com.ai.fridge.common.dto.UserResponse;
import com.ai.fridge.modules.identity.entity.UserEntity;
import org.springframework.stereotype.Component;

@Component
public class UserMapper {

  public UserResponse toResponse(UserEntity entity) {
    if (entity == null) return null;

    return UserResponse.builder()
        .id(entity.getId())
        .email(entity.getEmail())
        .name(entity.getName())
        .phone(entity.getPhone())
        .isActive(entity.getIsActive())
        .createdAt(entity.getCreatedAt())
        .updatedAt(entity.getUpdatedAt())
        .build();
  }

  public UserEntity toEntity(UserRequest request) {
    if (request == null) return null;

    return UserEntity.builder()
        .email(request.getEmail())
        .name(request.getName())
        .password(request.getPassword())
        .phone(request.getPhone())
        .build();
  }

  public void updateEntity(UserRequest request, UserEntity entity) {
    if (request == null || entity == null) return;

    if (request.getName() != null) {
      entity.setName(request.getName());
    }
    if (request.getPhone() != null) {
      entity.setPhone(request.getPhone());
    }
  }
}
