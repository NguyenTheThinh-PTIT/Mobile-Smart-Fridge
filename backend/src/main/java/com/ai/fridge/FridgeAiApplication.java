package com.ai.fridge;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

/**
 * Fridge AI - Backend Application Main Entry Point
 *
 * <p>Monolithic application with multi-module architecture: - core-module: Exception handling,
 * retry logic - identity-module: User authentication & management - inventory-module: Inventory &
 * item tracking - planner-module: Meal planning - social-module: Recipe sharing & community -
 * analytics-module: Analytics & reporting
 */
@SpringBootApplication
@EnableScheduling
public class FridgeAiApplication {

  public static void main(String[] args) {
    SpringApplication.run(FridgeAiApplication.class, args);
  }
}
