package com.ai.fridge.modules.app.report;

import com.ai.fridge.modules.app.auth.AuthService;
import com.ai.fridge.modules.app.report.dto.ReportDtos;
import java.sql.Date;
import java.sql.Timestamp;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

@Service
public class ReportService {

  private final JdbcTemplate jdbcTemplate;
  private final AuthService authService;

  public ReportService(JdbcTemplate jdbcTemplate, AuthService authService) {
    this.jdbcTemplate = jdbcTemplate;
    this.authService = authService;
  }

  public ReportDtos.ReportSummaryResponse getSummary(
      String authorizationHeader, ReportDtos.ReportPeriod period) {
    Long userId = authService.requireUserIdFromAuthorizationHeader(authorizationHeader);
    DateRange dateRange = resolveDateRange(period);
    Long householdId = resolveReportHouseholdId(userId, dateRange);

    int consumedCount = getConsumedCount(householdId, dateRange);
    int wasteCount = getWasteCount(householdId, dateRange);
    double wasteRatePercent = calculateWasteRatePercent(consumedCount, wasteCount);

    return new ReportDtos.ReportSummaryResponse(
        period,
        consumedCount,
        wasteCount,
        wasteRatePercent,
        getCookingTrendByDay(householdId, dateRange),
        getCookingHistoryItems(householdId, dateRange, 2));
  }

  public ReportDtos.FoodListResponse getConsumedFoods(
      String authorizationHeader, ReportDtos.ReportPeriod period, String query) {
    Long userId = authService.requireUserIdFromAuthorizationHeader(authorizationHeader);
    DateRange dateRange = resolveDateRange(period);
    Long householdId = resolveReportHouseholdId(userId, dateRange);

    String search = normalizeSearch(query);

    List<RawFoodStat> items =
        jdbcTemplate.query(
            """
            SELECT f.name AS food_name,
                   COALESCE(SUM(rf.require_quantity), 0) AS total_quantity,
                   COALESCE(MIN(rf.unit), 'đơn vị') AS unit,
                 COALESCE(COUNT(DISTINCT m.id), 0) AS occurrence_count
            FROM meal m
            JOIN meal_dish md ON md.meal_id = m.id
            JOIN dish d ON d.id = md.dish_id
            JOIN recipe_food rf ON rf.recipe_id = d.recipe_id
            JOIN food f ON f.id = rf.food_id
            WHERE m.household_id = ?
              AND m.schedule_date BETWEEN ? AND ?
              AND (? = '' OR lower(f.name) LIKE lower(?))
            GROUP BY f.name
            ORDER BY total_quantity DESC, food_name ASC
            """,
            (rs, rowNum) ->
                new RawFoodStat(
                    rs.getString("food_name"),
                    rs.getDouble("total_quantity"),
                    rs.getString("unit"),
                    rs.getInt("occurrence_count")),
            householdId,
            Date.valueOf(dateRange.startDate()),
            Date.valueOf(dateRange.endDate()),
            search,
            "%" + search + "%");

    return new ReportDtos.FoodListResponse(period, finalizeFoodStats(items));
  }

  public ReportDtos.FoodListResponse getWastedFoods(
      String authorizationHeader, ReportDtos.ReportPeriod period, String query) {
    Long userId = authService.requireUserIdFromAuthorizationHeader(authorizationHeader);
    DateRange dateRange = resolveDateRange(period);
    Long householdId = resolveReportHouseholdId(userId, dateRange);

    String search = normalizeSearch(query);

    List<RawFoodStat> items =
        jdbcTemplate.query(
            """
            SELECT f.name AS food_name,
                   COALESCE(SUM(ib.quantity), 0) AS total_quantity,
                   COALESCE(MIN(ib.unit), 'đơn vị') AS unit,
                 COALESCE(COUNT(ib.id), 0) AS occurrence_count
            FROM inventory i
            JOIN inventory_batch ib ON ib.inventory_id = i.id
            JOIN food f ON f.id = ib.food_id
            WHERE i.household_id = ?
              AND lower(COALESCE(ib.status, '')) IN ('expired', 'wasted', 'discarded')
              AND ib.entry_date BETWEEN ? AND ?
              AND (? = '' OR lower(f.name) LIKE lower(?))
            GROUP BY f.name
            ORDER BY total_quantity DESC, food_name ASC
            """,
            (rs, rowNum) ->
                new RawFoodStat(
                    rs.getString("food_name"),
                    rs.getDouble("total_quantity"),
                    rs.getString("unit"),
                    rs.getInt("occurrence_count")),
            householdId,
            Date.valueOf(dateRange.startDate()),
            Date.valueOf(dateRange.endDate()),
            search,
            "%" + search + "%");

    return new ReportDtos.FoodListResponse(period, finalizeFoodStats(items));
  }

