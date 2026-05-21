package com.ai.fridge.modules.app.chat.service;

import com.ai.fridge.common.exceptions.AppException;
import com.ai.fridge.common.exceptions.ErrorCode;
import com.ai.fridge.modules.app.auth.AuthService;
import com.ai.fridge.modules.app.chat.dto.ChatDtos;
import com.ai.fridge.modules.app.inventory.InventoryService;
import dev.langchain4j.data.message.AiMessage;
import dev.langchain4j.data.message.ChatMessage;
import dev.langchain4j.data.message.SystemMessage;
import dev.langchain4j.data.message.UserMessage;
import dev.langchain4j.model.chat.request.ChatRequest;
import dev.langchain4j.model.chat.response.ChatResponse;
import dev.langchain4j.model.googleai.GoogleAiGeminiChatModel;
import java.net.SocketTimeoutException;
import java.text.Normalizer;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Slf4j
@RequiredArgsConstructor
public class ChatOrchestratorService {

  /** Default history limit used when client does not specify a limit. */
  private static final int DEFAULT_HISTORY_LIMIT = 20;

  /**
   * Sliding window history size passed to the LLM. Keep small to avoid token
   * overflow
   * and to keep context focused on recent turns.
   */
  private static final int MODEL_HISTORY_LIMIT = 6;

  /**
   * Maximum allowed history limit to protect the service from very large
   * requests.
   */
  private static final int MAX_HISTORY_LIMIT = 100;

  private static final String OUT_OF_SCOPE_MESSAGE = "Mình chỉ hỗ trợ tư vấn kho thực phẩm (số lượng, danh sách, hạn dùng/sắp hết hạn) "
      + "và gợi ý công thức món ăn dựa trên dữ liệu hiện có. "
      + "Bạn thử hỏi về tồn kho hoặc món ăn nhé.";

  private final AuthService authService;
  private final JdbcTemplate jdbcTemplate;
  private final InventoryService inventoryService;
  private final KnowledgeBaseService knowledgeBaseService;
  private final GoogleAiGeminiChatModel chatModel;

  /**
   * Orchestrate receiving a user message, RAG retrieval and LLM response
   * generation.
   * Validates input, resolves user/member/session, persists messages and returns
   * the assistant reply.
   * 
   * @param authorizationHeader Authorization header (JWT)
   * @param request             incoming chat message payload
   */
  @Transactional
  public ChatDtos.ChatResponse sendMessage(
      String authorizationHeader, ChatDtos.ChatMessageRequest request) {
    /**
     * Orchestration flow for sending a chat message:
     * 1. Validate input.
     * 2. Resolve user and household member context.
     * 3. Resolve or create chat session.
     * 4. Persist user's message.
     * 5. Check scope; return out-of-scope reply early if needed.
     * 6. Summarize inventory and detect intent (recipe vs inventory).
     * 7. Build RAG query and fetch relevant knowledge base context.
     * 8. Generate AI answer using a sliding-window of recent messages.
     * 9. Persist assistant reply and return response.
     */
    if (request == null || request.message() == null || request.message().isBlank()) {
      throw new AppException(ErrorCode.ERR_VALIDATION, "Message cannot be empty");
    }

    try {
      Long userId = resolveUserId(authorizationHeader);
      Long memberId = resolveMemberId(userId);
      Long sessionId = resolveOrCreateSession(memberId, request.sessionId(), request.message());
      log.info(
          "[ChatOrchestrator] resolved userId={}, memberId={}, sessionId={}",
          userId,
          memberId,
          sessionId);

      persistMessage(sessionId, "USER", request.message());

      if (!isSupportedScope(request.message())) {
        persistMessage(sessionId, "ASSISTANT", OUT_OF_SCOPE_MESSAGE);
        return new ChatDtos.ChatResponse(sessionId, OUT_OF_SCOPE_MESSAGE, List.of(), false, false);
      }

      String inventorySummary = inventoryService.summarizeInventoryByUserId(userId);
      log.info(
          "[ChatOrchestrator] inventory summary length={} for userId={}, memberId={}",
          inventorySummary.length(),
          userId,
          memberId);

      boolean recipeIntent = isRecipeIntent(request.message());
      int ragLimit = recipeIntent ? 5 : 3;
      String ragQuery = recipeIntent ? buildRagQuery(request.message(), inventorySummary) : request.message();
      KnowledgeBaseService.KnowledgeBaseContext knowledgeBaseContext = knowledgeBaseService
          .findRelevantContext(ragQuery, ragLimit);

      String answer = generateAnswerSafe(
          request.message(), inventorySummary, knowledgeBaseContext, sessionId, recipeIntent);
      if (answer == null || answer.isBlank()) {
        answer = "Mình chưa tạo được câu trả lời phù hợp. Bạn vui lòng thử lại.";
      }

      persistMessage(sessionId, "ASSISTANT", answer);

      return new ChatDtos.ChatResponse(
          sessionId,
          answer,
          knowledgeBaseContext.sources(),
          !knowledgeBaseContext.sources().isEmpty(),
          false);
    } catch (AppException ex) {
      throw ex;
    } catch (DataAccessException ex) {
      throw new AppException(ErrorCode.ERR_DB_ERROR, ex.getMessage());
    } catch (RuntimeException ex) {
      throw mapAiException(ex);
    }
  }

