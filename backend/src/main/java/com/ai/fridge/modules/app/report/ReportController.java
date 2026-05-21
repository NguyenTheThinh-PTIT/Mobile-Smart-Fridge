package com.ai.fridge.modules.app.report;

import com.ai.fridge.common.base.ApiEnvelope;
import com.ai.fridge.modules.app.report.dto.ReportDtos;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/reports")
public class ReportController {

  private final ReportService reportService;

  public ReportController(ReportService reportService) {
    this.reportService = reportService;
  }

  @GetMapping("/summary")
  public ApiEnvelope<ReportDtos.ReportSummaryResponse> getSummary(
      @RequestHeader(value = "Authorization", required = false) String authorization,
      @RequestParam(value = "period", required = false, defaultValue = "WEEK") String period) {
    return ApiEnvelope.success(
        reportService.getSummary(authorization, ReportDtos.ReportPeriod.from(period)));
  }

  @GetMapping("/consumed")
  public ApiEnvelope<ReportDtos.FoodListResponse> getConsumedFoods(
      @RequestHeader(value = "Authorization", required = false) String authorization,
      @RequestParam(value = "period", required = false, defaultValue = "WEEK") String period,
      @RequestParam(value = "query", required = false, defaultValue = "") String query) {
    return ApiEnvelope.success(
        reportService.getConsumedFoods(authorization, ReportDtos.ReportPeriod.from(period), query));
  }

  @GetMapping("/wasted")
  public ApiEnvelope<ReportDtos.FoodListResponse> getWastedFoods(
      @RequestHeader(value = "Authorization", required = false) String authorization,
      @RequestParam(value = "period", required = false, defaultValue = "WEEK") String period,
      @RequestParam(value = "query", required = false, defaultValue = "") String query) {
    return ApiEnvelope.success(
        reportService.getWastedFoods(authorization, ReportDtos.ReportPeriod.from(period), query));
  }

  @GetMapping("/cooking-history")
  public ApiEnvelope<ReportDtos.CookingHistoryResponse> getCookingHistory(
      @RequestHeader(value = "Authorization", required = false) String authorization,
      @RequestParam(value = "period", required = false, defaultValue = "WEEK") String period,
      @RequestParam(value = "limit", required = false, defaultValue = "50") int limit) {
    return ApiEnvelope.success(
        reportService.getCookingHistory(
            authorization, ReportDtos.ReportPeriod.from(period), limit));
  }

  @GetMapping("/insights")
  public ApiEnvelope<ReportDtos.ReportInsightsResponse> getInsights(
      @RequestHeader(value = "Authorization", required = false) String authorization,
      @RequestParam(value = "period", required = false, defaultValue = "WEEK") String period) {
    return ApiEnvelope.success(
        reportService.getInsights(authorization, ReportDtos.ReportPeriod.from(period)));
  }
}
