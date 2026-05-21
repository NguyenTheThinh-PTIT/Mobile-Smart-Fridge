// package com.ai.fridge.modules.inventory.service;

// import com.ai.fridge.modules.app.chat.service.KnowledgeBaseService;
// import com.ai.fridge.modules.app.inventory.dto.InventoryDtos;
// import com.ai.fridge.modules.inventory.entity.CategoryEntity;
// import com.ai.fridge.modules.inventory.entity.FoodEntity;
// import com.ai.fridge.modules.inventory.entity.InventoryBatchEntity;
// import com.ai.fridge.modules.inventory.repository.CategoryRepository;
// import com.ai.fridge.modules.inventory.repository.FoodRepository;
// import com.ai.fridge.modules.inventory.repository.InventoryBatchRepository;
// import java.time.LocalDate;
// import java.time.format.DateTimeFormatter;
// import java.time.format.DateTimeParseException;
// import org.springframework.stereotype.Service;
// import org.springframework.transaction.annotation.Transactional;

// @Service
// public class InvoiceConfirmService {

//   private static final DateTimeFormatter MOBILE_DATE_FORMAT =
//       DateTimeFormatter.ofPattern("dd/MM/yyyy");

//   private final InventoryBatchRepository inventoryBatchRepository;
//   private final FoodRepository foodRepository;
//   private final CategoryRepository categoryRepository;
//   private final KnowledgeBaseService knowledgeBaseService;

//   public InvoiceConfirmService(
//       InventoryBatchRepository inventoryBatchRepository,
//       FoodRepository foodRepository,
//       CategoryRepository categoryRepository,
//       KnowledgeBaseService knowledgeBaseService) {
//     this.inventoryBatchRepository = inventoryBatchRepository;
//     this.foodRepository = foodRepository;
//     this.categoryRepository = categoryRepository;
//     this.knowledgeBaseService = knowledgeBaseService;
//   }

//   @Transactional
//   public void confirmAndSaveInvoiceItems(
//       Long inventoryId, java.util.List<InventoryDtos.InvoiceConfirmItemRequest> items) {
//     if (inventoryId == null || inventoryId <= 0) {
//       throw new IllegalArgumentException("inventoryId must be positive");
//     }

//     if (items == null || items.isEmpty()) {
//       return;
//     }

//     for (InventoryDtos.InvoiceConfirmItemRequest item : items) {
//       confirmAndSaveItem(inventoryId, item);
//     }
//   }

//   @Transactional
//   private void confirmAndSaveItem(Long inventoryId, InventoryDtos.InvoiceConfirmItemRequest item)
// {
//     String itemName = normalizeName(item.name());
//     String categoryName = normalizeCategory(item.category());

//     // Step 1: Ensure category exists
//     CategoryEntity category = ensureCategory(categoryName);

//     // Step 2: Try semantic search first, then fallback to exact match
//     Long foodId = findOrCreateFoodId(itemName, category.getId());

//     // Step 3: Parse expiration date
//     LocalDate expirationDate = parseDate(item.expiryDate());

//     // Step 4: Create and save inventory_batch record
//     InventoryBatchEntity batch =
//         InventoryBatchEntity.builder()
//             .inventoryId(inventoryId)
//             .foodId(foodId)
//             .quantity(item.quantity())
//             .unit(normalizeUnit(item.unit()))
//             .entryDate(LocalDate.now())
//             .expirationDate(expirationDate)
//             .status("active")
//             .storageSection(null)
//             .isBought(true)
//             .build();

//     inventoryBatchRepository.save(batch);
//   }

//   private Long findOrCreateFoodId(String foodName, Long categoryId) {
//     // Step 1: Try semantic search via KnowledgeBaseService
//     KnowledgeBaseService.FoodSimilarityMatch match =
//         knowledgeBaseService.findFoodBySimilarity(foodName, 5);

//     if (match.foodId() != null && match.similarity() >= 0.75) {
//       // Found a good match via semantic search
//       return match.foodId();
//     }

//     // Step 2: Try exact match within the category
//     var exactMatch = foodRepository.findByNameIgnoreCaseAndCategoryId(foodName, categoryId);
//     if (exactMatch.isPresent()) {
//       return exactMatch.get().getId();
//     }

//     // Step 3: Create new food entry
//     FoodEntity newFood =
//         FoodEntity.builder()
//             .name(foodName)
//             .categoryId(categoryId)
//             .defaultShelfLifeDay(null)
//             .build();

//     FoodEntity savedFood = foodRepository.save(newFood);
//     return savedFood.getId();
//   }

//   private CategoryEntity ensureCategory(String categoryName) {
//     var existing = categoryRepository.findByNameIgnoreCase(categoryName);
//     if (existing.isPresent()) {
//       return existing.get();
//     }

//     CategoryEntity newCategory = CategoryEntity.builder().name(categoryName).build();
//     return categoryRepository.save(newCategory);
//   }

//   private String normalizeName(String name) {
//     if (name == null || name.isBlank()) {
//       return "Thực phẩm mới";
//     }
//     return name.trim();
//   }

