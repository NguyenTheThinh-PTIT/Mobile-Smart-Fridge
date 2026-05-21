package com.ai.fridge.modules.planner.service;

import com.ai.fridge.common.dto.MealPlanRequest;
import com.ai.fridge.common.dto.MealPlanResponse;
import com.ai.fridge.common.exceptions.BaseException;
import com.ai.fridge.common.exceptions.ErrorCode;
import com.ai.fridge.modules.planner.entity.MealPlanEntity;
import com.ai.fridge.modules.planner.mapper.MealPlanMapper;
import com.ai.fridge.modules.planner.repository.MealPlanRepository;
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
public class MealPlanServiceImpl implements MealPlanService {

  private final MealPlanRepository mealPlanRepository;
  private final MealPlanMapper mealPlanMapper;
  private final JdbcTemplate jdbcTemplate;

  @Override
  public MealPlanResponse createMealPlan(Long userId, MealPlanRequest request) {
    log.info("Creating meal plan for user: {}", userId);

    Long householdId = resolveHouseholdId(userId);
    MealPlanEntity entity = mealPlanMapper.toEntity(request, userId);
    entity.setHouseholdId(householdId);
    MealPlanEntity saved = mealPlanRepository.save(entity);
    syncMealAttendance(saved);
    createMealNotifications(saved);

    log.info("Meal plan created with id: {}", saved.getId());
    return toResponseWithAttendance(saved);
  }

  @Override
  @Transactional(readOnly = true)
  public MealPlanResponse getMealPlanById(Long mealPlanId) {
    log.debug("Fetching meal plan with id: {}", mealPlanId);

    MealPlanEntity entity =
        mealPlanRepository
            .findById(mealPlanId)
            .orElseThrow(
                () -> {
                  log.warn("Meal plan not found with id: {}", mealPlanId);
                  return new BaseException(
                      ErrorCode.ERR_NOT_FOUND, "Meal plan with id " + mealPlanId);
                });

    return toResponseWithAttendance(entity);
  }

  @Override
  public MealPlanResponse updateMealPlan(Long mealPlanId, MealPlanRequest request) {
    log.info("Updating meal plan with id: {}", mealPlanId);

    MealPlanEntity entity =
        mealPlanRepository
            .findById(mealPlanId)
            .orElseThrow(
                () -> {
                  log.warn("Meal plan not found for update with id: {}", mealPlanId);
                  return new BaseException(
                      ErrorCode.ERR_NOT_FOUND, "Meal plan with id " + mealPlanId);
                });

    mealPlanMapper.updateEntity(request, entity);
    if (entity.getHouseholdId() == null) {
      entity.setHouseholdId(resolveHouseholdId(entity.getUserId()));
    }
    MealPlanEntity updated = mealPlanRepository.save(entity);
    syncMealAttendance(updated);
    createMealNotifications(updated);

    log.info("Meal plan updated with id: {}", mealPlanId);
    return toResponseWithAttendance(updated);
  }

  @Override
  public void deleteMealPlan(Long mealPlanId) {
    log.info("Deleting meal plan with id: {}", mealPlanId);

    if (!mealPlanRepository.existsById(mealPlanId)) {
      log.warn("Meal plan not found for delete with id: {}", mealPlanId);
      throw new BaseException(ErrorCode.ERR_NOT_FOUND, "Meal plan with id " + mealPlanId);
    }

    mealPlanRepository.deleteById(mealPlanId);
    jdbcTemplate.update("DELETE FROM meal_attendance WHERE meal_id = ?", mealPlanId);
    jdbcTemplate.update("DELETE FROM notification WHERE related_meal_id = ?", mealPlanId);
    log.info("Meal plan deleted with id: {}", mealPlanId);
  }

  @Override
  @Transactional(readOnly = true)
  public List<MealPlanResponse> getMealPlansByUser(Long userId) {
    log.debug("Fetching meal plans for user: {}", userId);

    return mealPlanRepository.findByUserId(userId).stream()
        .map(this::toResponseWithAttendance)
        .collect(Collectors.toList());
  }

  private MealPlanResponse toResponseWithAttendance(MealPlanEntity entity) {
    MealPlanResponse response = mealPlanMapper.toResponse(entity);
    int actualDiners = countActualDiners(entity.getId());
    response.setActualDiners(actualDiners);
    return response;
  }

