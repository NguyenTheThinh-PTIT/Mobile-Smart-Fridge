package com.ai.fridge.modules.inventory.repository;

import com.ai.fridge.modules.inventory.entity.InventoryEntity;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface InventoryRepository extends JpaRepository<InventoryEntity, Long> {
  List<InventoryEntity> findByHouseholdId(Long householdId);

  Optional<InventoryEntity> findByIdAndHouseholdId(Long id, Long householdId);
}
