package com.ai.fridge.modules.app.chat.service;

import com.ai.fridge.modules.app.chat.dto.ChatDtos;
import dev.langchain4j.data.embedding.Embedding;
import dev.langchain4j.model.embedding.EmbeddingModel;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Locale;
import java.util.Objects;
import java.util.stream.Collectors;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

@Service
@Slf4j
public class KnowledgeBaseService {

  private static final int DEFAULT_TOP_K = 3;

  private final JdbcTemplate jdbcTemplate;
  private final EmbeddingModel documentEmbeddingModel;
  private final EmbeddingModel queryEmbeddingModel;

  public KnowledgeBaseService(
      JdbcTemplate jdbcTemplate,
      @Qualifier("documentEmbeddingModel") EmbeddingModel documentEmbeddingModel,
      @Qualifier("queryEmbeddingModel") EmbeddingModel queryEmbeddingModel) {
    this.jdbcTemplate = jdbcTemplate;
    this.documentEmbeddingModel = documentEmbeddingModel;
    this.queryEmbeddingModel = queryEmbeddingModel;
  }

  public KnowledgeBaseContext findRelevantContext(String query, int maxResults) {
    // Luồng chat chỉ SELECT, không được phép đồng bộ (avoid N+1 query problem)
    // ensureRecipeVectorsSynced() được gọi tại startup, không gọi mỗi khi
    // findRelevantContext()

    if (query == null || query.isBlank()) {
      return new KnowledgeBaseContext("", List.of());
    }

    int limit = maxResults <= 0 ? DEFAULT_TOP_K : maxResults;
    String keywordPhrase = extractDishPhrase(query);
    String queryVector = toVectorLiteral(queryEmbeddingModel.embed(query).content().vector());

    List<RecipeHit> hits =
        jdbcTemplate.query(
            """
            WITH scored AS MATERIALIZED (
              SELECT rv.recipe_id,
                     r.name,
                     rv.source_text,
                     (rv.embedding <=> CAST(? AS vector)) AS distance,
                     CASE
                       WHEN ? <> '' AND rv.source_text ILIKE ('%' || ? || '%') THEN 1
                       WHEN ? <> '' AND r.name ILIKE ('%' || ? || '%') THEN 1
                       ELSE 0
                     END AS keyword_match
              FROM recipe_vectors rv
              JOIN recipe r ON r.id = rv.recipe_id
            )
            SELECT recipe_id,
                   name,
                   source_text,
                   1 - distance AS relevance
            FROM scored
            ORDER BY keyword_match DESC, distance ASC
            LIMIT ?
            """,
            (rs, rowNum) ->
                new RecipeHit(
                    rs.getLong("recipe_id"),
                    rs.getString("name"),
                    rs.getString("source_text"),
                    rs.getDouble("relevance")),
            queryVector,
            keywordPhrase,
            keywordPhrase,
            keywordPhrase,
            keywordPhrase,
            limit);

    log.info(
        "[KB] query='{}' keywordPhrase='{}' limit={} hitCount={}",
        truncate(query, 120),
        keywordPhrase,
        limit,
        hits.size());

    List<ChatDtos.ChatSourceDto> sources =
        hits.stream()
            .map(
                hit ->
                    new ChatDtos.ChatSourceDto(
                        "recipe",
                        hit.recipeName(),
                        String.valueOf(hit.recipeId()),
                        truncate(hit.sourceText(), 400)))
            .toList();

    String contextText =
        hits.isEmpty()
            ? "Không có công thức liên quan đủ mạnh từ knowledge base hiện tại."
            : hits.stream()
                .map(this::formatHitForPrompt)
                .collect(Collectors.joining("\n\n---\n\n"));

    return new KnowledgeBaseContext(contextText, sources);
  }

  public void syncRecipe(Long recipeId) {
    if (recipeId == null || recipeId <= 0) {
      return;
    }
    upsertRecipeVector(recipeId);
  }

  public void ensureRecipeVectorsSynced() {
    List<Long> recipeIds =
        jdbcTemplate.query(
            "SELECT id FROM recipe ORDER BY id ASC", (rs, rowNum) -> rs.getLong("id"));

    for (Long recipeId : recipeIds) {
      upsertRecipeVector(recipeId);
    }
  }