  private void syncMealAttendance(MealPlanEntity mealPlan) {
    int expectedDiners =
        mealPlan.getExpectedDiners() == null ? 0 : Math.max(mealPlan.getExpectedDiners(), 0);
    int guestCount = mealPlan.getGuestCount() == null ? 0 : Math.max(mealPlan.getGuestCount(), 0);
    int expectedMembers = Math.max(expectedDiners - guestCount, 0);

    List<Long> householdMembers =
        jdbcTemplate.query(
            "SELECT user_id FROM household_member WHERE household_id = ? ORDER BY id ASC",
            (rs, rowNum) -> rs.getLong("user_id"),
            mealPlan.getHouseholdId());

    List<Long> selectedMembers =
        householdMembers.stream().limit(expectedMembers).collect(Collectors.toList());
    int normalizedExpected = selectedMembers.size() + guestCount;

    mealPlan.setExpectedDiners(normalizedExpected);
    mealPlan.setGuestCount(guestCount);
    mealPlanRepository.save(mealPlan);

    jdbcTemplate.update("DELETE FROM meal_attendance WHERE meal_id = ?", mealPlan.getId());

    for (Long memberUserId : selectedMembers) {
      jdbcTemplate.update(
          "INSERT INTO meal_attendance (meal_id, user_id, status, is_guest) VALUES (?, ?, ?, ?)",
          mealPlan.getId(),
          memberUserId,
          "confirmed",
          Boolean.FALSE);
    }

    for (int guestIndex = 0; guestIndex < guestCount; guestIndex++) {
      jdbcTemplate.update(
          "INSERT INTO meal_attendance (meal_id, user_id, status, is_guest) VALUES (?, ?, ?, ?)",
          mealPlan.getId(),
          null,
          "confirmed",
          Boolean.TRUE);
    }
  }

  private int countActualDiners(Long mealId) {
    Integer count =
        jdbcTemplate.queryForObject(
            """
            SELECT COUNT(*)
            FROM meal_attendance
            WHERE meal_id = ?
              AND LOWER(COALESCE(status, 'confirmed')) NOT IN ('declined', 'not_eating', 'not-eating', 'skip', 'skipped', 'rejected', 'absent')
            """,
            Integer.class,
            mealId);

    return count == null ? 0 : count;
  }

  private void createMealNotifications(MealPlanEntity mealPlan) {
    List<Long> memberUserIds =
        jdbcTemplate.query(
            "SELECT user_id FROM household_member WHERE household_id = ? ORDER BY id ASC",
            (rs, rowNum) -> rs.getLong("user_id"),
            mealPlan.getHouseholdId());

    String mealTitle = normalizeMealType(mealPlan.getMealType());
    String formattedTime =
        mealPlan.getScheduleTime() == null ? "" : mealPlan.getScheduleTime().toString();

    jdbcTemplate.update(
        "DELETE FROM notification WHERE related_meal_id = ? AND type IN ('meal_attendance_confirm', 'shopping_reminder')",
        mealPlan.getId());

    for (Long memberUserId : memberUserIds) {
      jdbcTemplate.update(
          """
          INSERT INTO notification (
            household_id, user_id, title, content, is_read, metadata, type, action_required, action_taken, related_meal_id, created_at, updated_at
          ) VALUES (?, ?, ?, ?, FALSE, ?, 'meal_attendance_confirm', TRUE, FALSE, ?, NOW(), NOW())
          """,
          mealPlan.getHouseholdId(),
          memberUserId,
          "Xác nhận tham gia bữa ăn",
          "Bữa "
              + mealTitle
              + " lúc "
              + formattedTime
              + ". Nếu bạn không ăn, hãy xác nhận để báo cho cả nhà.",
          "{}",
          mealPlan.getId());
    }

    jdbcTemplate.update(
        """
        INSERT INTO notification (
          household_id, user_id, title, content, is_read, metadata, type, action_required, action_taken, related_meal_id, created_at, updated_at
        ) VALUES (?, NULL, ?, ?, FALSE, ?, 'shopping_reminder', FALSE, FALSE, ?, NOW(), NOW())
        """,
        mealPlan.getHouseholdId(),
        "Nhắc mua thực phẩm",
        "Bữa " + mealTitle + " đã lên lịch. Kiểm tra nguyên liệu để tránh thiếu thực phẩm.",
        "{}",
        mealPlan.getId());
  }

  private String normalizeMealType(String mealType) {
    if (mealType == null) {
      return "ăn";
    }
    String normalized = mealType.trim().toLowerCase();
    if (normalized.contains("breakfast") || normalized.contains("sáng")) {
      return "sáng";
    }
    if (normalized.contains("lunch") || normalized.contains("trưa")) {
      return "trưa";
    }
    return "tối";
  }

  private Long resolveHouseholdId(Long userId) {
    List<Long> householdIds =
        jdbcTemplate.query(
            "SELECT household_id FROM household_member WHERE user_id = ? ORDER BY id ASC LIMIT 1",
            (rs, rowNum) -> rs.getLong("household_id"),
            userId);

    if (householdIds.isEmpty()) {
      log.warn("Household not found for user id: {}", userId);
      throw new BaseException(ErrorCode.ERR_NOT_FOUND, "Household not found for user id " + userId);
    }

    return householdIds.get(0);
  }
}
