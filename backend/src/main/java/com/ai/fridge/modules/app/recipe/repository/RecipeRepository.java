package com.ai.fridge.modules.app.recipe.repository;

import com.ai.fridge.modules.app.recipe.entity.RecipeEntity;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface RecipeRepository extends JpaRepository<RecipeEntity, Long> {

  List<RecipeEntity> findByHouseholdIdAndSource(Long householdId, String source);

  Optional<RecipeEntity> findByIdAndHouseholdId(Long id, Long householdId);

  List<RecipeEntity> findByHouseholdId(Long householdId);

  @Query(
      "SELECT r FROM RecipeEntity r WHERE r.householdId = :householdId AND r.source = :source ORDER BY r.createdDate DESC")
  List<RecipeEntity> findUserRecipesByHouseholdId(
      @Param("householdId") Long householdId, @Param("source") String source);
}
