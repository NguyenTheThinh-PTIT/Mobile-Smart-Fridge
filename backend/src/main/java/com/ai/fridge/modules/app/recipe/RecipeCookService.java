package com.ai.fridge.modules.app.recipe;

import com.ai.fridge.common.exceptions.BaseException;
import com.ai.fridge.common.exceptions.ErrorCode;
import com.ai.fridge.modules.app.auth.AuthService;
import com.ai.fridge.modules.app.recipe.dto.RecipeCookDtos;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.sql.Date;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class RecipeCookService {

  private static final List<String> DECLINED_STATUSES =
      List.of("declined", "not_eating", "not-eating", "skip", "skipped", "rejected", "absent");

  private final JdbcTemplate jdbcTemplate;
  private final AuthService authService;

  public RecipeCookService(JdbcTemplate jdbcTemplate, AuthService authService) {
    this.jdbcTemplate = jdbcTemplate;
    this.authService = authService;
  }

  public RecipeCookDtos.RecipeCookGuideResponse getCookGuide(
      String authorizationHeader, Long recipeId, Long mealId) {
    Long userId = authService.requireUserIdFromAuthorizationHeader(authorizationHeader);
    Long householdId = resolveHouseholdId(userId);

    Long resolvedMealId = resolveMealId(householdId, recipeId, mealId);
    int actualDiners = resolveActualDiners(resolvedMealId);
    int normalizedDiners = Math.max(actualDiners, 1);

    String recipeName =
        jdbcTemplate
            .query(
                "SELECT name FROM recipe WHERE id = ?",
                (rs, rowNum) -> rs.getString("name"),
                recipeId)
            .stream()
            .findFirst()
            .orElseThrow(
                () -> new BaseException(ErrorCode.ERR_NOT_FOUND, "Recipe not found: " + recipeId));

    List<RecipeCookDtos.RecipeIngredientItem> ingredients =
        jdbcTemplate.query(
            """
            SELECT rf.food_id,
                   f.name AS food_name,
                   COALESCE(rf.require_quantity, 0) AS require_quantity,
                   COALESCE(rf.unit, 'unit') AS unit
            FROM recipe_food rf
            JOIN food f ON f.id = rf.food_id
            WHERE rf.recipe_id = ?
            ORDER BY f.name ASC
            """,
            (rs, rowNum) -> {
              double perPerson = rs.getDouble("require_quantity");
              double total = roundQuantity(perPerson * normalizedDiners);
              return new RecipeCookDtos.RecipeIngredientItem(
                  rs.getLong("food_id"),
                  rs.getString("food_name"),
                  perPerson,
                  rs.getString("unit"),
                  total);
            },
            recipeId);

    List<RecipeCookDtos.RecipeStepItem> steps =
        jdbcTemplate.query(
            """
            SELECT step_number, instruction, media_url
            FROM recipe_step
            WHERE recipe_id = ?
            ORDER BY step_number ASC
            """,
            (rs, rowNum) ->
                new RecipeCookDtos.RecipeStepItem(
                    rs.getInt("step_number"),
                    rs.getString("instruction"),
                    rs.getString("media_url")),
            recipeId);

    String note =
        "Số lượng nguyên liệu mặc định đang tính cho 1 người và đã nhân với số người thực tế ăn.";

    return new RecipeCookDtos.RecipeCookGuideResponse(
        recipeId, recipeName, resolvedMealId, normalizedDiners, ingredients, steps, note);
  }

  @Transactional
  public RecipeCookDtos.RecipeConsumeResponse consumeIngredients(
      String authorizationHeader, Long recipeId, RecipeCookDtos.RecipeConsumeRequest request) {
    Long userId = authService.requireUserIdFromAuthorizationHeader(authorizationHeader);
    Long householdId = resolveHouseholdId(userId);
    Long inventoryId = resolveInventoryId(householdId);

    Long resolvedMealId = resolveMealId(householdId, recipeId, request.mealId());
    int dinersFromAttendance = resolveActualDiners(resolvedMealId);
    int actualDiners =
        request.actualDiners() == null
            ? Math.max(dinersFromAttendance, 1)
            : Math.max(request.actualDiners(), 1);

    if (request.items() == null || request.items().isEmpty()) {
      throw new BaseException(
          ErrorCode.ERR_VALIDATION, "Danh sách thực phẩm tiêu thụ không được để trống");
    }

    List<RecipeCookDtos.RecipeIngredientItem> recipeIngredients =
        jdbcTemplate.query(
            """
            SELECT rf.food_id,
                   f.name AS food_name,
                   COALESCE(rf.require_quantity, 0) AS require_quantity,
                   COALESCE(rf.unit, 'unit') AS unit
            FROM recipe_food rf
            JOIN food f ON f.id = rf.food_id
            WHERE rf.recipe_id = ?
            """,
            (rs, rowNum) ->
                new RecipeCookDtos.RecipeIngredientItem(
                    rs.getLong("food_id"),
                    rs.getString("food_name"),
                    rs.getDouble("require_quantity"),
                    rs.getString("unit"),
                    roundQuantity(rs.getDouble("require_quantity") * actualDiners)),
            recipeId);

    Map<Long, RecipeCookDtos.RecipeIngredientItem> recipeIngredientMap =
        recipeIngredients.stream()
            .collect(Collectors.toMap(RecipeCookDtos.RecipeIngredientItem::foodId, item -> item));

    for (RecipeCookDtos.RecipeConsumptionItemRequest requestItem : request.items()) {
      if (requestItem.foodId() == null || requestItem.consumedQuantity() == null) {
        throw new BaseException(ErrorCode.ERR_VALIDATION, "Thiếu foodId hoặc consumedQuantity");
      }
      if (requestItem.consumedQuantity() <= 0) {
        throw new BaseException(ErrorCode.ERR_VALIDATION, "Số lượng tiêu thụ phải lớn hơn 0");
      }
      if (!recipeIngredientMap.containsKey(requestItem.foodId())) {
        throw new BaseException(
            ErrorCode.ERR_VALIDATION,
            "Thực phẩm không thuộc công thức: foodId=" + requestItem.foodId());
      }
    }

    List<String> insufficientMessages = new ArrayList<>();
    for (RecipeCookDtos.RecipeConsumptionItemRequest requestItem : request.items()) {
      RecipeCookDtos.RecipeIngredientItem ingredient =
          recipeIngredientMap.get(requestItem.foodId());
      String normalizedUnit = normalizeUnit(requestItem.unit(), ingredient.unit());

      Double availableQuantity =
          jdbcTemplate.queryForObject(
              """
              SELECT COALESCE(SUM(ib.quantity), 0)
              FROM inventory_batch ib
              WHERE ib.inventory_id = ?
                AND ib.food_id = ?
                AND ib.quantity > 0
                AND LOWER(COALESCE(ib.unit, ?)) = LOWER(?)
                AND (ib.expiration_date IS NULL OR ib.expiration_date >= CURRENT_DATE)
                AND LOWER(COALESCE(ib.status, 'available')) <> 'expired'
              """,
              Double.class,
              inventoryId,
              requestItem.foodId(),
              normalizedUnit,
              normalizedUnit);

      double available = availableQuantity == null ? 0.0 : availableQuantity;
      if (available + 1e-9 < requestItem.consumedQuantity()) {
        insufficientMessages.add(
            ingredient.foodName()
                + " chỉ còn "
                + formatQuantity(available)
                + " "
                + normalizedUnit
                + " bạn đang nhập "
                + formatQuantity(requestItem.consumedQuantity())
                + " "
                + normalizedUnit);
      }
    }

    if (!insufficientMessages.isEmpty()) {
      throw new BaseException(
          ErrorCode.ERR_INSUFFICIENT_INVENTORY,
          "Số lượng thực phẩm trong kho không đủ: " + String.join("; ", insufficientMessages));
    }

    for (RecipeCookDtos.RecipeConsumptionItemRequest requestItem : request.items()) {
      RecipeCookDtos.RecipeIngredientItem ingredient =
          recipeIngredientMap.get(requestItem.foodId());
      String normalizedUnit = normalizeUnit(requestItem.unit(), ingredient.unit());
      deductFoodFromInventory(
          inventoryId, requestItem.foodId(), normalizedUnit, requestItem.consumedQuantity());
    }

    String recipeName =
        jdbcTemplate
            .query(
                "SELECT name FROM recipe WHERE id = ?",
                (rs, rowNum) -> rs.getString("name"),
                recipeId)
            .stream()
            .findFirst()
            .orElse("Món ăn");

    List<RecipeCookDtos.RecipeIngredientItem> consumedItems =
        request.items().stream()
            .map(
                item -> {
                  RecipeCookDtos.RecipeIngredientItem base = recipeIngredientMap.get(item.foodId());
                  String unit = normalizeUnit(item.unit(), base.unit());
                  return new RecipeCookDtos.RecipeIngredientItem(
                      base.foodId(),
                      base.foodName(),
                      base.requiredPerPerson(),
                      unit,
                      roundQuantity(item.consumedQuantity()));
                })
            .toList();

    return new RecipeCookDtos.RecipeConsumeResponse(
        recipeId,
        resolvedMealId,
        actualDiners,
        consumedItems,
        "Đã trừ kho nguyên liệu cho công thức " + recipeName + " thành công");
  }

  private void deductFoodFromInventory(
      Long inventoryId, Long foodId, String unit, double consumeQuantity) {
    List<InventoryBatchRow> batches =
        jdbcTemplate.query(
            """
            SELECT id, quantity, expiration_date
            FROM inventory_batch
            WHERE inventory_id = ?
              AND food_id = ?
              AND quantity > 0
              AND LOWER(COALESCE(unit, ?)) = LOWER(?)
              AND (expiration_date IS NULL OR expiration_date >= CURRENT_DATE)
              AND LOWER(COALESCE(status, 'available')) <> 'expired'
            ORDER BY expiration_date ASC NULLS LAST, id ASC
            """,
            (rs, rowNum) ->
                new InventoryBatchRow(
                    rs.getLong("id"), rs.getDouble("quantity"), rs.getDate("expiration_date")),
            inventoryId,
            foodId,
            unit,
            unit);

    double remaining = consumeQuantity;
    for (InventoryBatchRow batch : batches) {
      if (remaining <= 0) {
        break;
      }

      double deduct = Math.min(batch.quantity(), remaining);
      double newQty = Math.max(0, roundQuantity(batch.quantity() - deduct));
      String newStatus = newQty <= 0 ? "Consumed" : "Available";

      jdbcTemplate.update(
          "UPDATE inventory_batch SET quantity = ?, status = ? WHERE id = ?",
          newQty,
          newStatus,
          batch.id());

      remaining = roundQuantity(remaining - deduct);
    }

    if (remaining > 1e-9) {
      throw new BaseException(
          ErrorCode.ERR_INSUFFICIENT_INVENTORY,
          "Không thể trừ kho đầy đủ do dữ liệu tồn kho thay đổi đồng thời. Vui lòng thử lại.");
    }
  }

  private Long resolveMealId(Long householdId, Long recipeId, Long requestedMealId) {
    if (requestedMealId != null) {
      List<Long> matched =
          jdbcTemplate.query(
              """
              SELECT m.id
              FROM meal m
              JOIN meal_dish md ON md.meal_id = m.id
              JOIN dish d ON d.id = md.dish_id
              WHERE m.id = ?
                AND m.household_id = ?
                AND d.recipe_id = ?
              LIMIT 1
              """,
              (rs, rowNum) -> rs.getLong("id"),
              requestedMealId,
              householdId,
              recipeId);

      if (!matched.isEmpty()) {
        return matched.get(0);
      }
    }

    return jdbcTemplate
        .query(
            """
            SELECT m.id
            FROM meal m
            JOIN meal_dish md ON md.meal_id = m.id
            JOIN dish d ON d.id = md.dish_id
            WHERE m.household_id = ?
              AND d.recipe_id = ?
            ORDER BY ABS(EXTRACT(EPOCH FROM (m.schedule_time - NOW()))) ASC, m.id DESC
            LIMIT 1
            """,
            (rs, rowNum) -> rs.getLong("id"),
            householdId,
            recipeId)
        .stream()
        .findFirst()
        .orElseGet(
            () ->
                jdbcTemplate
                    .query(
                        """
              SELECT id
              FROM meal
              WHERE household_id = ?
              ORDER BY ABS(EXTRACT(EPOCH FROM (schedule_time - NOW()))) ASC, id DESC
              LIMIT 1
              """,
                        (rs, rowNum) -> rs.getLong("id"),
                        householdId)
                    .stream()
                    .findFirst()
                    .orElseThrow(
                        () ->
                            new BaseException(
                                ErrorCode.ERR_NOT_FOUND,
                                "Không tìm thấy bữa ăn phù hợp để tính số người thực tế ăn")));
  }

  private int resolveActualDiners(Long mealId) {
    Integer count =
        jdbcTemplate.queryForObject(
            """
            SELECT COUNT(*)
            FROM meal_attendance
            WHERE meal_id = ?
              AND LOWER(COALESCE(status, 'confirmed')) NOT IN ('declined', 'not_eating', 'not-eating', 'skip', 'skipped', 'rejected', 'absent')
            """,
            Integer.class,
            mealId);

    return count == null ? 0 : count;
  }

  private Long resolveHouseholdId(Long userId) {
    return jdbcTemplate
        .query(
            "SELECT household_id FROM household_member WHERE user_id = ? ORDER BY id ASC LIMIT 1",
            (rs, rowNum) -> rs.getLong("household_id"),
            userId)
        .stream()
        .findFirst()
        .orElseThrow(
            () -> new BaseException(ErrorCode.ERR_NOT_FOUND, "Không tìm thấy household của user"));
  }

  private Long resolveInventoryId(Long householdId) {
    Optional<Long> existingInventoryId =
        jdbcTemplate
            .query(
                "SELECT id FROM inventory WHERE household_id = ? ORDER BY id ASC LIMIT 1",
                (rs, rowNum) -> rs.getLong("id"),
                householdId)
            .stream()
            .findFirst();

    if (existingInventoryId.isPresent()) {
      return existingInventoryId.get();
    }

    return jdbcTemplate.queryForObject(
        "INSERT INTO inventory (household_id) VALUES (?) RETURNING id", Long.class, householdId);
  }

  private String normalizeUnit(String requestUnit, String fallbackUnit) {
    String candidate =
        requestUnit != null && !requestUnit.isBlank()
            ? requestUnit.trim()
            : (fallbackUnit != null && !fallbackUnit.isBlank() ? fallbackUnit.trim() : "unit");
    return candidate.toLowerCase(Locale.ROOT);
  }

  private String formatQuantity(double value) {
    if (Math.abs(value - Math.rint(value)) < 1e-9) {
      return String.valueOf((long) Math.rint(value));
    }
    return new BigDecimal(value)
        .setScale(2, RoundingMode.HALF_UP)
        .stripTrailingZeros()
        .toPlainString();
  }

  private double roundQuantity(double value) {
    return new BigDecimal(value).setScale(3, RoundingMode.HALF_UP).doubleValue();
  }

  private record InventoryBatchRow(Long id, Double quantity, Date expirationDate) {}
}