//   private String normalizeCategory(String category) {
//     if (category == null || category.isBlank()) {
//       return "Khác";
//     }
//     return category.trim();
//   }

//   private String normalizeUnit(String unit) {
//     if (unit == null || unit.isBlank()) {
//       return "kg";
//     }
//     return unit.trim();
//   }

//   private LocalDate parseDate(String date) {
//     if (date == null || date.isBlank()) {
//       return null;
//     }

//     try {
//       return LocalDate.parse(date, MOBILE_DATE_FORMAT);
//     } catch (DateTimeParseException ignored) {
//     }

//     try {
//       return LocalDate.parse(date);
//     } catch (DateTimeParseException ignored) {
//       return null;
//     }
//   }
// }

package com.ai.fridge.modules.inventory.service;

import com.ai.fridge.modules.app.chat.service.KnowledgeBaseService;
import com.ai.fridge.modules.app.inventory.dto.InventoryDtos;
import com.ai.fridge.modules.inventory.entity.CategoryEntity;
import com.ai.fridge.modules.inventory.entity.FoodEntity;
import com.ai.fridge.modules.inventory.entity.InventoryBatchEntity;
import com.ai.fridge.modules.inventory.repository.CategoryRepository;
import com.ai.fridge.modules.inventory.repository.FoodRepository;
import com.ai.fridge.modules.inventory.repository.InventoryBatchRepository;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class InvoiceConfirmService {

  private static final DateTimeFormatter MOBILE_DATE_FORMAT =
      DateTimeFormatter.ofPattern("dd/MM/yyyy");

  private final InventoryBatchRepository inventoryBatchRepository;
  private final FoodRepository foodRepository;
  private final CategoryRepository categoryRepository;
  private final KnowledgeBaseService knowledgeBaseService;

  public InvoiceConfirmService(
      InventoryBatchRepository inventoryBatchRepository,
      FoodRepository foodRepository,
      CategoryRepository categoryRepository,
      KnowledgeBaseService knowledgeBaseService) {
    this.inventoryBatchRepository = inventoryBatchRepository;
    this.foodRepository = foodRepository;
    this.categoryRepository = categoryRepository;
    this.knowledgeBaseService = knowledgeBaseService;
  }

  @Transactional
  public void confirmAndSaveInvoiceItems(
      Long inventoryId, java.util.List<InventoryDtos.InvoiceConfirmItemRequest> items) {
    if (inventoryId == null || inventoryId <= 0) {
      throw new IllegalArgumentException("inventoryId must be positive");
    }

    if (items == null || items.isEmpty()) {
      return;
    }

    for (InventoryDtos.InvoiceConfirmItemRequest item : items) {
      confirmAndSaveItem(inventoryId, item);
    }
  }

  @Transactional
  private void confirmAndSaveItem(Long inventoryId, InventoryDtos.InvoiceConfirmItemRequest item) {
    String itemName = normalizeName(item.name());
    String categoryName = normalizeCategory(item.category());

    // Step 1: Ensure category exists
    CategoryEntity category = ensureCategory(categoryName);

    // Step 2: Tìm hoặc tạo Food
    Long foodId = findOrCreateFoodId(itemName, category.getId());

    // Step 3: Parse expiration date
    LocalDate expirationDate = parseDate(item.expiryDate());

    // Step 4: Create and save inventory_batch record
    InventoryBatchEntity batch =
        InventoryBatchEntity.builder()
            .inventoryId(inventoryId)
            .foodId(foodId)
            .quantity(item.quantity())
            .unit(normalizeUnit(item.unit()))
            .entryDate(LocalDate.now())
            .expirationDate(expirationDate)
            .status("active")
            .storageSection(null)
            .isBought(true)
            .build();

    inventoryBatchRepository.save(batch);
  }

  private Long findOrCreateFoodId(String foodName, Long categoryId) {
    // Tạm thời bỏ qua Semantic Search để tránh lỗi compile
    // Sau này ông thêm knowledge mới vào KnowledgeBaseService thì viết lại ở đây nhé

    // Step 1: Try exact match within the category
    var exactMatch = foodRepository.findByNameIgnoreCaseAndCategoryId(foodName, categoryId);
    if (exactMatch.isPresent()) {
      return exactMatch.get().getId();
    }

    // Step 2: Create new food entry nếu không tìm thấy
    FoodEntity newFood =
        FoodEntity.builder()
            .name(foodName)
            .categoryId(categoryId)
            .defaultShelfLifeDay(null)
            .build();

    FoodEntity savedFood = foodRepository.save(newFood);
    return savedFood.getId();
  }

  private CategoryEntity ensureCategory(String categoryName) {
    var existing = categoryRepository.findByNameIgnoreCase(categoryName);
    if (existing.isPresent()) {
      return existing.get();
    }

    CategoryEntity newCategory = CategoryEntity.builder().name(categoryName).build();
    return categoryRepository.save(newCategory);
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
}