  public ReportDtos.CookingHistoryResponse getCookingHistory(
      String authorizationHeader, ReportDtos.ReportPeriod period, int limit) {
    Long userId = authService.requireUserIdFromAuthorizationHeader(authorizationHeader);
    DateRange dateRange = resolveDateRange(period);
    Long householdId = resolveReportHouseholdId(userId, dateRange);

    int safeLimit = Math.max(1, Math.min(limit, 100));
    return new ReportDtos.CookingHistoryResponse(
        period, getCookingHistoryItems(householdId, dateRange, safeLimit));
  }

  public ReportDtos.ReportInsightsResponse getInsights(
      String authorizationHeader, ReportDtos.ReportPeriod period) {
    Long userId = authService.requireUserIdFromAuthorizationHeader(authorizationHeader);
    DateRange dateRange = resolveDateRange(period);
    Long householdId = resolveReportHouseholdId(userId, dateRange);

    return new ReportDtos.ReportInsightsResponse(
        period,
        getExpiryRiskItems(householdId),
        getMealTypeDistribution(householdId, dateRange),
        getWasteByCategory(householdId, dateRange),
        getTopConsumedFoods(householdId, dateRange, 5));
  }

  private List<ReportDtos.CookingHistoryItem> getCookingHistoryItems(
      Long householdId, DateRange dateRange, int limit) {
    return jdbcTemplate.query(
        """
            SELECT d.id AS dish_id,
                   d.name AS dish_name,
                   COALESCE(STRING_AGG(DISTINCT f.name, ' - '), '') AS ingredients,
                   ROUND((4.0 + ((d.id % 10)::numeric / 10.0))::numeric, 1) AS rating,
                   COALESCE(r.cook_time_minutes, 30) AS cook_minutes,
                   COALESCE(m.schedule_time, m.schedule_date::timestamp) AS scheduled_at,
                   COALESCE(d.image_url, '') AS image_url
            FROM meal m
            JOIN meal_dish md ON md.meal_id = m.id
            JOIN dish d ON d.id = md.dish_id
            LEFT JOIN recipe r ON r.id = d.recipe_id
            LEFT JOIN recipe_food rf ON rf.recipe_id = d.recipe_id
            LEFT JOIN food f ON f.id = rf.food_id
            WHERE m.household_id = ?
              AND m.schedule_date BETWEEN ? AND ?
            GROUP BY d.id, d.name, r.cook_time_minutes, m.schedule_time, m.schedule_date, d.image_url
            ORDER BY scheduled_at DESC
            LIMIT ?
            """,
        (rs, rowNum) ->
            new ReportDtos.CookingHistoryItem(
                rs.getLong("dish_id"),
                rs.getString("dish_name"),
                rs.getString("ingredients"),
                rs.getBigDecimal("rating").doubleValue(),
                rs.getInt("cook_minutes"),
                toLocalDateTime(rs.getTimestamp("scheduled_at")),
                rs.getString("image_url")),
        householdId,
        Date.valueOf(dateRange.startDate()),
        Date.valueOf(dateRange.endDate()),
        limit);
  }