  private Long resolveUserId(String authorizationHeader) {
    return authService.requireUserIdFromAuthorizationHeader(authorizationHeader);
  }

  private Long resolveMemberId(Long userId) {
    // Choose the household member that has the most available inventory batches
    // (ORDER BY COUNT(ib.id) DESC). This prefers the household where the user
    // is actively tracking inventory when multiple memberships exist.
    List<Long> ids = jdbcTemplate.query(
        """
            SELECT hm.id
            FROM household_member hm
            LEFT JOIN inventory i ON i.household_id = hm.household_id
            LEFT JOIN inventory_batch ib ON ib.inventory_id = i.id AND ib.quantity > 0
            WHERE hm.user_id = ?
            GROUP BY hm.id
            ORDER BY COUNT(ib.id) DESC, hm.id ASC
            LIMIT 1
            """,
        (rs, rowNum) -> rs.getLong("id"),
        userId);

    // If no household member found for user => user has no household context
    if (ids.isEmpty()) {
      throw new AppException(
          ErrorCode.ERR_NOT_FOUND, "Household member not found for current user");
    }
    return ids.get(0);
  }

  private Long resolveOrCreateSession(Long memberId, Long requestedSessionId, String userMessage) {
    if (requestedSessionId != null) {
      List<Long> existing = jdbcTemplate.query(
          "SELECT id FROM chat_session WHERE id = ? AND member_id = ? LIMIT 1",
          (rs, rowNum) -> rs.getLong("id"),
          requestedSessionId,
          memberId);
      if (!existing.isEmpty()) {
        return existing.get(0);
      }
    }

    // Use first 50 characters of the user's message as a human-friendly session
    // title
    String title = buildSessionTitle(userMessage);
    return jdbcTemplate.queryForObject(
        """
            INSERT INTO chat_session (member_id, title, context_tags, created_at, updated_at)
            VALUES (?, ?, NULL, ?, ?)
            RETURNING id
            """,
        Long.class,
        memberId,
        title,
        LocalDateTime.now(),
        LocalDateTime.now());
  }

  private void persistMessage(Long sessionId, String senderType, String content) {
    // Persist chat messages for both USER and ASSISTANT so the full dialogue
    // is available for history display and for constructing the LLM sliding window.
    jdbcTemplate.update(
        """
            INSERT INTO chat_message (session_id, sender_type, content, "timestamp")
            VALUES (?, ?, ?, ?)
            """,
        sessionId,
        senderType,
        content,
        LocalDateTime.now());
  }

  // Persist both USER and ASSISTANT messages to maintain full dialogue history
  // which is later used for the sliding-window context sent to the LLM and for UI
  // history.

  /**
   * Retrieve chat message history for a given session. Query returns all messages
   * ordered
   * chronologically (oldest first).
   *
   * @param sessionId the chat session ID
   * @return list of ChatMessageDto ordered by timestamp ascending
   */
  public List<ChatDtos.ChatMessageDto> getChatHistory(Long sessionId) {
    return getChatHistory(sessionId, DEFAULT_HISTORY_LIMIT);
  }

  /**
   * Retrieve chat history for a session with a default limit.
   * 
   * @param sessionId chat session id
   * @return list of chat message DTOs in chronological order
   */

