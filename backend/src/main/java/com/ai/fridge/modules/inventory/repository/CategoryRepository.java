package com.ai.fridge.modules.inventory.repository;

import com.ai.fridge.modules.inventory.entity.CategoryEntity;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface CategoryRepository extends JpaRepository<CategoryEntity, Long> {

  Optional<CategoryEntity> findByNameIgnoreCase(String name);
}
