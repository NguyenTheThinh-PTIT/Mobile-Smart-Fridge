package com.ai.fridge.modules.analytics.repository;

import com.ai.fridge.modules.analytics.entity.AnalyticsEventEntity;
import java.time.LocalDateTime;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface AnalyticsEventRepository extends JpaRepository<AnalyticsEventEntity, Long> {

  List<AnalyticsEventEntity> findByUserId(Long userId);

  List<AnalyticsEventEntity> findByEventType(String eventType);

  List<AnalyticsEventEntity> findByUserIdAndEventType(Long userId, String eventType);

  List<AnalyticsEventEntity> findByCreatedAtBetween(LocalDateTime startDate, LocalDateTime endDate);
}
