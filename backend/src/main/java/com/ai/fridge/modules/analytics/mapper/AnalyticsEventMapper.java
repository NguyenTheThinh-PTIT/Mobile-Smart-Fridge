package com.ai.fridge.modules.analytics.mapper;

import com.ai.fridge.common.dto.AnalyticsEventRequest;
import com.ai.fridge.common.dto.AnalyticsEventResponse;
import com.ai.fridge.modules.analytics.entity.AnalyticsEventEntity;
import org.springframework.stereotype.Component;

@Component
public class AnalyticsEventMapper {

  public AnalyticsEventResponse toResponse(AnalyticsEventEntity entity) {
    if (entity == null) return null;

    return AnalyticsEventResponse.builder()
        .id(entity.getId())
        .userId(entity.getUserId())
        .eventType(entity.getEventType())
        .eventData(entity.getEventData())
        .createdAt(entity.getCreatedAt())
        .build();
  }

  public AnalyticsEventEntity toEntity(AnalyticsEventRequest request, Long userId) {
    if (request == null) return null;

    return AnalyticsEventEntity.builder()
        .userId(userId)
        .eventType(request.getEventType())
        .eventData(request.getEventData())
        .build();
  }
}
