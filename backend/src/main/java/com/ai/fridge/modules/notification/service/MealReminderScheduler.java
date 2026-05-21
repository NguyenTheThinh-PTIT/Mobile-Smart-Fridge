package com.ai.fridge.modules.notification.service;

import java.util.List;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Component
@RequiredArgsConstructor
public class MealReminderScheduler {

  private static final List<String> DECLINED_STATUSES =
      List.of("declined", "not_eating", "not-eating", "skip", "skipped", "rejected", "absent");

  private final JdbcTemplate jdbcTemplate;

  @Scheduled(cron = "0 * * * * *")
  @Transactional
  public void sendMealStartingSoonNotifications() {
    List<ReminderCandidate> candidates =
        jdbcTemplate.query(
            """
            SELECT DISTINCT
              m.id AS meal_id,
              m.household_id,
              m.meal_type,
              m.schedule_time,
              ma.user_id
            FROM meal m
            JOIN meal_attendance ma ON ma.meal_id = m.id
            WHERE m.schedule_time IS NOT NULL
              AND m.schedule_time > (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Ho_Chi_Minh')
              AND m.schedule_time <= (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Ho_Chi_Minh') + INTERVAL '60 minutes'
              AND LOWER(COALESCE(m.status, 'planned')) = 'planned'
              AND ma.user_id IS NOT NULL
              AND LOWER(COALESCE(ma.status, 'confirmed')) NOT IN ('declined', 'not_eating', 'not-eating', 'skip', 'skipped', 'rejected', 'absent')
            """,
            (rs, rowNum) ->
                new ReminderCandidate(
                    rs.getLong("meal_id"),
                    rs.getLong("household_id"),
                    rs.getLong("user_id"),
                    rs.getString("meal_type"),
                    rs.getString("schedule_time")));

    int insertedCount = 0;
    for (ReminderCandidate candidate : candidates) {
      Integer existing =
          jdbcTemplate.queryForObject(
              """
              SELECT COUNT(*)
              FROM notification
              WHERE related_meal_id = ?
                AND user_id = ?
                AND type = 'meal_starting_soon'
              """,
              Integer.class,
              candidate.mealId(),
              candidate.userId());

      if (existing != null && existing > 0) {
        continue;
      }

      jdbcTemplate.update(
          """
          INSERT INTO notification (
            household_id, user_id, type, title, content, is_read, action_required,
            action_taken, related_meal_id, metadata, created_at, updated_at
          )
          VALUES (?, ?, 'meal_starting_soon', ?, ?, FALSE, FALSE, FALSE, ?, '{}', NOW(), NOW())
          """,
          candidate.householdId(),
          candidate.userId(),
          "Sắp tới giờ ăn",
          "Bữa "
              + normalizeMealType(candidate.mealType())
              + " sẽ bắt đầu lúc "
              + candidate.scheduleTime()
              + ".",
          candidate.mealId());

      insertedCount++;
    }

    if (insertedCount > 0) {
      log.info("Created {} meal_starting_soon notifications", insertedCount);
    }
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

  private record ReminderCandidate(
      Long mealId, Long householdId, Long userId, String mealType, String scheduleTime) {}
}