  public List<ChatDtos.ChatMessageDto> getChatHistory(Long sessionId, Integer limit) {
    if (sessionId == null || sessionId <= 0) {
      return List.of();
    }

    int safeLimit = normalizeLimit(limit);

    try {
      // Fetch newest messages first to use LIMIT efficiently, then reverse to
      // chronological order
      List<ChatDtos.ChatMessageDto> newestFirst = jdbcTemplate.query(
          """
              SELECT id, sender_type, content, "timestamp"
              FROM chat_message
              WHERE CAST(session_id AS VARCHAR) = CAST(? AS VARCHAR)
              ORDER BY "timestamp" DESC, id DESC
              LIMIT ?
              """,
          (rs, rowNum) -> new ChatDtos.ChatMessageDto(
              rs.getLong("id"),
              rs.getString("sender_type"),
              rs.getString("content"),
              rs.getObject("timestamp", LocalDateTime.class)),
          sessionId,
          safeLimit);

      // Reverse the DESC result so callers receive messages oldest->newest
      // (chronological)
      java.util.Collections.reverse(newestFirst);
      return newestFirst;
    } catch (Exception ex) {
      log.error(
          "[ChatOrchestrator] Lỗi SQL khi lấy lịch sử của sessionId {}: {}",
          sessionId,
          ex.getMessage());
      return List.of();
    }
  }

  public ChatDtos.ChatHistoryResponse getChatHistoryForCurrentUser(
      String authorizationHeader, Integer limit) {
    Long userId = resolveUserId(authorizationHeader);
    Long sessionId = resolveLatestSessionIdByUserId(userId);

    if (sessionId == null) {
      return new ChatDtos.ChatHistoryResponse(null, List.of());
    }

    return new ChatDtos.ChatHistoryResponse(sessionId, getChatHistory(sessionId, limit));
  }

  /**
   * Get the latest session id for the current authenticated user and return its
   * history.
   * 
   * @param authorizationHeader Authorization header (JWT)
   * @param limit               optional max messages to return
   */

  private Long resolveLatestSessionIdByUserId(Long userId) {
    List<Long> sessionIds = jdbcTemplate.query(
        """
            SELECT cs.id
            FROM chat_session cs
            JOIN household_member hm ON hm.id = cs.member_id
            WHERE hm.user_id = ?
            ORDER BY cs.updated_at DESC, cs.id DESC
            LIMIT 1
            """,
        (rs, rowNum) -> rs.getLong("id"),
        userId);

    if (sessionIds.isEmpty()) {
      return null;
    }
    return sessionIds.get(0);
  }

  private String generateAnswerSafe(
      String userMessage,
      String inventorySummary,
      KnowledgeBaseService.KnowledgeBaseContext knowledgeBaseContext,
      Long sessionId,
      boolean recipeIntent) {
    String systemPrompt = buildSystemPrompt(inventorySummary, knowledgeBaseContext.contextText(), recipeIntent);

    // Retrieve full chat history for this session (chronological order)
    List<ChatDtos.ChatMessageDto> history = getChatHistory(sessionId);
    if (!history.isEmpty()) {
      ChatDtos.ChatMessageDto lastMessage = history.get(history.size() - 1);
      if ("USER".equalsIgnoreCase(lastMessage.senderType())
          && lastMessage.content() != null
          && lastMessage.content().trim().equals(userMessage.trim())) {
        history = history.subList(0, history.size() - 1);
      }
    }

    // Use a sliding window of the most recent messages to keep token count low.
    // Recipe intents use a slightly smaller window because the RAG context is
    // usually larger.
    int modelHistoryLimit = recipeIntent ? 4 : MODEL_HISTORY_LIMIT;
    int startIndex = Math.max(0, history.size() - modelHistoryLimit);
    // recentHistory contains only the last N messages (excluding the current user
    // message)
    List<ChatDtos.ChatMessageDto> recentHistory = history.subList(startIndex, history.size());

    List<ChatMessage> messagesList = new ArrayList<>();
    messagesList.add(SystemMessage.from(systemPrompt));

    for (ChatDtos.ChatMessageDto messageDto : recentHistory) {
      if (messageDto.content() == null || messageDto.content().isBlank()) {
        continue;
      }

      if ("USER".equalsIgnoreCase(messageDto.senderType())) {
        messagesList.add(UserMessage.from(messageDto.content()));
      } else if ("ASSISTANT".equalsIgnoreCase(messageDto.senderType()) && !recipeIntent) {
        messagesList.add(AiMessage.from(messageDto.content()));
      }
    }

    // The current user message is appended after the system and recent history
    // so the LLM sees the latest request in context but we avoid duplicating it
    // if it already exists as the last stored USER turn.
    messagesList.add(UserMessage.from(userMessage));

    log.info("[AI RAG] 1. Inventory Data:\n{}", inventorySummary);
    log.info("[AI RAG] 2. Retrieved Context:\n{}", formatRetrievedContext(knowledgeBaseContext));
    log.info("[AI RAG] 3. Final System Prompt:\n{}", systemPrompt);
    log.info("[AI RAG] Sliding window history size: {}", recentHistory.size());
    log.info("[AI RAG] 4. User Request: {}", userMessage);

    ChatRequest chatRequest = ChatRequest.builder().messages(messagesList).build();

    ChatResponse chatResponse = chatModel.chat(chatRequest);
    String llmResponse = chatResponse.aiMessage() == null || chatResponse.aiMessage().text() == null
        ? ""
        : chatResponse.aiMessage().text();

    log.info("[AI RAG] 5. LLM Response:\n{}", llmResponse);
    return llmResponse;
  }

