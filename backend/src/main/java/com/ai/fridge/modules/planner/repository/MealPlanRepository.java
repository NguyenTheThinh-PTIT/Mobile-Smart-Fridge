package com.ai.fridge.modules.planner.repository;

import com.ai.fridge.modules.planner.entity.MealPlanEntity;
import java.time.LocalDateTime;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface MealPlanRepository extends JpaRepository<MealPlanEntity, Long> {

  List<MealPlanEntity> findByUserId(Long userId);

  List<MealPlanEntity> findByUserIdAndScheduleTimeBetween(
      Long userId, LocalDateTime startDate, LocalDateTime endDate);
}
