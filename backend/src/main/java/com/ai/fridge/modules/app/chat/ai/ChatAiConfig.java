package com.ai.fridge.modules.app.chat.ai;

import dev.langchain4j.data.embedding.Embedding;
import dev.langchain4j.data.segment.TextSegment;
import dev.langchain4j.model.embedding.EmbeddingModel;
import dev.langchain4j.model.googleai.GoogleAiEmbeddingModel;
import dev.langchain4j.model.googleai.GoogleAiGeminiChatModel;
import dev.langchain4j.model.output.Response;
import java.time.Duration;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.env.Environment;

@Configuration
@RequiredArgsConstructor
public class ChatAiConfig {

  private static final Logger log = LoggerFactory.getLogger(ChatAiConfig.class);

  private final Environment environment;

  public String geminiApiKey() {
    return environment.getProperty("gemini.api-key", "");
  }

  public String geminiModelName() {
    return environment.getProperty("gemini.model-name", "gemini-1.5-flash");
  }

  public String geminiEmbeddingModelName() {
    return environment.getProperty("gemini.embedding-model-name", "gemini-embedding-001");
  }

  @Bean
  /**
   * Build and configure the Gemini chat model client.
   * Temperature and timeouts are tuned for factual food/inventory advice.
   */
  public GoogleAiGeminiChatModel chatModel() {
    String apiKey = geminiApiKey();
    if (apiKey.isBlank()) {
      throw new IllegalStateException("Missing GEMINI_API_KEY for chat model");
    }
    return GoogleAiGeminiChatModel.builder()
        .apiKey(apiKey)
        .modelName(geminiModelName())
        // Low temperature to keep responses factual and reduce creative hallucination
        .temperature(0.2d)
        .maxOutputTokens(1024)
        // Gemini on free-tier can be slow occasionally; 60s prevents premature timeouts
        .timeout(Duration.ofSeconds(60))
        .logRequestsAndResponses(true)
        .build();
  }

  @Bean(name = "documentEmbeddingModel")
  /**
   * Embedding model configured for document/indexing tasks.
   * Uses RETRIEVAL_DOCUMENT task type to produce embeddings optimized for
   * storage/indexing.
   */
  public EmbeddingModel documentEmbeddingModel() {
    String apiKey = geminiApiKey();
    if (apiKey.isBlank()) {
      log.warn("GEMINI_API_KEY is missing. documentEmbeddingModel is disabled.");
      return new DisabledEmbeddingModel();
    }
    return GoogleAiEmbeddingModel.builder()
        .apiKey(apiKey)
        .modelName(geminiEmbeddingModelName())
        // Use the DOCUMENT taskType to optimize embeddings for indexing (store-side)
        .taskType(GoogleAiEmbeddingModel.TaskType.RETRIEVAL_DOCUMENT)
        // Match pgvector column dimensionality in DB to avoid casting errors
        .outputDimensionality(768)
        // Embedding calls also use a 60s timeout for reliability on free tiers
        .timeout(Duration.ofSeconds(60))
        .logRequestsAndResponses(false)
        .build();
  }

  @Bean(name = "queryEmbeddingModel")
  /**
   * Embedding model configured for query/search tasks.
   * Uses RETRIEVAL_QUERY task type to produce embeddings optimized for
   * nearest-neighbor lookup.
   */
  public EmbeddingModel queryEmbeddingModel() {
    String apiKey = geminiApiKey();
    if (apiKey.isBlank()) {
      log.warn("GEMINI_API_KEY is missing. queryEmbeddingModel is disabled.");
      return new DisabledEmbeddingModel();
    }
    return GoogleAiEmbeddingModel.builder()
        .apiKey(apiKey)
        .modelName(geminiEmbeddingModelName())
        // Use the QUERY taskType to optimize embeddings for search/recall (better
        // cosine results)
        .taskType(GoogleAiEmbeddingModel.TaskType.RETRIEVAL_QUERY)
        // Keep same dimensionality as document embeddings so cosine comparisons work
        .outputDimensionality(768)
        .timeout(Duration.ofSeconds(60))
        .logRequestsAndResponses(false)
        .build();
  }

  private static class DisabledEmbeddingModel implements EmbeddingModel {
    /**
     * Fallback embedding model used when no API key is configured.
     * Returns an empty embedding response so the application can degrade gracefully
     * without throwing exceptions during lookup or startup.
     */
    @Override
    public Response<List<Embedding>> embedAll(List<TextSegment> textSegments) {
      return Response.from(List.of());
    }
  }
}
