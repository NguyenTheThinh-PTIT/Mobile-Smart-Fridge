package com.ai.fridge.modules.app.inventory;

import com.ai.fridge.modules.app.auth.AuthService;
import com.ai.fridge.modules.app.inventory.dto.InventoryDtos;
import java.sql.Date;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.time.temporal.ChronoUnit;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.stream.Collectors;
import lombok.extern.slf4j.Slf4j;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Slf4j
public class InventoryService {

  private static final DateTimeFormatter MOBILE_DATE_FORMAT =
      DateTimeFormatter.ofPattern("dd/MM/yyyy");
  private static final long EXPIRING_SOON_DAYS = 3;

  private final JdbcTemplate jdbcTemplate;
  private final AuthService authService;

  public InventoryService(JdbcTemplate jdbcTemplate, AuthService authService) {
    this.jdbcTemplate = jdbcTemplate;
    this.authService = authService;
  }

  public JdbcTemplate getJdbcTemplate() {
    return jdbcTemplate;
  }

  public List<InventoryDtos.InventoryItemDto> getItems(String authorizationHeader) {
    Long userId = authService.requireUserIdFromAuthorizationHeader(authorizationHeader);
    return getItemsByUserId(userId);
  }

  public List<InventoryDtos.InventoryItemDto> getItemsByUserId(Long userId) {
    Long inventoryId = findPreferredInventoryIdByUserId(userId);
    if (inventoryId == null) {
      inventoryId = resolveInventoryId(userId);
    }
    return getItemsByInventoryId(inventoryId);
  }

  public List<InventoryDtos.InventoryItemDto> getItemsByMemberId(Long memberId) {
    Long inventoryId = findPreferredInventoryIdByMemberId(memberId);
    if (inventoryId == null) {
      return List.of();
    }
    return getItemsByInventoryId(inventoryId);
  }

  public String summarizeInventoryByUserId(Long userId) {
    List<InventoryDtos.InventoryItemDto> items = getItemsByUserId(userId);
    log.info(
        "[InventoryService] summarizeInventoryByUserId userId={} itemCount={}",
        userId,
        items.size());
    return buildInventorySummary(items);
  }

  public String summarizeInventoryByMemberId(Long memberId) {
    List<InventoryDtos.InventoryItemDto> items = getItemsByMemberId(memberId);
    return buildInventorySummary(items);
  }

  private String buildInventorySummary(List<InventoryDtos.InventoryItemDto> items) {
    if (items.isEmpty()) {
      return "Tủ lạnh hiện chưa có thực phẩm nào.";
    }

    LocalDate today = LocalDate.now();
    long expiredCount = items.stream().filter(item -> isExpired(item, today)).count();
    long expiringSoonCount = items.stream().filter(item -> isExpiringSoon(item, today)).count();
    int uniqueFoods =
        new LinkedHashSet<>(
                items.stream()
                    .map(InventoryDtos.InventoryItemDto::name)
                    .collect(Collectors.toList()))
            .size();

    return items.stream()
        .map(
            item ->
                String.format(
                    Locale.ROOT,
                    "- %s: %s %s | hạn dùng: %s%s | nhóm: %s",
                    item.name(),
                    formatQuantity(item.quantity()),
                    item.unit(),
                    item.expiryDate() == null || item.expiryDate().isBlank()
                        ? "chưa cập nhật"
                        : item.expiryDate(),
                    buildExpiryStatus(item, today),
                    item.category()))
        .collect(
            Collectors.joining(
                "\n",
                String.format(
                    Locale.ROOT,
                    "Tóm tắt tồn kho:\n- Tổng lô sản phẩm: %d\n- Sản phẩm khác nhau: %d\n- Lô đã hết hạn: %d\n- Lô sắp hết hạn (<= %d ngày): %d\n\nDanh sách chi tiết (ưu tiên hạn gần):\n",
                    items.size(),
                    uniqueFoods,
                    expiredCount,
                    EXPIRING_SOON_DAYS,
                    expiringSoonCount),
                ""));
  }

  private List<InventoryDtos.InventoryItemDto> getItemsByInventoryId(Long inventoryId) {

    return jdbcTemplate.query(
        """
            SELECT ib.id,
                   f.name,
                   COALESCE(c.name, 'Khác') AS category,
                   ib.quantity,
                   ib.unit,
                   ib.expiration_date
            FROM inventory_batch ib
            JOIN food f ON f.id = ib.food_id
            LEFT JOIN category c ON c.id = f.category_id
            WHERE ib.inventory_id = ?
              AND ib.quantity > 0
            ORDER BY ib.expiration_date ASC NULLS LAST, ib.id DESC
            """,
        (rs, rowNum) ->
            new InventoryDtos.InventoryItemDto(
                String.valueOf(rs.getLong("id")),
                rs.getString("name"),
                rs.getDouble("quantity"),
                rs.getString("unit"),
                formatDate(rs.getDate("expiration_date")),
                rs.getString("category")),
        inventoryId);
  }