  private List<ReportDtos.ExpiryRiskItem> getExpiryRiskItems(Long householdId) {
    return jdbcTemplate.query(
        """
            SELECT f.name AS food_name,
                 COALESCE(ib.quantity, 0) AS quantity,
                 COALESCE(ib.unit, 'đơn vị') AS unit,
                 ib.expiration_date AS expiration_date,
                 CASE
                   WHEN ib.expiration_date < CURRENT_DATE THEN 'EXPIRED'
                   WHEN ib.expiration_date <= CURRENT_DATE + INTERVAL '3 days' THEN 'EXPIRING_SOON'
                   ELSE 'UPCOMING'
                 END AS risk_level
            FROM inventory i
            JOIN inventory_batch ib ON ib.inventory_id = i.id
            JOIN food f ON f.id = ib.food_id
            WHERE i.household_id = ?
              AND lower(COALESCE(ib.status, 'active')) = 'active'
              AND COALESCE(ib.quantity, 0) > 0
              AND ib.expiration_date IS NOT NULL
              AND ib.expiration_date <= CURRENT_DATE + INTERVAL '14 days'
            ORDER BY ib.expiration_date ASC, ib.quantity DESC
            LIMIT 20
                      """,
        (rs, rowNum) ->
            new ReportDtos.ExpiryRiskItem(
                rs.getString("food_name"),
                rs.getDouble("quantity"),
                rs.getString("unit"),
                rs.getDate("expiration_date").toLocalDate(),
                (int)
                    ChronoUnit.DAYS.between(
                        LocalDate.now(), rs.getDate("expiration_date").toLocalDate()),
                rs.getString("risk_level")),
        householdId);
  }

  private List<ReportDtos.CookingTrendPoint> getCookingTrendByDay(
      Long householdId, DateRange dateRange) {
    List<ReportDtos.CookingTrendPoint> raw =
        jdbcTemplate.query(
            """
            WITH daily_count AS (
              SELECT EXTRACT(ISODOW FROM m.schedule_date)::int AS dow,
                   COUNT(md.id) AS total_count
                          FROM meal m
                          JOIN meal_dish md ON md.meal_id = m.id
                          WHERE m.household_id = ?
                            AND m.schedule_date BETWEEN ? AND ?
              GROUP BY EXTRACT(ISODOW FROM m.schedule_date)::int
                      )
            SELECT dow, total_count
            FROM daily_count
            ORDER BY dow ASC
                      """,
            (rs, rowNum) ->
                new ReportDtos.CookingTrendPoint(
                    toDayLabel(rs.getInt("dow")), rs.getInt("total_count")),
            householdId,
            Date.valueOf(dateRange.startDate()),
            Date.valueOf(dateRange.endDate()));

    Map<String, Integer> byLabel = new HashMap<>();
    for (ReportDtos.CookingTrendPoint point : raw) {
      byLabel.put(point.label(), point.count());
    }

    List<ReportDtos.CookingTrendPoint> completed = new ArrayList<>();
    for (int day = 1; day <= 7; day++) {
      String label = toDayLabel(day);
      completed.add(new ReportDtos.CookingTrendPoint(label, byLabel.getOrDefault(label, 0)));
    }
    return completed;
  }

  private int getConsumedCount(Long householdId, DateRange dateRange) {
    Integer count =
        jdbcTemplate.queryForObject(
            """
            SELECT COALESCE(COUNT(*), 0)
            FROM meal m
            JOIN meal_dish md ON md.meal_id = m.id
            WHERE m.household_id = ?
              AND m.schedule_date BETWEEN ? AND ?
            """,
            Integer.class,
            householdId,
            Date.valueOf(dateRange.startDate()),
            Date.valueOf(dateRange.endDate()));

    return count == null ? 0 : count;
  }

  private int getWasteCount(Long householdId, DateRange dateRange) {
    Integer count =
        jdbcTemplate.queryForObject(
            """
            SELECT COALESCE(COUNT(*), 0)
            FROM inventory i
            JOIN inventory_batch ib ON ib.inventory_id = i.id
            WHERE i.household_id = ?
              AND lower(COALESCE(ib.status, '')) IN ('expired', 'wasted', 'discarded')
              AND ib.entry_date BETWEEN ? AND ?
            """,
            Integer.class,
            householdId,
            Date.valueOf(dateRange.startDate()),
            Date.valueOf(dateRange.endDate()));

    return count == null ? 0 : count;
  }

