package com.ai.fridge.modules.app.chat.dto;

import jakarta.validation.constraints.NotBlank;
import java.time.LocalDateTime;
import java.util.List;

public final class ChatDtos {

  private ChatDtos() {}

  public record ChatMessageRequest(
      Long sessionId, @NotBlank(message = "message is required") String message) {}

  public record ChatMessageDto(
      Long id, String senderType, String content, LocalDateTime timestamp) {}

  public record ChatHistoryResponse(Long sessionId, List<ChatMessageDto> messages) {}

  public record ChatSourceDto(String type, String title, String referenceId, String snippet) {}

  public record ChatResponse(
      Long sessionId,
      String answer,
      List<ChatSourceDto> sources,
      boolean usedRag,
      boolean usedTools) {}
}