  private String formatRetrievedContext(
      KnowledgeBaseService.KnowledgeBaseContext knowledgeBaseContext) {
    if (knowledgeBaseContext == null) {
      return "KnowledgeBaseContext is null";
    }

    if (knowledgeBaseContext.sources() == null || knowledgeBaseContext.sources().isEmpty()) {
      return "No sources found. Raw context: " + knowledgeBaseContext.contextText();
    }

    return knowledgeBaseContext.sources().stream()
        .map(source -> "- title=" + source.title() + " | snippet=" + source.snippet())
        .reduce((left, right) -> left + "\n" + right)
        .orElse("No sources found");
  }

  private AppException mapAiException(RuntimeException ex) {
    String message = ex.getMessage() == null ? "" : ex.getMessage().toLowerCase();
    String className = ex.getClass().getName().toLowerCase();

    // Classify timeout-related errors separately so callers can show retry hints
    if (isTimeout(ex) || message.contains("timeout")) {
      return new AppException(ErrorCode.ERR_AI_TIMEOUT, ex.getMessage());
    }

    // Provider/authentication errors are a separate category and often require
    // configuration fixes (API key, credentials) rather than retrying the request
    if (className.contains("langchain4j")
        || className.contains("gemini")
        || message.contains("api key")
        || message.contains("authentication")
        || message.contains("unauthorized")) {
      return new AppException(ErrorCode.ERR_AI_PROVIDER, ex.getMessage());
    }

    // All other runtime issues are classified as processing errors
    return new AppException(ErrorCode.ERR_AI_PROCESSING, ex.getMessage());
  }

  private boolean isTimeout(Throwable throwable) {
    Throwable current = throwable;
    while (current != null) {
      if (current instanceof SocketTimeoutException) {
        return true;
      }

      String className = current.getClass().getName().toLowerCase();
      if (className.contains("timeout")) {
        return true;
      }

      current = current.getCause();
    }
    return false;
  }

