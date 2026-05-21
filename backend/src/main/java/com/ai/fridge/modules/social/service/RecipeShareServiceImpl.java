package com.ai.fridge.modules.social.service;

import com.ai.fridge.common.dto.RecipeShareRequest;
import com.ai.fridge.common.dto.RecipeShareResponse;
import com.ai.fridge.common.exceptions.BaseException;
import com.ai.fridge.common.exceptions.ErrorCode;
import com.ai.fridge.modules.social.entity.RecipeShareEntity;
import com.ai.fridge.modules.social.mapper.RecipeShareMapper;
import com.ai.fridge.modules.social.repository.RecipeShareRepository;
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
public class RecipeShareServiceImpl implements RecipeShareService {

  private final RecipeShareRepository recipeShareRepository;
  private final RecipeShareMapper recipeShareMapper;

  @Override
  public RecipeShareResponse createRecipeShare(Long userId, RecipeShareRequest request) {
    log.info("Creating recipe share for user: {}", userId);

    RecipeShareEntity entity = recipeShareMapper.toEntity(request, userId);
    RecipeShareEntity saved = recipeShareRepository.save(entity);

    log.info("Recipe share created with id: {}", saved.getId());
    return recipeShareMapper.toResponse(saved);
  }

  @Override
  @Transactional(readOnly = true)
  public RecipeShareResponse getRecipeShareById(Long recipeShareId) {
    log.debug("Fetching recipe share with id: {}", recipeShareId);

    RecipeShareEntity entity =
        recipeShareRepository
            .findById(recipeShareId)
            .orElseThrow(
                () -> {
                  log.warn("Recipe share not found with id: {}", recipeShareId);
                  return new BaseException(
                      ErrorCode.ERR_NOT_FOUND, "Recipe share with id " + recipeShareId);
                });

    return recipeShareMapper.toResponse(entity);
  }

  @Override
  public RecipeShareResponse updateRecipeShare(Long recipeShareId, RecipeShareRequest request) {
    log.info("Updating recipe share with id: {}", recipeShareId);

    RecipeShareEntity entity =
        recipeShareRepository
            .findById(recipeShareId)
            .orElseThrow(
                () -> {
                  log.warn("Recipe share not found for update with id: {}", recipeShareId);
                  return new BaseException(
                      ErrorCode.ERR_NOT_FOUND, "Recipe share with id " + recipeShareId);
                });

    recipeShareMapper.updateEntity(request, entity);
    RecipeShareEntity updated = recipeShareRepository.save(entity);

    log.info("Recipe share updated with id: {}", recipeShareId);
    return recipeShareMapper.toResponse(updated);
  }

  @Override
  public void deleteRecipeShare(Long recipeShareId) {
    log.info("Deleting recipe share with id: {}", recipeShareId);

    if (!recipeShareRepository.existsById(recipeShareId)) {
      log.warn("Recipe share not found for delete with id: {}", recipeShareId);
      throw new BaseException(ErrorCode.ERR_NOT_FOUND, "Recipe share with id " + recipeShareId);
    }

    recipeShareRepository.deleteById(recipeShareId);
    log.info("Recipe share deleted with id: {}", recipeShareId);
  }

  @Override
  @Transactional(readOnly = true)
  public List<RecipeShareResponse> getRecipeSharesByUser(Long userId) {
    log.debug("Fetching recipe shares for user: {}", userId);

    return recipeShareRepository.findByUserId(userId).stream()
        .map(recipeShareMapper::toResponse)
        .collect(Collectors.toList());
  }

  @Override
  @Transactional(readOnly = true)
  public List<RecipeShareResponse> getAllRecipeShares() {
    log.debug("Fetching all recipe shares");

    return recipeShareRepository.findAllByOrderByCreatedAtDesc().stream()
        .map(recipeShareMapper::toResponse)
        .collect(Collectors.toList());
  }

  @Override
  public void likeRecipeShare(Long recipeShareId) {
    log.info("Liking recipe share with id: {}", recipeShareId);

    RecipeShareEntity entity =
        recipeShareRepository
            .findById(recipeShareId)
            .orElseThrow(
                () -> {
                  log.warn("Recipe share not found for like with id: {}", recipeShareId);
                  return new BaseException(
                      ErrorCode.ERR_NOT_FOUND, "Recipe share with id " + recipeShareId);
                });

    entity.setLikesCount((entity.getLikesCount() != null ? entity.getLikesCount() : 0L) + 1);
    recipeShareRepository.save(entity);

    log.info("Recipe share liked with id: {}", recipeShareId);
  }
}
