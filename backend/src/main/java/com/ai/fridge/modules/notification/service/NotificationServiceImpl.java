package com.ai.fridge.modules.notification.service;

import com.ai.fridge.common.dto.MealAttendanceDecisionRequest;
import com.ai.fridge.common.dto.NotificationResponse;
import com.ai.fridge.common.exceptions.BaseException;
import com.ai.fridge.common.exceptions.ErrorCode;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.List;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class NotificationServiceImpl implements NotificationService {

  private final JdbcTemplate jdbcTemplate;

  @Override
  @Transactional
  public List<NotificationResponse> getNotificationsByUser(Long userId) {
    Long householdId = resolveHouseholdId(userId);

    ensureExpiringItemNotification(householdId);
    ensureLatestMemberJoinNotification(householdId);
    ensureMealConfirmationNotifications(householdId, userId);

    return jdbcTemplate.query(
        """
        SELECT id, household_id, user_id, type, title, content, is_read, action_required, action_taken,
               related_meal_id, metadata, created_at, read_at
        FROM notification
        WHERE household_id = ?
          AND (user_id IS NULL OR user_id = ?)
        ORDER BY COALESCE(created_at, NOW()) DESC, id DESC
        """,
        notificationRowMapper(),
        householdId,
        userId);
  }

  @Override
  public NotificationResponse markNotificationAsRead(Long userId, Long notificationId) {
    NotificationResponse existing = getNotificationForUser(userId, notificationId);

    jdbcTemplate.update(
        """
        UPDATE notification
        SET is_read = TRUE,
            read_at = NOW(),
            updated_at = NOW()
        WHERE id = ?
        """,
        notificationId);

    return NotificationResponse.builder()
        .id(existing.getId())
        .householdId(existing.getHouseholdId())
        .userId(existing.getUserId())
        .type(existing.getType())
        .title(existing.getTitle())
        .content(existing.getContent())
        .isRead(Boolean.TRUE)
        .actionRequired(existing.getActionRequired())
        .actionTaken(existing.getActionTaken())
        .relatedMealId(existing.getRelatedMealId())
        .metadata(existing.getMetadata())
        .createdAt(existing.getCreatedAt())
        .readAt(existing.getReadAt())
        .build();
  }

  @Override
  public NotificationResponse handleMealAttendanceDecision(
      Long userId, Long notificationId, MealAttendanceDecisionRequest request) {
    NotificationResponse notification = getNotificationForUser(userId, notificationId);

    if (!"meal_attendance_confirm".equalsIgnoreCase(String.valueOf(notification.getType()))) {
      throw new BaseException(
          ErrorCode.ERR_BUSINESS_LOGIC, "Thông báo này không hỗ trợ xác nhận ăn");
    }

    if (notification.getRelatedMealId() == null) {
      throw new BaseException(
          ErrorCode.ERR_NOT_FOUND, "Không tìm thấy bữa ăn liên quan đến thông báo");
    }

    String newStatus = Boolean.TRUE.equals(request.getWillEat()) ? "confirmed" : "not_eating";

    int updatedRows =
        jdbcTemplate.update(
            """
            UPDATE meal_attendance
            SET status = ?
            WHERE meal_id = ?
              AND user_id = ?
              AND is_guest = FALSE
            """,
            newStatus,
            notification.getRelatedMealId(),
            userId);

    if (updatedRows == 0) {
      jdbcTemplate.update(
          """
          INSERT INTO meal_attendance (meal_id, user_id, status, is_guest)
          VALUES (?, ?, ?, FALSE)
          """,
          notification.getRelatedMealId(),
          userId,
          newStatus);
    }

    jdbcTemplate.update(
        """
        UPDATE notification
        SET is_read = TRUE,
            action_taken = TRUE,
            read_at = NOW(),
            updated_at = NOW()
        WHERE id = ?
        """,
        notificationId);

    if (!Boolean.TRUE.equals(request.getWillEat())) {
      String actorName =
          jdbcTemplate.queryForObject(
              "SELECT COALESCE(fullname, email, 'Thành viên') FROM \"user\" WHERE id = ?",
              String.class,
              userId);

      jdbcTemplate.update(
          """
          INSERT INTO notification (
            household_id, user_id, type, title, content, is_read, action_required,
            action_taken, related_meal_id, metadata, created_at, updated_at
          )
          VALUES (?, NULL, 'meal_attendance_broadcast', ?, ?, FALSE, FALSE, FALSE, ?, '{}', NOW(), NOW())
          """,
          notification.getHouseholdId(),
          "Cập nhật tham gia bữa ăn",
          actorName + " xác nhận không ăn bữa sắp tới. Cả nhà có thể điều chỉnh phần ăn.",
          notification.getRelatedMealId());
    }

    return NotificationResponse.builder()
        .id(notification.getId())
        .householdId(notification.getHouseholdId())
        .userId(notification.getUserId())
        .type(notification.getType())
        .title(notification.getTitle())
        .content(notification.getContent())
        .isRead(Boolean.TRUE)
        .actionRequired(notification.getActionRequired())
        .actionTaken(Boolean.TRUE)
        .relatedMealId(notification.getRelatedMealId())
        .metadata(notification.getMetadata())
        .createdAt(notification.getCreatedAt())
        .readAt(notification.getReadAt())
        .build();
  }

  private void ensureExpiringItemNotification(Long householdId) {
    Integer expiringCount =
        jdbcTemplate.queryForObject(
            """
            SELECT COUNT(*)
            FROM inventory_batch ib
            JOIN inventory i ON i.id = ib.inventory_id
            WHERE i.household_id = ?
              AND ib.expiration_date IS NOT NULL
              AND ib.expiration_date <= CURRENT_DATE + INTERVAL '2 days'
              AND LOWER(COALESCE(ib.status, 'active')) = 'active'
            """,
            Integer.class,
            householdId);

    if (expiringCount == null || expiringCount <= 0) {
      return;
    }

    Integer existing =
        jdbcTemplate.queryForObject(
            """
            SELECT COUNT(*)
            FROM notification
            WHERE household_id = ?
              AND type = 'ingredient_expiring'
              AND created_at::date = CURRENT_DATE
            """,
            Integer.class,
            householdId);

    if (existing != null && existing > 0) {
      return;
    }

    jdbcTemplate.update(
        """
        INSERT INTO notification (
          household_id, user_id, type, title, content, is_read, action_required,
          action_taken, metadata, created_at, updated_at
        ) VALUES (?, NULL, 'ingredient_expiring', ?, ?, FALSE, FALSE, FALSE, '{}', NOW(), NOW())
        """,
        householdId,
        "Nguyên liệu sắp hết hạn",
        "Có "
            + expiringCount
            + " nguyên liệu sắp hết hạn trong 2 ngày tới. Hãy ưu tiên sử dụng sớm.");
  }

  private void ensureLatestMemberJoinNotification(Long householdId) {
    Long latestMemberId =
        jdbcTemplate
            .query(
                "SELECT id FROM household_member WHERE household_id = ? ORDER BY id DESC LIMIT 1",
                (rs, rowNum) -> rs.getLong("id"),
                householdId)
            .stream()
            .findFirst()
            .orElse(null);

    if (latestMemberId == null) {
      return;
    }

    Integer existing =
        jdbcTemplate.queryForObject(
            """
            SELECT COUNT(*)
            FROM notification
            WHERE household_id = ?
              AND type = 'member_joined'
              AND metadata LIKE ?
            """,
            Integer.class,
            householdId,
            "%\"member_id\":" + latestMemberId + "%");

    if (existing != null && existing > 0) {
      return;
    }

    String memberName =
        jdbcTemplate.queryForObject(
            """
            SELECT COALESCE(u.fullname, u.email, 'Thành viên mới')
            FROM household_member hm
            JOIN "user" u ON u.id = hm.user_id
            WHERE hm.id = ?
            """,
            String.class,
            latestMemberId);

    jdbcTemplate.update(
        """
        INSERT INTO notification (
          household_id, user_id, type, title, content, is_read, action_required,
          action_taken, metadata, created_at, updated_at
        ) VALUES (?, NULL, 'member_joined', ?, ?, FALSE, FALSE, FALSE, ?, NOW(), NOW())
        """,
        householdId,
        "Thành viên mới vào nhóm",
        memberName + " vừa tham gia nhóm gia đình.",
        "{\"member_id\":" + latestMemberId + "}");
  }

  private void ensureMealConfirmationNotifications(Long householdId, Long userId) {
    List<Long> mealIds =
        jdbcTemplate.query(
            """
            SELECT id
            FROM meal
            WHERE household_id = ?
              AND schedule_time >= NOW() - INTERVAL '2 hours'
              AND LOWER(COALESCE(status, 'planned')) = 'planned'
            ORDER BY schedule_time DESC
            LIMIT 20
            """,
            (rs, rowNum) -> rs.getLong("id"),
            householdId);

    for (Long mealId : mealIds) {
      Integer exists =
          jdbcTemplate.queryForObject(
              """
              SELECT COUNT(*)
              FROM notification
              WHERE household_id = ?
                AND user_id = ?
                AND type = 'meal_attendance_confirm'
                AND related_meal_id = ?
              """,
              Integer.class,
              householdId,
              userId,
              mealId);

      if (exists != null && exists > 0) {
        continue;
      }

      String mealType =
          jdbcTemplate.queryForObject(
              "SELECT meal_type FROM meal WHERE id = ?", String.class, mealId);

      String scheduleTime =
          jdbcTemplate.queryForObject(
              "SELECT schedule_time::text FROM meal WHERE id = ?", String.class, mealId);

      jdbcTemplate.update(
          """
          INSERT INTO notification (
            household_id, user_id, title, content, is_read, metadata, type, action_required, action_taken, related_meal_id, created_at, updated_at
          ) VALUES (?, ?, ?, ?, FALSE, '{}', 'meal_attendance_confirm', TRUE, FALSE, ?, NOW(), NOW())
          """,
          householdId,
          userId,
          "Xác nhận tham gia bữa ăn",
          "Bữa "
              + normalizeMealType(mealType)
              + " lúc "
              + scheduleTime
              + ". Nếu bạn không ăn, hãy xác nhận để báo cho cả nhà.",
          mealId);
    }
  }

  private NotificationResponse getNotificationForUser(Long userId, Long notificationId) {
    Long householdId = resolveHouseholdId(userId);

    return jdbcTemplate
        .query(
            """
            SELECT id, household_id, user_id, type, title, content, is_read, action_required, action_taken,
                   related_meal_id, metadata, created_at, read_at
            FROM notification
            WHERE id = ?
              AND household_id = ?
              AND (user_id IS NULL OR user_id = ?)
            """,
            notificationRowMapper(),
            notificationId,
            householdId,
            userId)
        .stream()
        .findFirst()
        .orElseThrow(
            () -> new BaseException(ErrorCode.ERR_NOT_FOUND, "Không tìm thấy thông báo phù hợp"));
  }

  private Long resolveHouseholdId(Long userId) {
    return jdbcTemplate
        .query(
            "SELECT household_id FROM household_member WHERE user_id = ? ORDER BY id ASC LIMIT 1",
            (rs, rowNum) -> rs.getLong("household_id"),
            userId)
        .stream()
        .findFirst()
        .orElseThrow(
            () ->
                new BaseException(
                    ErrorCode.ERR_NOT_FOUND, "Không tìm thấy hộ gia đình của người dùng"));
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

  private RowMapper<NotificationResponse> notificationRowMapper() {
    return (rs, rowNum) -> mapNotification(rs);
  }

  private NotificationResponse mapNotification(ResultSet rs) throws SQLException {
    return NotificationResponse.builder()
        .id(rs.getLong("id"))
        .householdId(rs.getLong("household_id"))
        .userId(rs.getObject("user_id") == null ? null : rs.getLong("user_id"))
        .type(rs.getString("type"))
        .title(rs.getString("title"))
        .content(rs.getString("content"))
        .isRead(rs.getBoolean("is_read"))
        .actionRequired(rs.getBoolean("action_required"))
        .actionTaken(rs.getBoolean("action_taken"))
        .relatedMealId(
            rs.getObject("related_meal_id") == null ? null : rs.getLong("related_meal_id"))
        .metadata(rs.getString("metadata"))
        .createdAt(
            rs.getTimestamp("created_at") == null
                ? null
                : rs.getTimestamp("created_at").toLocalDateTime())
        .readAt(
            rs.getTimestamp("read_at") == null
                ? null
                : rs.getTimestamp("read_at").toLocalDateTime())
        .build();
  }
}
