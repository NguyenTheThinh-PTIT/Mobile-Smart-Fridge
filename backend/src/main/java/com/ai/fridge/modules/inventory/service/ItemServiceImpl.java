package com.ai.fridge.modules.inventory.service;

import com.ai.fridge.common.dto.ItemRequest;
import com.ai.fridge.common.dto.ItemResponse;
import com.ai.fridge.common.exceptions.BaseException;
import com.ai.fridge.common.exceptions.ErrorCode;
import com.ai.fridge.modules.inventory.entity.ItemEntity;
import com.ai.fridge.modules.inventory.mapper.ItemMapper;
import com.ai.fridge.modules.inventory.repository.ItemRepository;
import java.util.List;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class ItemServiceImpl implements ItemService {

  private final ItemRepository itemRepository;
  private final ItemMapper itemMapper;

  @Override
  public ItemResponse createItem(Long inventoryId, ItemRequest request) {
    log.info("Creating item for inventory: {}", inventoryId);

    ItemEntity entity = itemMapper.toEntity(request, inventoryId);
    ItemEntity saved = itemRepository.save(entity);

    log.info("Item created with id: {}", saved.getId());
    return itemMapper.toResponse(saved);
  }

  @Override
  @Transactional(readOnly = true)
  public ItemResponse getItemById(Long itemId) {
    log.debug("Fetching item with id: {}", itemId);

    ItemEntity entity =
        itemRepository
            .findById(itemId)
            .orElseThrow(
                () -> {
                  log.warn("Item not found with id: {}", itemId);
                  return new BaseException(ErrorCode.ERR_ITEM_NOT_FOUND, "Item with id " + itemId);
                });

    return itemMapper.toResponse(entity);
  }

  @Override
  public ItemResponse updateItem(Long itemId, ItemRequest request) {
    log.info("Updating item with id: {}", itemId);

    ItemEntity entity =
        itemRepository
            .findById(itemId)
            .orElseThrow(
                () -> {
                  log.warn("Item not found for update with id: {}", itemId);
                  return new BaseException(ErrorCode.ERR_ITEM_NOT_FOUND, "Item with id " + itemId);
                });

    itemMapper.updateEntity(request, entity);
    ItemEntity updated = itemRepository.save(entity);

    log.info("Item updated with id: {}", itemId);
    return itemMapper.toResponse(updated);
  }

  @Override
  public void deleteItem(Long itemId) {
    log.info("Deleting item with id: {}", itemId);

    if (!itemRepository.existsById(itemId)) {
      log.warn("Item not found for delete with id: {}", itemId);
      throw new BaseException(ErrorCode.ERR_ITEM_NOT_FOUND, "Item with id " + itemId);
    }

    itemRepository.deleteById(itemId);
    log.info("Item deleted with id: {}", itemId);
  }

  @Override
  @Transactional(readOnly = true)
  public List<ItemResponse> getItemsByInventoryId(Long inventoryId) {
    log.debug("Fetching items for inventory: {}", inventoryId);

    return itemRepository.findByInventoryId(inventoryId).stream()
        .map(itemMapper::toResponse)
        .collect(Collectors.toList());
  }

  @Override
  @Transactional(readOnly = true)
  public List<ItemResponse> getItemsByCategory(Long inventoryId, String category) {
    log.debug("Fetching items for inventory: {} with category: {}", inventoryId, category);

    return itemRepository.findByInventoryIdAndStorageSection(inventoryId, category).stream()
        .map(itemMapper::toResponse)
        .collect(Collectors.toList());
  }
}
