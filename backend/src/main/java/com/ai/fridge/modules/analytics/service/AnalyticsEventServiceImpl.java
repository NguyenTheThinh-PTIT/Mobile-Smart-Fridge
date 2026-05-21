package com.ai.fridge.modules.analytics.service;

import com.ai.fridge.common.dto.AnalyticsEventRequest;
import com.ai.fridge.common.dto.AnalyticsEventResponse;
import com.ai.fridge.modules.analytics.entity.AnalyticsEventEntity;
import com.ai.fridge.modules.analytics.mapper.AnalyticsEventMapper;
import com.ai.fridge.modules.analytics.repository.AnalyticsEventRepository;
import java.util.List;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class AnalyticsEventServiceImpl implements AnalyticsEventService {

  private final AnalyticsEventRepository analyticsEventRepository;
  private final AnalyticsEventMapper analyticsEventMapper;

  @Override
  public AnalyticsEventResponse createEvent(Long userId, AnalyticsEventRequest request) {
    log.info("Creating analytics event for user: {} with type: {}", userId, request.getEventType());

    AnalyticsEventEntity entity = analyticsEventMapper.toEntity(request, userId);
    AnalyticsEventEntity saved = analyticsEventRepository.save(entity);

    log.debug("Analytics event created with id: {}", saved.getId());
    return analyticsEventMapper.toResponse(saved);
  }

  @Override
  @Transactional(readOnly = true)
  public List<AnalyticsEventResponse> getEventsByUser(Long userId) {
    log.debug("Fetching analytics events for user: {}", userId);

    return analyticsEventRepository.findByUserId(userId).stream()
        .map(analyticsEventMapper::toResponse)
        .collect(Collectors.toList());
  }

  @Override
  @Transactional(readOnly = true)
  public List<AnalyticsEventResponse> getEventsByType(String eventType) {
    log.debug("Fetching analytics events by type: {}", eventType);

    return analyticsEventRepository.findByEventType(eventType).stream()
        .map(analyticsEventMapper::toResponse)
        .collect(Collectors.toList());
  }

  @Override
  @Transactional(readOnly = true)
  public List<AnalyticsEventResponse> getEventsByUserAndType(Long userId, String eventType) {
    log.debug("Fetching analytics events for user: {} with type: {}", userId, eventType);

    return analyticsEventRepository.findByUserIdAndEventType(userId, eventType).stream()
        .map(analyticsEventMapper::toResponse)
        .collect(Collectors.toList());
  }
}