  public String summarizeInventory(String authorizationHeader) {
    Long userId = authService.requireUserIdFromAuthorizationHeader(authorizationHeader);
    return summarizeInventoryByUserId(userId);
  }

  @Transactional
  public InventoryDtos.InventoryItemDto createItem(
      String authorizationHeader, InventoryDtos.InventoryItemRequest request) {
    Long userId = authService.requireUserIdFromAuthorizationHeader(authorizationHeader);
    requireNotGuest(userId);
    Long inventoryId = resolveInventoryId(userId);

    Long categoryId = ensureCategoryId(normalizeCategory(request.category()));
    Long foodId = ensureFoodId(normalizeName(request.name()), categoryId);

    LocalDate expirationDate = parseDate(request.expiryDate());
    Long batchId =
        jdbcTemplate.queryForObject(
            """
            INSERT INTO inventory_batch (inventory_id, food_id, quantity, unit, entry_date, expiration_date, status, storage_section, is_bought)
            VALUES (?, ?, ?, ?, CURRENT_DATE, ?, 'active', NULL, true)
            RETURNING id
            """,
            Long.class,
            inventoryId,
            foodId,
            request.quantity(),
            normalizeUnit(request.unit()),
            expirationDate == null ? null : Date.valueOf(expirationDate));

    return new InventoryDtos.InventoryItemDto(
        String.valueOf(batchId),
        normalizeName(request.name()),
        request.quantity(),
        normalizeUnit(request.unit()),
        request.expiryDate(),
        normalizeCategory(request.category()));
  }

  @Transactional
  public InventoryDtos.InventoryItemDto updateItem(
      String authorizationHeader,
      Long inventoryBatchId,
      InventoryDtos.InventoryItemRequest request) {
    Long userId = authService.requireUserIdFromAuthorizationHeader(authorizationHeader);
    requireNotGuest(userId);
    Long inventoryId = resolveInventoryId(userId);

    Long categoryId = ensureCategoryId(normalizeCategory(request.category()));
    Long foodId = ensureFoodId(normalizeName(request.name()), categoryId);
    LocalDate expirationDate = parseDate(request.expiryDate());

    jdbcTemplate.update(
        """
            UPDATE inventory_batch
            SET food_id = ?, quantity = ?, unit = ?, expiration_date = ?
            WHERE id = ? AND inventory_id = ?
            """,
        foodId,
        request.quantity(),
        normalizeUnit(request.unit()),
        expirationDate == null ? null : Date.valueOf(expirationDate),
        inventoryBatchId,
        inventoryId);

    return new InventoryDtos.InventoryItemDto(
        String.valueOf(inventoryBatchId),
        normalizeName(request.name()),
        request.quantity(),
        normalizeUnit(request.unit()),
        request.expiryDate(),
        normalizeCategory(request.category()));
  }

  @Transactional
  public void deleteItem(String authorizationHeader, Long inventoryBatchId) {
    Long userId = authService.requireUserIdFromAuthorizationHeader(authorizationHeader);
    requireNotGuest(userId);
    Long inventoryId = resolveInventoryId(userId);

    jdbcTemplate.update(
        "DELETE FROM inventory_batch WHERE id = ? AND inventory_id = ?",
        inventoryBatchId,
        inventoryId);
  }

  public Long getOrCreateInventoryIdForUser(Long userId) {
    return resolveInventoryId(userId);
  }

  private Long resolveInventoryId(Long userId) {
    Long preferredInventoryId = findPreferredInventoryIdByUserId(userId);
    if (preferredInventoryId != null) {
      return preferredInventoryId;
    }

    List<Long> householdIds =
        jdbcTemplate.query(
            "SELECT household_id FROM household_member WHERE user_id = ? ORDER BY id ASC LIMIT 1",
            (rs, rowNum) -> rs.getLong("household_id"),
            userId);

    if (householdIds.isEmpty()) {
      throw new IllegalStateException("No household found for current user");
    }

    return jdbcTemplate.queryForObject(
        "INSERT INTO inventory (household_id) VALUES (?) RETURNING id",
        Long.class,
        householdIds.get(0));
  }

  private Long findPreferredInventoryIdByUserId(Long userId) {
    List<Long> inventoryIds =
        jdbcTemplate.query(
            """
            SELECT i.id
            FROM household_member hm
            JOIN inventory i ON i.household_id = hm.household_id
            LEFT JOIN inventory_batch ib ON ib.inventory_id = i.id AND ib.quantity > 0
            WHERE hm.user_id = ?
            GROUP BY i.id
            ORDER BY COUNT(ib.id) DESC, i.id ASC
            LIMIT 1
            """,
            (rs, rowNum) -> rs.getLong("id"),
            userId);

    if (inventoryIds.isEmpty()) {
      return null;
    }
    return inventoryIds.get(0);
  }

