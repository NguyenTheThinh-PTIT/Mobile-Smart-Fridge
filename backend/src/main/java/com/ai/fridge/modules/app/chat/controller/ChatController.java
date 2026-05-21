package com.ai.fridge.modules.app.chat.controller;

import com.ai.fridge.common.base.ApiResponse;
import com.ai.fridge.modules.app.chat.dto.ChatDtos;
import com.ai.fridge.modules.app.chat.service.ChatOrchestratorService;
import jakarta.validation.Valid;
import java.util.List;
import java.util.Locale;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/chat")
@RequiredArgsConstructor
public class ChatController {

  private final ChatOrchestratorService chatOrchestratorService;

  /**
   * Controller for chat-related endpoints.
   * Exposes endpoints to send messages and fetch chat history for the current
   * user or a session.
   */

  /**
   * Send a chat message to the AI assistant.
   * Request: ChatDtos.ChatMessageRequest { message: string, sessionId?: number }
   * Response: ChatDtos.ChatResponse { sessionId, answer, sources, hasSources, ...
   * }
   * If sessionId is null, the server will resolve or create a session for the
   * current user.
   */
  @PostMapping("/send")
  public ApiResponse<ChatDtos.ChatResponse> send(
      @RequestHeader(value = "Authorization", required = false) String authorization,
      @Valid @RequestBody ChatDtos.ChatMessageRequest request) {
    return ApiResponse.success(chatOrchestratorService.sendMessage(authorization, request));
  }

  /**
   * Get chat history for the current authenticated user (resolved from JWT
   * Authorization).
   * The "current user" is the user id extracted from the Authorization header.
   * Default limit is applied when omitted. Mobile clients sometimes send the
   * strings "undefined" or "null" — parseLimit handles those gracefully.
   */
  @GetMapping("/history")
  public ApiResponse<ChatDtos.ChatHistoryResponse> getMyChatHistory(
      @RequestHeader(value = "Authorization", required = false) String authorization,
      @RequestParam(value = "limit", required = false) String limit) {
    Integer safeLimit = parseLimit(limit);
    return ApiResponse.success(
        chatOrchestratorService.getChatHistoryForCurrentUser(authorization, safeLimit));
  }

  /**
   * Get chat message history for a given session. Returns all messages in
   * chronological order
   * (oldest first).
   *
   * @param sessionId the chat session ID
   * @return list of ChatMessageDto
   */
  @GetMapping("/{sessionId}/messages")
  public ApiResponse<List<ChatDtos.ChatMessageDto>> getChatHistory(
      @PathVariable("sessionId") String sessionId) {
    Long safeSessionId = parseSessionId(sessionId);
    if (safeSessionId == null) {
      return ApiResponse.success(List.of());
    }
    return ApiResponse.success(chatOrchestratorService.getChatHistory(safeSessionId));
  }

  /**
   * Returns all messages for a given session in chronological order (oldest
   * first).
   * If the client passes the literal strings "undefined" or "null" (common from
   * mobile navigation), parseSessionId will treat them as null.
   */

  private Integer parseLimit(String rawLimit) {
    if (rawLimit == null || rawLimit.isBlank()) {
      return 20;
    }

    String normalized = rawLimit.trim().toLowerCase(Locale.ROOT);
    if ("undefined".equals(normalized) || "null".equals(normalized)) {
      return 20;
    }

    try {
      int parsed = Integer.parseInt(normalized);
      return parsed > 0 ? parsed : 20;
    } catch (NumberFormatException ex) {
      return 20;
    }
  }

  private Long parseSessionId(String rawSessionId) {
    if (rawSessionId == null || rawSessionId.isBlank()) {
      return null;
    }

    String normalized = rawSessionId.trim().toLowerCase(Locale.ROOT);
    if ("undefined".equals(normalized) || "null".equals(normalized)) {
      return null;
    }

    try {
      long parsed = Long.parseLong(normalized);
      return parsed > 0 ? parsed : null;
    } catch (NumberFormatException ex) {
      return null;
    }
  }
}
