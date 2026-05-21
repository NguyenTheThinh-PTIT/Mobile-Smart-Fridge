package com.ai.fridge.modules.app.recipe.repository;

import com.ai.fridge.modules.app.recipe.entity.RecipeStepEntity;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface RecipeStepRepository extends JpaRepository<RecipeStepEntity, Long> {

  List<RecipeStepEntity> findByRecipeIdOrderByStepNumber(Long recipeId);

  void deleteByRecipeId(Long recipeId);
}