  private Long findPreferredInventoryIdByMemberId(Long memberId) {
    List<Long> inventoryIds =
        jdbcTemplate.query(
            """
            SELECT i.id
            FROM household_member hm
            JOIN inventory i ON i.household_id = hm.household_id
            LEFT JOIN inventory_batch ib ON ib.inventory_id = i.id AND ib.quantity > 0
            WHERE hm.id = ?
            GROUP BY i.id
            ORDER BY COUNT(ib.id) DESC, i.id ASC
            LIMIT 1
            """,
            (rs, rowNum) -> rs.getLong("id"),
            memberId);

    if (!inventoryIds.isEmpty()) {
      return inventoryIds.get(0);
    }
    return null;
  }

  private Long ensureCategoryId(String categoryName) {
    List<Long> ids =
        jdbcTemplate.query(
            "SELECT id FROM category WHERE lower(name) = lower(?) LIMIT 1",
            (rs, rowNum) -> rs.getLong("id"),
            categoryName);

    if (!ids.isEmpty()) {
      return ids.get(0);
    }

    return jdbcTemplate.queryForObject(
        "INSERT INTO category (name) VALUES (?) RETURNING id", Long.class, categoryName);
  }

  private Long ensureFoodId(String foodName, Long categoryId) {
    List<Long> ids =
        jdbcTemplate.query(
            "SELECT id FROM food WHERE lower(name) = lower(?) AND category_id = ? LIMIT 1",
            (rs, rowNum) -> rs.getLong("id"),
            foodName,
            categoryId);

    if (!ids.isEmpty()) {
      return ids.get(0);
    }

    return jdbcTemplate.queryForObject(
        "INSERT INTO food (name, default_shelf_life_day, category_id) VALUES (?, NULL, ?) RETURNING id",
        Long.class,
        foodName,
        categoryId);
  }

  private String normalizeName(String name) {
    if (name == null || name.isBlank()) {
      return "Thực phẩm mới";
    }
    return name.trim();
  }

  private String normalizeCategory(String category) {
    if (category == null || category.isBlank()) {
      return "Khác";
    }
    return category.trim();
  }

  private String normalizeUnit(String unit) {
    if (unit == null || unit.isBlank()) {
      return "kg";
    }
    return unit.trim();
  }

  private LocalDate parseDate(String date) {
    if (date == null || date.isBlank()) {
      return null;
    }

    try {
      return LocalDate.parse(date, MOBILE_DATE_FORMAT);
    } catch (DateTimeParseException ignored) {
    }

    try {
      return LocalDate.parse(date);
    } catch (DateTimeParseException ignored) {
      return null;
    }
  }

  private String formatDate(Date date) {
    if (date == null) {
      return "";
    }
    return date.toLocalDate().format(MOBILE_DATE_FORMAT);
  }

  private String formatQuantity(double quantity) {
    if (quantity == Math.rint(quantity)) {
      return String.valueOf((long) quantity);
    }
    return String.format(Locale.ROOT, "%.2f", quantity);
  }

  private boolean isExpired(InventoryDtos.InventoryItemDto item, LocalDate today) {
    LocalDate expiry = parseMobileDate(item.expiryDate());
    return expiry != null && expiry.isBefore(today);
  }

  private boolean isExpiringSoon(InventoryDtos.InventoryItemDto item, LocalDate today) {
    LocalDate expiry = parseMobileDate(item.expiryDate());
    if (expiry == null || expiry.isBefore(today)) {
      return false;
    }
    long daysLeft = ChronoUnit.DAYS.between(today, expiry);
    return daysLeft <= EXPIRING_SOON_DAYS;
  }

  private String buildExpiryStatus(InventoryDtos.InventoryItemDto item, LocalDate today) {
    LocalDate expiry = parseMobileDate(item.expiryDate());
    if (expiry == null) {
      return "";
    }

    long daysLeft = ChronoUnit.DAYS.between(today, expiry);
    if (daysLeft < 0) {
      return String.format(Locale.ROOT, " | trạng thái: đã hết hạn %d ngày", Math.abs(daysLeft));
    }
    if (daysLeft == 0) {
      return " | trạng thái: hết hạn hôm nay";
    }
    if (daysLeft <= EXPIRING_SOON_DAYS) {
      return String.format(Locale.ROOT, " | trạng thái: sắp hết hạn (%d ngày)", daysLeft);
    }
    return String.format(Locale.ROOT, " | trạng thái: còn %d ngày", daysLeft);
  }

  private void requireNotGuest(Long userId) {
    Boolean isGuest = jdbcTemplate.queryForObject(
        "SELECT is_guest FROM \"user\" WHERE id = ?",
        Boolean.class, userId);
    if (Boolean.TRUE.equals(isGuest)) {
      throw new org.springframework.web.server.ResponseStatusException(
          org.springframework.http.HttpStatus.FORBIDDEN, 
          "Guest users cannot modify inventory");
    }
  }

  private LocalDate parseMobileDate(String date) {
    if (date == null || date.isBlank()) {
      return null;
    }

    try {
      return LocalDate.parse(date, MOBILE_DATE_FORMAT);
    } catch (DateTimeParseException ignored) {
      return null;
    }
  }
}