  /**
   * TASK 2: Startup Sync - Gọi ensureRecipeVectorsSynced() chỉ một lần khi Backend khởi động Chạy
   * trong thread riêng để không làm chặn quá trình Spring Boot startup
   */
  @EventListener(ApplicationReadyEvent.class)
  public void initializeRecipeVectorsOnStartup() {
    Thread syncThread =
        new Thread(
            () -> {
              try {
                log.info("[KB STARTUP] Starting recipe vectors sync on application ready...");
                long startTime = System.currentTimeMillis();

                ensureRecipeVectorsSynced();

                long duration = System.currentTimeMillis() - startTime;
                log.info("[KB STARTUP] Recipe vectors sync completed in {} ms", duration);
              } catch (Exception ex) {
                log.error("[KB STARTUP] Failed to sync recipe vectors on startup", ex);
              }
            },
            "KnowledgeBase-Sync-Thread");

    syncThread.setDaemon(false);
    syncThread.start();
  }

  public record KnowledgeBaseContext(String contextText, List<ChatDtos.ChatSourceDto> sources) {}

  private void upsertRecipeVector(Long recipeId) {
    RecipeDocument recipeDocument = loadRecipeDocument(recipeId);
    if (recipeDocument == null) {
      return;
    }

    String contentHash = sha256(recipeDocument.sourceText());
    List<String> existingHashes =
        jdbcTemplate.query(
            "SELECT content_hash FROM recipe_vectors WHERE recipe_id = ? LIMIT 1",
            (rs, rowNum) -> rs.getString("content_hash"),
            recipeId);

    if (!existingHashes.isEmpty() && Objects.equals(existingHashes.get(0), contentHash)) {
      return;
    }

    Embedding embedding = documentEmbeddingModel.embed(recipeDocument.sourceText()).content();
    String vectorLiteral = toVectorLiteral(embedding.vector());

    if (existingHashes.isEmpty()) {
      jdbcTemplate.update(
          """
              INSERT INTO recipe_vectors (recipe_id, source_text, content_hash, embedding, created_at, updated_at)
              VALUES (?, ?, ?, CAST(? AS vector), ?, ?)
              """,
          recipeId,
          recipeDocument.sourceText(),
          contentHash,
          vectorLiteral,
          LocalDateTime.now(),
          LocalDateTime.now());
      return;
    }

    jdbcTemplate.update(
        """
            UPDATE recipe_vectors
            SET source_text = ?,
                content_hash = ?,
                embedding = CAST(? AS vector),
                updated_at = ?
            WHERE recipe_id = ?
            """,
        recipeDocument.sourceText(),
        contentHash,
        vectorLiteral,
        LocalDateTime.now(),
        recipeId);
  }

