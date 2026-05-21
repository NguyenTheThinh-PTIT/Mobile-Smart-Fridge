package com.ai.fridge.config;

import java.util.logging.Logger;
import org.springframework.context.annotation.Configuration;
import org.springframework.retry.annotation.EnableRetry;

/**
 * RetryConfig - Spring Retry Configuration
 *
 * <p>Bật tính năng @Retryable và @CircuitBreaker cho Spring Retry framework
 *
 * <p>Sử dụng: @Service public class UserService { @Retryable( retryFor = {SQLException.class},
 * maxAttempts = 3, backoff = @Backoff(delay = 2000, multiplier = 2.0) ) public User
 * getUserById(Long id) { // Nếu throw exception, sẽ tự động retry } @Recover public User
 * getUserIdRecover(SQLException ex, Long id) { log.error("Failed after retries for userId: {}",
 * id); // Fallback logic return null; } }
 *
 * @author System
 * @since 1.0
 */
@Configuration
@EnableRetry
public class RetryConfig {

  private static final Logger logger = Logger.getLogger(RetryConfig.class.getName());

  /**
   * Công cụ Retry Config
   *
   * <p>Spring Retry sẽ: 1. Retry tự động trên các exception được chỉ định 2. Sử dụng exponential
   * backoff nếu cấu hình 3. Gọi @Recover method nếu tất cả retries đều thất bại
   *
   * <p>Các exception thường được retry: - SQLException: Database lock, connection timeout -
   * TimeoutException: Network timeout - IOException: Network I/O error - RemoteAccessException:
   * External service timeout
   */

  /** Initialization log */
  public RetryConfig() {
    logger.info("RetryConfig initialized - @Retryable annotation enabled");
  }
}
