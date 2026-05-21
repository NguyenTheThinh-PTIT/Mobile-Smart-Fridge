package com.ai.fridge.modules.social.repository;

import com.ai.fridge.modules.social.entity.RecipeShareEntity;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface RecipeShareRepository extends JpaRepository<RecipeShareEntity, Long> {

  List<RecipeShareEntity> findByUserId(Long userId);

  List<RecipeShareEntity> findAllByOrderByCreatedAtDesc();
}
