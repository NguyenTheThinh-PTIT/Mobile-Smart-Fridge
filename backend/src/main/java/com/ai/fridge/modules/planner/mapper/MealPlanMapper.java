package com.ai.fridge.modules.planner.mapper;

import com.ai.fridge.common.dto.MealPlanRequest;
import com.ai.fridge.common.dto.MealPlanResponse;
import com.ai.fridge.modules.planner.entity.MealPlanEntity;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import org.springframework.stereotype.Component;

@Component
public class MealPlanMapper {

  private static final DateTimeFormatter DATE_TIME_FORMATTER = DateTimeFormatter.ISO_DATE_TIME;

  public MealPlanResponse toResponse(MealPlanEntity entity) {
    if (entity == null) return null;

    int expectedDiners =
        entity.getExpectedDiners() == null ? 0 : Math.max(entity.getExpectedDiners(), 0);
    int guestCount = entity.getGuestCount() == null ? 0 : Math.max(entity.getGuestCount(), 0);

    return MealPlanResponse.builder()
        .id(entity.getId())
        .userId(entity.getUserId())
        .mealType(entity.getMealType())
        .plannedDate(entity.getScheduleTime())
        .notes(entity.getNotes())
        .expectedDiners(expectedDiners)
        .actualDiners(expectedDiners)
        .guestCount(guestCount)
        .createdAt(entity.getCreatedAt())
        .updatedAt(entity.getUpdatedAt())
        .build();
  }

  public MealPlanEntity toEntity(MealPlanRequest request, Long userId) {
    if (request == null) return null;

    LocalDateTime plannedDate = LocalDateTime.parse(request.getPlannedDate(), DATE_TIME_FORMATTER);

    return MealPlanEntity.builder()
        .userId(userId)
        .mealType(request.getMealType())
        .scheduleDate(plannedDate.toLocalDate())
        .scheduleTime(plannedDate)
        .status("planned")
        .notes(request.getNotes())
        .expectedDiners(
            request.getExpectedDiners() == null ? 0 : Math.max(request.getExpectedDiners(), 0))
        .guestCount(request.getGuestCount() == null ? 0 : Math.max(request.getGuestCount(), 0))
        .build();
  }

  public void updateEntity(MealPlanRequest request, MealPlanEntity entity) {
    if (request == null || entity == null) return;

    if (request.getMealType() != null) {
      entity.setMealType(request.getMealType());
    }
    if (request.getPlannedDate() != null) {
      LocalDateTime plannedDate =
          LocalDateTime.parse(request.getPlannedDate(), DATE_TIME_FORMATTER);
      entity.setScheduleDate(plannedDate.toLocalDate());
      entity.setScheduleTime(plannedDate);
    }
    if (request.getNotes() != null) {
      entity.setNotes(request.getNotes());
    }
    if (request.getExpectedDiners() != null) {
      entity.setExpectedDiners(Math.max(request.getExpectedDiners(), 0));
    }
    if (request.getGuestCount() != null) {
      entity.setGuestCount(Math.max(request.getGuestCount(), 0));
    }
  }
}
