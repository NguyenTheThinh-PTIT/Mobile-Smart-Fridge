package com.ai.fridge.modules.app.report.dto;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

public final class ReportDtos {

  private ReportDtos() {}

  public enum ReportPeriod {
    WEEK,
    MONTH,
    YEAR;

    public static ReportPeriod from(String rawPeriod) {
      if (rawPeriod == null || rawPeriod.isBlank()) {
        return WEEK;
      }

      try {
        return ReportPeriod.valueOf(rawPeriod.trim().toUpperCase());
      } catch (IllegalArgumentException exception) {
        return WEEK;
      }
    }
  }

  public record ReportSummaryResponse(
      ReportPeriod period,
      int consumedCount,
      int wasteCount,
      double wasteRatePercent,
      List<CookingTrendPoint> cookingTrend,
      List<CookingHistoryItem> cookingHistory) {}

  public record CookingTrendPoint(String label, int count) {}

  public record FoodStatItem(
      String name, double quantity, String unit, int occurrenceCount, double ratioPercent) {}

  public record FoodListResponse(ReportPeriod period, List<FoodStatItem> items) {}

  public record CookingHistoryResponse(ReportPeriod period, List<CookingHistoryItem> items) {}

  public record ReportInsightsResponse(
      ReportPeriod period,
      List<ExpiryRiskItem> expiryRisk,
      List<MealTypePoint> mealTypeDistribution,
      List<CategoryWastePoint> wasteByCategory,
      List<FoodStatItem> topConsumedFoods) {}

  public record ExpiryRiskItem(
      String foodName,
      double quantity,
      String unit,
      LocalDate expirationDate,
      int daysToExpire,
      String riskLevel) {}

  public record MealTypePoint(String mealType, int count, double ratioPercent) {}

  public record CategoryWastePoint(
      String categoryName, double quantity, String unit, double ratioPercent) {}

  public record CookingHistoryItem(
      Long dishId,
      String dishName,
      String ingredients,
      double rating,
      Integer cookMinutes,
      LocalDateTime scheduledAt,
      String imageUrl) {}
}
