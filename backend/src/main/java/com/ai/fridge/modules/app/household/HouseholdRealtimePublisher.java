package com.ai.fridge.modules.app.household;

import java.time.Instant;
import java.util.Map;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;

@Component
public class HouseholdRealtimePublisher {

  private final SimpMessagingTemplate messagingTemplate;

  public HouseholdRealtimePublisher(SimpMessagingTemplate messagingTemplate) {
    this.messagingTemplate = messagingTemplate;
  }

  public void publishEvent(Long householdId, String eventType, Map<String, Object> payload) {
    messagingTemplate.convertAndSend(
        "/topic/household." + householdId,
        Map.of(
            "eventType", eventType,
            "householdId", householdId,
            "timestamp", Instant.now().toString(),
            "payload", payload));
  }
}