  private String buildSystemPrompt(
      String inventorySummary, String ragContext, boolean recipeIntent) {
    boolean inventoryAvailable = hasInventoryItems(inventorySummary);
    // Two prompt modes: recipe (RAG-heavy) and inventory (local-data-heavy).
    // They guide the assistant to prefer RAG results for recipes and local
    // inventory
    // facts for inventory queries.
    String modeInstruction = recipeIntent
        ? """
            Chế độ hiện tại: GỢI Ý CÔNG THỨC.
            - BẮT BUỘC trả về danh sách công thức từ ngữ cảnh RAG nếu có.
            - KHÔNG được từ chối chỉ vì tủ lạnh trống.
            - Nếu tủ lạnh trống, vẫn gợi ý món theo yêu cầu user và ghi rõ nguyên liệu nào người dùng chưa có.
            - Trình bày dạng danh sách đánh số.
            """
        : """
            Chế độ hiện tại: HỎI ĐÁP TỒN KHO.
            - Ưu tiên trả lời thông tin trong tủ lạnh: số lượng, nhóm thực phẩm, hạn dùng, sắp hết hạn.
            - Nếu user hỏi ngoài tồn kho, hướng user sang câu hỏi phù hợp về tồn kho hoặc công thức.
            """;

    String inventoryState = inventoryAvailable
        ? "Tồn kho hiện có dữ liệu để đối chiếu nguyên liệu."
        : "Tồn kho hiện trống, nhưng vẫn phải trả danh sách công thức nếu user đang hỏi công thức.";

    return """
        Bạn là trợ lý AI cho ứng dụng quản lý tủ lạnh và gợi ý món ăn.
        Trả lời bằng tiếng Việt, ngắn gọn, thực tế và ưu tiên tận dụng nguyên liệu sẵn có.
        Nếu dữ liệu không đủ, hãy nói rõ điều đó thay vì bịa thông tin.

        Phạm vi bắt buộc:
        - Chỉ tư vấn về tồn kho thực phẩm: số lượng, danh sách món đang có, món sắp hết hạn/hết hạn.
        - Chỉ gợi ý công thức món ăn dựa trên inventory và ngữ cảnh công thức RAG được cung cấp.
        - Từ chối mọi yêu cầu ngoài phạm vi trên.

          Quy tắc chung:
        - Chỉ dựa trên ngữ cảnh tồn kho và công thức được cung cấp.
          - Nếu có nhiều công thức phù hợp, hãy ưu tiên món dễ làm và (nếu có dữ liệu) nguyên liệu sắp hết hạn.
        - Gợi ý có cấu trúc: món đề xuất, nguyên liệu chính, các bước rút gọn, lưu ý.
          - Không khẳng định "không có công thức" khi ngữ cảnh RAG đã chứa công thức.

          %s

          Trạng thái tồn kho:
          %s

        %s

        Ngữ cảnh công thức RAG:
        %s
        """
        .formatted(modeInstruction, inventoryState, inventorySummary, ragContext);
  }

  private String buildRagQuery(String userMessage, String inventorySummary) {
    return """
        Câu hỏi người dùng:
        %s

        Tồn kho hiện tại của người dùng:
        %s
        """
        .formatted(userMessage, inventorySummary);
  }

  private boolean isRecipeIntent(String message) {
    if (message == null || message.isBlank()) {
      return false;
    }

    // Normalize and check for recipe-related keywords. Recipe intent affects
    // the RAG limit and how much knowledge-base context we fetch.
    String normalized = normalizeText(message);
    return containsAny(normalized, "mon an", "cong thuc", "recipe", "nau", "goi y mon");
  }

  private boolean hasInventoryItems(String inventorySummary) {
    if (inventorySummary == null || inventorySummary.isBlank()) {
      return false;
    }

    String normalized = normalizeText(inventorySummary);
    return !normalized.contains("chua co thuc pham nao");
  }

  private boolean isSupportedScope(String message) {
    if (message == null || message.isBlank()) {
      return false;
    }

    // Normalize (strip diacritics, lowercase) before keyword matching to
    // make detection robust to Vietnamese accent variations.
    String normalized = normalizeText(message);

    return containsAny(
        normalized,
        "ton kho",
        "tu lanh",
        "trong tu",
        "kho",
        "thuc pham",
        "nguyen lieu",
        "san pham",
        "danh sach",
        "co mon nao",
        "mon trong tu",
        "so luong",
        "con bao nhieu",
        "sap het han",
        "het han",
        "han dung",
        "mon an",
        "cong thuc",
        "nau",
        "goi y mon",
        "recipe");
  }

  private String normalizeText(String text) {
    // Decompose unicode (NFD) and remove combining diacritics to normalize
    // Vietnamese
    // before keyword matching. This improves robustness when users omit accents.
    String noAccent = Normalizer.normalize(text, Normalizer.Form.NFD).replaceAll("\\p{M}+", "");
    return noAccent.toLowerCase().trim();
  }

  private boolean containsAny(String source, String... keywords) {
    for (String keyword : keywords) {
      if (source.contains(keyword)) {
        return true;
      }
    }
    return false;
  }

  private String buildSessionTitle(String message) {
    String normalized = message == null ? "Tin nhan moi" : message.trim();
    if (normalized.isEmpty()) {
      return "Tin nhan moi";
    }
    return normalized.length() > 50 ? normalized.substring(0, 50) : normalized;
  }

  private int normalizeLimit(Integer limit) {
    if (limit == null || limit <= 0) {
      return DEFAULT_HISTORY_LIMIT;
    }
    return Math.min(limit, MAX_HISTORY_LIMIT);
  }
}
