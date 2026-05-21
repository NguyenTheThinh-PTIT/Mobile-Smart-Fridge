package com.ai.fridge.common.utils;

import java.util.logging.Logger;

/**
 * Retry Handler - Xử lý retry logic cho các operation Cung cấp mechanism để retry lại failed
 * operations
 */
public class RetryHandler {

  private static final Logger logger = Logger.getLogger(RetryHandler.class.getName());

  private int maxRetries;
  private long delayMs;
  private double backoffMultiplier;

  public RetryHandler(int maxRetries, long delayMs) {
    this(maxRetries, delayMs, 1.0);
  }

  public RetryHandler(int maxRetries, long delayMs, double backoffMultiplier) {
    this.maxRetries = maxRetries;
    this.delayMs = delayMs;
    this.backoffMultiplier = backoffMultiplier;
  }

  /**
   * Thực hiện một operation với retry logic
   *
   * @param operation Callable to execute
   * @return Result từ operation
   */
  public <T> T execute(RetryableOperation<T> operation) throws Exception {
    for (int attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        logger.fine("Attempt " + attempt + " of " + maxRetries);
        return operation.execute();
      } catch (Exception e) {
        if (attempt == maxRetries) {
          logger.severe("All " + maxRetries + " attempts failed");
          throw e;
        }

        long waitTime = calculateBackoff(attempt);
        logger.warning(
            "Attempt "
                + attempt
                + " failed. Waiting "
                + waitTime
                + "ms before retry. Error: "
                + e.getMessage());

        Thread.sleep(waitTime);
      }
    }

    throw new RuntimeException("Failed to execute operation after " + maxRetries + " attempts");
  }

  private long calculateBackoff(int attempt) {
    return (long) (delayMs * Math.pow(backoffMultiplier, attempt - 1));
  }

  @FunctionalInterface
  public interface RetryableOperation<T> {
    T execute() throws Exception;
  }
}
