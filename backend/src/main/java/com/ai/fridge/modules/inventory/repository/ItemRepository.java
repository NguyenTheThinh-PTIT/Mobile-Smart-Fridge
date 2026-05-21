package com.ai.fridge.modules.inventory.repository;

import com.ai.fridge.modules.inventory.entity.ItemEntity;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ItemRepository extends JpaRepository<ItemEntity, Long> {

  List<ItemEntity> findByInventoryId(Long inventoryId);

  List<ItemEntity> findByInventoryIdAndStorageSection(Long inventoryId, String storageSection);
}
