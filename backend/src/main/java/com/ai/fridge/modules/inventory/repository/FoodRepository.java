package com.ai.fridge.modules.inventory.repository;

import com.ai.fridge.modules.inventory.entity.FoodEntity;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface FoodRepository extends JpaRepository<FoodEntity, Long> {

  Optional<FoodEntity> findByNameIgnoreCaseAndCategoryId(String name, Long categoryId);

  List<FoodEntity> findByNameIgnoreCase(String name);

  List<FoodEntity> findByCategoryId(Long categoryId);

  @Query("SELECT f FROM FoodEntity f WHERE f.categoryId = :categoryId ORDER BY f.name ASC")
  List<FoodEntity> findAllByCategoryOrderByName(@Param("categoryId") Long categoryId);
}
