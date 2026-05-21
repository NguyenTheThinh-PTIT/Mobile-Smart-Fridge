package com.ai.fridge.modules.inventory.service;

import com.ai.fridge.common.dto.ItemRequest;
import com.ai.fridge.common.dto.ItemResponse;
import java.util.List;

public interface ItemService {

  ItemResponse createItem(Long inventoryId, ItemRequest request);

  ItemResponse getItemById(Long itemId);

  ItemResponse updateItem(Long itemId, ItemRequest request);

  void deleteItem(Long itemId);

  List<ItemResponse> getItemsByInventoryId(Long inventoryId);

  List<ItemResponse> getItemsByCategory(Long inventoryId, String category);
}
