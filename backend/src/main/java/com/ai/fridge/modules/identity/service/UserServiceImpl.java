package com.ai.fridge.modules.identity.service;

import com.ai.fridge.common.dto.UserRequest;
import com.ai.fridge.common.dto.UserResponse;
import com.ai.fridge.common.exceptions.BaseException;
import com.ai.fridge.common.exceptions.ErrorCode;
import com.ai.fridge.modules.identity.entity.UserEntity;
import com.ai.fridge.modules.identity.mapper.UserMapper;
import com.ai.fridge.modules.identity.repository.UserRepository;
import java.util.List;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class UserServiceImpl implements UserService {

  private final UserRepository userRepository;
  private final UserMapper userMapper;
  private final JdbcTemplate jdbcTemplate;

  @Override
  public UserResponse createUser(UserRequest request) {
    log.info("Creating user with email: {}", request.getEmail());

    if (userRepository.existsByEmail(request.getEmail())) {
      log.warn("User already exists with email: {}", request.getEmail());
      throw new BaseException(
          ErrorCode.ERR_DUPLICATE_ENTRY, "Email already registered: " + request.getEmail());
    }

    UserEntity entity = userMapper.toEntity(request);
    UserEntity saved = userRepository.save(entity);

    // --- Bổ sung tạo household, household_member, inventory cho user mới ---
    Long userId = saved.getId();
    Long householdId = null;
    try {
      householdId =
          jdbcTemplate.queryForObject(
              "INSERT INTO household (name, created_at) VALUES (?, now()) RETURNING id",
              Long.class,
              "Bếp nhà " + userId);
    } catch (Exception e) {
      log.warn("Could not create household for user {}: {}", userId, e.getMessage());
    }
    if (householdId == null) {
      log.warn("Could not create household for user {}", userId);
    } else {
      try {
        // role_id = 1 (Owner), cần đồng bộ với bảng role
        jdbcTemplate.update(
            "INSERT INTO household_member (user_id, household_id, role_id) VALUES (?, ?, 1)",
            userId,
            householdId);
      } catch (Exception e) {
        log.warn("Could not add user {} to household_member: {}", userId, e.getMessage());
      }
      try {
        jdbcTemplate.update("INSERT INTO inventory (household_id) VALUES (?)", householdId);
      } catch (Exception e) {
        log.warn("Could not create inventory for household {}: {}", householdId, e.getMessage());
      }
    }
    // --- END bổ sung ---

    log.info("User created successfully with id: {}", saved.getId());
    return userMapper.toResponse(saved);
  }

  @Override
  @Transactional(readOnly = true)
  public UserResponse getUserById(Long id) {
    log.debug("Fetching user with id: {}", id);

    UserEntity entity =
        userRepository
            .findById(id)
            .orElseThrow(
                () -> {
                  log.warn("User not found with id: {}", id);
                  return new BaseException(ErrorCode.ERR_USER_NOT_FOUND, "User with id " + id);
                });

    return userMapper.toResponse(entity);
  }

  @Override
  public UserResponse updateUser(Long id, UserRequest request) {
    log.info("Updating user with id: {}", id);

    UserEntity entity =
        userRepository
            .findById(id)
            .orElseThrow(
                () -> {
                  log.warn("User not found for update with id: {}", id);
                  return new BaseException(ErrorCode.ERR_USER_NOT_FOUND, "User with id " + id);
                });

    userMapper.updateEntity(request, entity);
    UserEntity updated = userRepository.save(entity);

    log.info("User updated successfully with id: {}", id);
    return userMapper.toResponse(updated);
  }

  @Override
  public void deleteUser(Long id) {
    log.info("Deleting user with id: {}", id);

    if (!userRepository.existsById(id)) {
      log.warn("User not found for delete with id: {}", id);
      throw new BaseException(ErrorCode.ERR_USER_NOT_FOUND, "User with id " + id);
    }

    userRepository.deleteById(id);
    log.info("User deleted successfully with id: {}", id);
  }

  @Override
  @Transactional(readOnly = true)
  public List<UserResponse> getAllUsers() {
    log.debug("Fetching all users");

    return userRepository.findAll().stream()
        .map(userMapper::toResponse)
        .collect(Collectors.toList());
  }

  @Override
  @Transactional(readOnly = true)
  public UserResponse getUserByEmail(String email) {
    log.debug("Fetching user with email: {}", email);

    UserEntity entity =
        userRepository
            .findByEmail(email)
            .orElseThrow(
                () -> {
                  log.warn("User not found with email: {}", email);
                  return new BaseException(
                      ErrorCode.ERR_USER_NOT_FOUND, "User with email " + email);
                });

    return userMapper.toResponse(entity);
  }
}
