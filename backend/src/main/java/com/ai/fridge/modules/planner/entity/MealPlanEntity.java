package com.ai.fridge.modules.planner.entity;

import jakarta.persistence.*;
import java.time.LocalDate;
import java.time.LocalDateTime;
import lombok.*;

@Entity
@Table(
    name = "meal",
    indexes = {
      @Index(name = "idx_meal_user_id", columnList = "user_id"),
      @Index(name = "idx_meal_schedule_time", columnList = "schedule_time")
    })
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MealPlanEntity {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(name = "user_id", nullable = false)
  private Long userId;

  @Column(name = "household_id")
  private Long householdId;

  @Column(name = "meal_type", nullable = false, length = 100)
  private String mealType;

  @Column(name = "schedule_date")
  private LocalDate scheduleDate;

  @Column(name = "schedule_time", nullable = false)
  private LocalDateTime scheduleTime;

  @Column(name = "status", length = 100)
  private String status;

  @Column(columnDefinition = "TEXT")
  private String notes;

  @Column(name = "expected_diners")
  private Integer expectedDiners;

  @Column(name = "guest_count")
  private Integer guestCount;

  @Column(name = "created_at", nullable = false, updatable = false)
  private LocalDateTime createdAt;

  @Column(name = "updated_at")
  private LocalDateTime updatedAt;

  @PrePersist
  protected void onCreate() {
    if (scheduleTime != null) {
      scheduleDate = scheduleTime.toLocalDate();
    }
    if (status == null || status.isBlank()) {
      status = "planned";
    }
    if (expectedDiners == null || expectedDiners < 0) {
      expectedDiners = 0;
    }
    if (guestCount == null || guestCount < 0) {
      guestCount = 0;
    }
    createdAt = LocalDateTime.now();
    updatedAt = LocalDateTime.now();
  }

  @PreUpdate
  protected void onUpdate() {
    if (scheduleTime != null) {
      scheduleDate = scheduleTime.toLocalDate();
    }
    if (expectedDiners == null || expectedDiners < 0) {
      expectedDiners = 0;
    }
    if (guestCount == null || guestCount < 0) {
      guestCount = 0;
    }
    updatedAt = LocalDateTime.now();
  }
}
