package com.ai.fridge.common.utils;

import java.util.concurrent.Callable;
import java.util.logging.Logger;

/**
 * RetryTemplate - Utility class cho retry logic
 *
 * <p>Cung cấp method helper để thực hiện retry với exponential backoff Dùng khi không muốn
 * dùng @Retryable annotation
 *
 * <p>Ví dụ:
 *
 * <pre>
 * try {
 *   User user = RetryTemplate.executeWithRetry(() -> {
 *       return userRepository.findById(1L).orElseThrow();
 *   }, 3, 1000, 2.0);
 * } catch (Exception e) {
 *   log.error("Failed after retries", e);
 * }
 * </pre>
 *
 * @author System
 * @since 1.0
 */
public class RetryTemplate {
  private static final Logger logger = Logger.getLogger(RetryTemplate.class.getName());

  private static final int DEFAULT_MAX_RETRIES = 3;
  private static final long DEFAULT_DELAY_MS = 1000;
  private static final double DEFAULT_BACKOFF_MULTIPLIER = 2.0;

  /**
   * Thực hiện một operation với retry logic
   *
   * @param <T> Return type của operation
   * @param operation Callable operation
   * @param maxRetries Số lần retry tối đa
   * @param initialDelayMs Delay ban đầu (milliseconds)
   * @param backoffMultiplier Hệ số backoff (exponential)
   * @return Kết quả từ operation
   * @throws Exception Nếu tất cả retries thất bại
   */
  public static <T> T executeWithRetry(
      Callable<T> operation, int maxRetries, long initialDelayMs, double backoffMultiplier)
      throws Exception {

    Exception lastException = null;

    for (int attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        logger.fine("Retry attempt " + attempt + "/" + maxRetries);
        return operation.call();
      } catch (Exception e) {
        lastException = e;

        if (attempt == maxRetries) {
          logger.severe("All " + maxRetries + " retry attempts failed");
          throw e;
        }

        long delay = calculateBackoffDelay(attempt, initialDelayMs, backoffMultiplier);
        logger.warning(
            "Attempt "
                + attempt
                + " failed, waiting "
                + delay
                + "ms before retry. Error: "
                + e.getMessage());

        try {
          Thread.sleep(delay);
        } catch (InterruptedException ie) {
          Thread.currentThread().interrupt();
          throw new RuntimeException("Retry interrupted", ie);
        }
      }
    }

    throw lastException != null
        ? lastException
        : new RuntimeException("Retry failed: Unknown error");
  }

  /**
   * Thực hiện operation với retry logic mặc định
   *
   * @param <T> Return type
   * @param operation Operation
   * @return Kết quả
   * @throws Exception Nếu tất cả retries thất bại
   */
  public static <T> T executeWithRetry(Callable<T> operation) throws Exception {
    return executeWithRetry(
        operation, DEFAULT_MAX_RETRIES,
        DEFAULT_DELAY_MS, DEFAULT_BACKOFF_MULTIPLIER);
  }

  /**
   * Tính toán delay với exponential backoff
   *
   * @param attemptNumber Số lần attempt hiện tại
   * @param initialDelayMs Delay ban đầu
   * @param backoffMultiplier Hệ số backoff
   * @return Delay (milliseconds)
   */
  private static long calculateBackoffDelay(
      int attemptNumber, long initialDelayMs, double backoffMultiplier) {

    long exponentialDelay =
        (long) (initialDelayMs * Math.pow(backoffMultiplier, attemptNumber - 1));

    // Thêm random jitter (0-1000ms) để tránh thundering herd
    long jitter = System.nanoTime() % 1000;

    return exponentialDelay + jitter;
  }
}
