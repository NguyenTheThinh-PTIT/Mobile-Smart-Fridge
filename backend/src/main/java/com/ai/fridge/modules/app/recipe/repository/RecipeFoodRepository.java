package com.ai.fridge.modules.app.recipe.repository;

import com.ai.fridge.modules.app.recipe.entity.RecipeFoodEntity;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface RecipeFoodRepository extends JpaRepository<RecipeFoodEntity, Long> {

  List<RecipeFoodEntity> findByRecipeId(Long recipeId);

  void deleteByRecipeId(Long recipeId);
}
