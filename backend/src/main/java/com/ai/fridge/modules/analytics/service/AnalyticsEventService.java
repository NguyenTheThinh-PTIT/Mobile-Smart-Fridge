package com.ai.fridge.modules.analytics.service;

import com.ai.fridge.common.dto.AnalyticsEventRequest;
import com.ai.fridge.common.dto.AnalyticsEventResponse;
import java.util.List;

public interface AnalyticsEventService {

  AnalyticsEventResponse createEvent(Long userId, AnalyticsEventRequest request);

  List<AnalyticsEventResponse> getEventsByUser(Long userId);

  List<AnalyticsEventResponse> getEventsByType(String eventType);

  List<AnalyticsEventResponse> getEventsByUserAndType(Long userId, String eventType);
}
