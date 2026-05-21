package com.ai.fridge.modules.inventory.repository;

import com.ai.fridge.modules.inventory.entity.InventoryBatchEntity;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface InventoryBatchRepository extends JpaRepository<InventoryBatchEntity, Long> {

  List<InventoryBatchEntity> findByInventoryId(Long inventoryId);

  List<InventoryBatchEntity> findByInventoryIdAndFoodId(Long inventoryId, Long foodId);
}