  private double calculateWasteRatePercent(int consumedCount, int wasteCount) {
    int total = consumedCount + wasteCount;
    if (total <= 0) {
      return 0.0;
    }
    return ((double) wasteCount / (double) total) * 100.0;
  }

  private Long resolveReportHouseholdId(Long userId, DateRange dateRange) {
    Long userHouseholdId =
        jdbcTemplate.query(
            "SELECT household_id FROM household_member WHERE user_id = ? ORDER BY id ASC LIMIT 1",
            rs -> rs.next() ? rs.getLong("household_id") : null,
            userId);

    if (userHouseholdId != null) {
      return userHouseholdId;
    }

    throw new IllegalStateException("Cannot resolve household for report data");
  }

  private List<ReportDtos.MealTypePoint> getMealTypeDistribution(
      Long householdId, DateRange dateRange) {
    List<MealTypeRaw> rows =
        jdbcTemplate.query(
            """
            SELECT COALESCE(m.meal_type, 'OTHER') AS meal_type,
                   COUNT(*) AS total_count
            FROM meal m
            WHERE m.household_id = ?
              AND m.schedule_date BETWEEN ? AND ?
            GROUP BY COALESCE(m.meal_type, 'OTHER')
            ORDER BY total_count DESC
            """,
            (rs, rowNum) -> new MealTypeRaw(rs.getString("meal_type"), rs.getInt("total_count")),
            householdId,
            Date.valueOf(dateRange.startDate()),
            Date.valueOf(dateRange.endDate()));

    int total = rows.stream().mapToInt(MealTypeRaw::count).sum();
    List<ReportDtos.MealTypePoint> points = new ArrayList<>();
    for (MealTypeRaw row : rows) {
      double ratio = total <= 0 ? 0.0 : (row.count() * 100.0 / total);
      points.add(new ReportDtos.MealTypePoint(row.mealType(), row.count(), ratio));
    }
    return points;
  }

  private List<ReportDtos.CategoryWastePoint> getWasteByCategory(
      Long householdId, DateRange dateRange) {
    List<CategoryWasteRaw> rows =
        jdbcTemplate.query(
            """
            SELECT COALESCE(c.name, 'Khác') AS category_name,
                   COALESCE(SUM(ib.quantity), 0) AS total_quantity,
                   COALESCE(MIN(ib.unit), 'đơn vị') AS unit
            FROM inventory i
            JOIN inventory_batch ib ON ib.inventory_id = i.id
            JOIN food f ON f.id = ib.food_id
            LEFT JOIN category c ON c.id = f.category_id
            WHERE i.household_id = ?
              AND lower(COALESCE(ib.status, '')) IN ('expired', 'wasted', 'discarded')
              AND ib.entry_date BETWEEN ? AND ?
            GROUP BY COALESCE(c.name, 'Khác')
            ORDER BY total_quantity DESC
            """,
            (rs, rowNum) ->
                new CategoryWasteRaw(
                    rs.getString("category_name"),
                    rs.getDouble("total_quantity"),
                    rs.getString("unit")),
            householdId,
            Date.valueOf(dateRange.startDate()),
            Date.valueOf(dateRange.endDate()));

    double totalQuantity = rows.stream().mapToDouble(CategoryWasteRaw::quantity).sum();
    List<ReportDtos.CategoryWastePoint> points = new ArrayList<>();
    for (CategoryWasteRaw row : rows) {
      double ratio = totalQuantity <= 0 ? 0.0 : (row.quantity() * 100.0 / totalQuantity);
      points.add(
          new ReportDtos.CategoryWastePoint(row.categoryName(), row.quantity(), row.unit(), ratio));
    }
    return points;
  }