  private RecipeDocument loadRecipeDocument(Long recipeId) {
    List<RecipeDocument> documents =
        jdbcTemplate.query(
            """
            SELECT r.id,
                   r.name,
                   r.instructions,
                   r.cook_time_minutes,
                   r.difficulty
            FROM recipe r
            WHERE r.id = ?
            """,
            (rs, rowNum) ->
                new RecipeDocument(
                    rs.getLong("id"),
                    rs.getString("name"),
                    rs.getString("instructions"),
                    rs.getObject("cook_time_minutes") == null
                        ? null
                        : rs.getInt("cook_time_minutes"),
                    rs.getString("difficulty"),
                    null),
            recipeId);

    if (documents.isEmpty()) {
      return null;
    }

    RecipeDocument baseDocument = documents.get(0);

    List<String> ingredients =
        jdbcTemplate.query(
            """
            SELECT f.name, rf.require_quantity, rf.unit
            FROM recipe_food rf
            JOIN food f ON f.id = rf.food_id
            WHERE rf.recipe_id = ?
            ORDER BY rf.id ASC
            """,
            (rs, rowNum) ->
                String.format(
                    Locale.ROOT,
                    "- %s: %s %s",
                    rs.getString("name"),
                    formatQuantity(rs.getDouble("require_quantity")),
                    rs.getString("unit")),
            recipeId);

    List<String> steps =
        jdbcTemplate.query(
            """
            SELECT step_number, instruction
            FROM recipe_step
            WHERE recipe_id = ?
            ORDER BY step_number ASC
            """,
            (rs, rowNum) ->
                String.format(
                    Locale.ROOT, "%d. %s", rs.getInt("step_number"), rs.getString("instruction")),
            recipeId);

    StringBuilder sourceText = new StringBuilder();
    sourceText.append("Tên món: ").append(baseDocument.name()).append('\n');
    if (baseDocument.difficulty() != null && !baseDocument.difficulty().isBlank()) {
      sourceText.append("Độ khó: ").append(baseDocument.difficulty()).append('\n');
    }
    if (baseDocument.cookTimeMinutes() != null) {
      sourceText.append("Thời gian nấu: ").append(baseDocument.cookTimeMinutes()).append(" phút\n");
    }
    if (baseDocument.instructions() != null && !baseDocument.instructions().isBlank()) {
      sourceText.append("Mô tả: ").append(baseDocument.instructions()).append('\n');
    }
    if (!ingredients.isEmpty()) {
      sourceText.append("Nguyên liệu:\n").append(String.join("\n", ingredients)).append('\n');
    }
    if (!steps.isEmpty()) {
      sourceText.append("Các bước:\n").append(String.join("\n", steps));
    }

    return new RecipeDocument(
        baseDocument.recipeId(),
        baseDocument.name(),
        baseDocument.instructions(),
        baseDocument.cookTimeMinutes(),
        baseDocument.difficulty(),
        sourceText.toString());
  }

  private String formatHitForPrompt(RecipeHit hit) {
    return "Công thức: "
        + hit.recipeName()
        + "\n"
        + truncate(hit.sourceText(), 700)
        + "\nĐộ liên quan: "
        + String.format(Locale.ROOT, "%.4f", hit.relevance());
  }

  private String truncate(String text, int maxLength) {
    if (text == null) {
      return "";
    }

    String normalized = text.trim();
    if (normalized.length() <= maxLength) {
      return normalized;
    }
    return normalized.substring(0, maxLength).trim() + "...";
  }

  private String extractDishPhrase(String query) {
    if (query == null) {
      return "";
    }

    String normalized = query.trim();
    if (normalized.isEmpty()) {
      return "";
    }

    String lowered = normalized.toLowerCase(Locale.ROOT);
    String[] prefixes = {
      "goi y cong thuc",
      "gợi ý công thức",
      "goi y mon",
      "gợi ý món",
      "cong thuc",
      "công thức",
      "recipe"
    };

    for (String prefix : prefixes) {
      if (lowered.startsWith(prefix)) {
        String candidate = normalized.substring(prefix.length()).trim();
        if (!candidate.isBlank()) {
          return candidate;
        }
      }
    }

    return normalized;
  }

  private String formatQuantity(double quantity) {
    if (quantity == Math.rint(quantity)) {
      return String.valueOf((long) quantity);
    }
    return String.format(Locale.ROOT, "%.2f", quantity);
  }

  private String sha256(String text) {
    try {
      MessageDigest digest = MessageDigest.getInstance("SHA-256");
      byte[] hash = digest.digest(text.getBytes(StandardCharsets.UTF_8));
      return java.util.HexFormat.of().formatHex(hash);
    } catch (NoSuchAlgorithmException ex) {
      throw new IllegalStateException("SHA-256 is not available", ex);
    }
  }

  private String toVectorLiteral(float[] vector) {
    StringBuilder builder = new StringBuilder("[");
    for (int i = 0; i < vector.length; i++) {
      if (i > 0) {
        builder.append(',');
      }
      builder.append(Float.toString(vector[i]));
    }
    return builder.append(']').toString();
  }

  private record RecipeHit(Long recipeId, String recipeName, String sourceText, Double relevance) {}

  private record RecipeDocument(
      Long recipeId,
      String name,
      String instructions,
      Integer cookTimeMinutes,
      String difficulty,
      String sourceText) {}
}