  private List<ReportDtos.FoodStatItem> getTopConsumedFoods(
      Long householdId, DateRange dateRange, int limit) {
    List<RawFoodStat> rows =
        jdbcTemplate.query(
            """
            SELECT f.name AS food_name,
                   COALESCE(SUM(rf.require_quantity), 0) AS total_quantity,
                   COALESCE(MIN(rf.unit), 'đơn vị') AS unit,
                   COALESCE(COUNT(DISTINCT m.id), 0) AS occurrence_count
            FROM meal m
            JOIN meal_dish md ON md.meal_id = m.id
            JOIN dish d ON d.id = md.dish_id
            JOIN recipe_food rf ON rf.recipe_id = d.recipe_id
            JOIN food f ON f.id = rf.food_id
            WHERE m.household_id = ?
              AND m.schedule_date BETWEEN ? AND ?
            GROUP BY f.name
            ORDER BY total_quantity DESC, food_name ASC
            LIMIT ?
            """,
            (rs, rowNum) ->
                new RawFoodStat(
                    rs.getString("food_name"),
                    rs.getDouble("total_quantity"),
                    rs.getString("unit"),
                    rs.getInt("occurrence_count")),
            householdId,
            Date.valueOf(dateRange.startDate()),
            Date.valueOf(dateRange.endDate()),
            limit);

    return finalizeFoodStats(rows);
  }

  private List<ReportDtos.FoodStatItem> finalizeFoodStats(List<RawFoodStat> rawItems) {
    double totalQuantity = rawItems.stream().mapToDouble(RawFoodStat::quantity).sum();
    List<ReportDtos.FoodStatItem> items = new ArrayList<>();

    for (RawFoodStat raw : rawItems) {
      double ratio = totalQuantity <= 0 ? 0.0 : (raw.quantity() * 100.0 / totalQuantity);
      items.add(
          new ReportDtos.FoodStatItem(
              raw.name(), raw.quantity(), raw.unit(), raw.occurrenceCount(), ratio));
    }

    items.sort(Comparator.comparingDouble(ReportDtos.FoodStatItem::quantity).reversed());
    return items;
  }

  private boolean hasReportData(Long householdId, DateRange dateRange) {
    Integer mealCount =
        jdbcTemplate.queryForObject(
            """
            SELECT COUNT(*)
            FROM meal m
            WHERE m.household_id = ?
              AND m.schedule_date BETWEEN ? AND ?
            """,
            Integer.class,
            householdId,
            Date.valueOf(dateRange.startDate()),
            Date.valueOf(dateRange.endDate()));

    Integer wasteCount =
        jdbcTemplate.queryForObject(
            """
            SELECT COUNT(*)
            FROM inventory i
            JOIN inventory_batch ib ON ib.inventory_id = i.id
            WHERE i.household_id = ?
              AND lower(COALESCE(ib.status, '')) IN ('expired', 'wasted', 'discarded')
              AND ib.entry_date BETWEEN ? AND ?
            """,
            Integer.class,
            householdId,
            Date.valueOf(dateRange.startDate()),
            Date.valueOf(dateRange.endDate()));

    return (mealCount != null && mealCount > 0) || (wasteCount != null && wasteCount > 0);
  }

  private DateRange resolveDateRange(ReportDtos.ReportPeriod period) {
    LocalDate today = LocalDate.now();

    return switch (period) {
      case YEAR -> new DateRange(today.minusDays(364), today);
      case MONTH -> new DateRange(today.minusDays(29), today);
      case WEEK -> new DateRange(today.minusDays(6), today);
    };
  }

  private String normalizeSearch(String query) {
    if (query == null || query.isBlank()) {
      return "";
    }
    return query.trim();
  }

  private LocalDateTime toLocalDateTime(Timestamp timestamp) {
    if (timestamp == null) {
      return null;
    }
    return timestamp.toLocalDateTime();
  }

  private String toDayLabel(int isoDay) {
    DayOfWeek day = DayOfWeek.of(Math.max(1, Math.min(isoDay, 7)));
    return switch (day) {
      case MONDAY -> "T2";
      case TUESDAY -> "T3";
      case WEDNESDAY -> "T4";
      case THURSDAY -> "T5";
      case FRIDAY -> "T6";
      case SATURDAY -> "T7";
      case SUNDAY -> "CN";
    };
  }

  private record RawFoodStat(String name, double quantity, String unit, int occurrenceCount) {}

  private record MealTypeRaw(String mealType, int count) {}

  private record CategoryWasteRaw(String categoryName, double quantity, String unit) {}

  private record DateRange(LocalDate startDate, LocalDate endDate) {}
}
