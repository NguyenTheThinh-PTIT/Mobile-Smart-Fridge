from datetime import datetime
from typing import Annotated
import json
import logging

from fastapi import APIRouter, Depends, Query
from redis.asyncio import Redis
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_

from ai_service.config import settings
from ai_service.dependencies import get_db, get_redis
from ai_service.models.orm_models import Recipe, RecipeFood, Food, UserPreference, HouseholdMember, MealAttendance
from ai_service.schemas.suggestion_schema import (
    CoverageResult,
    SuggestionResponse,
    SuggestedRecipe,
    SuggestionReason,
    SuggestionContext,
    RecipeSearchItem,
    RecipeSearchResponse,
)
from ai_service.services.cache_service import CacheService
from ai_service.services.context_service import ContextService
from ai_service.services.embedding_service import EmbeddingService
from ai_service.services.filter_service import FilterService
from ai_service.services.llm_service import LLMService
from ai_service.services.retrieval_service import RetrievalService
from ai_service.services.weather_service import WeatherService

router = APIRouter()
logger = logging.getLogger(__name__)

DECLINED_STATUSES = {"declined", "not_eating", "not-eating", "skip", "skipped", "rejected", "absent"}


def _parse_allergy_text(raw: str | None) -> list[str]:
    if not raw:
        return []

    cleaned = raw.strip()
    if not cleaned:
        return []

    try:
        parsed = json.loads(cleaned)
        if isinstance(parsed, list):
            return [str(item).strip().lower() for item in parsed if str(item).strip()]
    except json.JSONDecodeError:
        pass

    return [item.strip().lower() for item in cleaned.split(",") if item.strip()]


def _normalize_allergen_list(raw: list | None) -> list[str]:
    if not raw:
        return []
    return [str(item).strip().lower() for item in raw if str(item).strip()]


async def _load_recipes_meta(
    db: AsyncSession,
    recipe_ids: list[int],
) -> dict[int, Recipe]:
    # Batch load de tranh N+1 khi lay metadata cho top candidates
    stmt = select(Recipe).where(Recipe.id.in_(recipe_ids))
    result = await db.execute(stmt)
    return {r.id: r for r in result.scalars().all()}


def _build_response(
    fully_covered: list[CoverageResult],
    partially_covered: list[CoverageResult],
    reasons: list[SuggestionReason],
    recipes_meta: dict[int, Recipe],
    ctx: SuggestionContext,
) -> SuggestionResponse:
    reason_map = {r.recipe_id: r for r in reasons}

    def build_allergy_overlap(meta: Recipe) -> list[str]:
        recipe_allergens = _normalize_allergen_list(meta.allergen_contains)
        return sorted(set(recipe_allergens).intersection(set(ctx.combined_allergies)))

    def to_suggested(cr: CoverageResult) -> SuggestedRecipe | None:
        meta = recipes_meta.get(cr.recipe_id)
        if not meta:
            return None
        reason = reason_map.get(cr.recipe_id)
        overlap = build_allergy_overlap(meta)
        warning_message = f"Cảnh báo dị ứng: {', '.join(overlap)}" if overlap else None
        return SuggestedRecipe(
            recipe_id=cr.recipe_id,
            recipe_name=meta.name or "",
            cook_time_minutes=meta.cook_time_minutes or 0,
            difficulty=meta.difficulty or "",
            cuisine_type=meta.cuisine_type or "",
            coverage_ratio=cr.coverage_ratio,
            missing_ingredients=cr.missing_ingredients,
            available_ingredients=cr.available_ingredients,
            uses_expiring_ingredients=cr.expiring_ingredients_used,
            reason=reason.reason if reason else "",
            highlight=reason.highlight if reason else "",
            allergy_overlap=overlap,
            warning_message=warning_message,
        )

    return SuggestionResponse(
        fully_covered=[s for cr in fully_covered if (s := to_suggested(cr)) is not None],
        partially_covered=[s for cr in partially_covered if (s := to_suggested(cr)) is not None],
        weather_context=f"{ctx.weather.description}, {ctx.weather.temp_c}°C",
        generated_at=datetime.utcnow(),
    )


def _build_fallback_reasons(
    scored_recipes: list[CoverageResult],
    recipes_meta: dict[int, Recipe],
    ctx: SuggestionContext,
) -> list[SuggestionReason]:
    fallback_reasons: list[SuggestionReason] = []

    for scored_recipe in scored_recipes:
        recipe_meta = recipes_meta.get(scored_recipe.recipe_id)
        recipe_name = recipe_meta.name if recipe_meta and recipe_meta.name else "Món ăn này"

        if scored_recipe.is_fully_covered:
            reason = f"{recipe_name} phù hợp vì nhà hiện có đủ nguyên liệu cho bữa {ctx.meal_type}."
            highlight = "Đủ nguyên liệu"
        else:
            missing = scored_recipe.missing_ingredients[0] if scored_recipe.missing_ingredients else None
            if missing:
                reason = (
                    f"{recipe_name} vẫn là lựa chọn hợp lý cho bữa {ctx.meal_type}, "
                    f"nhưng cần bổ sung thêm {missing.food_name}."
                )
            else:
                reason = f"{recipe_name} là gợi ý phù hợp với bối cảnh bữa {ctx.meal_type}."
            highlight = "Cần mua thêm"

        if scored_recipe.expiring_ingredients_used:
            reason = (
                f"{reason} Món này cũng ưu tiên dùng nguyên liệu sắp hết hạn để giảm lãng phí."
            )
            highlight = "Ưu tiên dùng đồ sắp hết hạn"

        fallback_reasons.append(
            SuggestionReason(
                recipe_id=scored_recipe.recipe_id,
                reason=reason,
                highlight=highlight,
            )
        )

    return fallback_reasons


# Thu tu pipeline la bat bien va co ly do ro rang:
# 1. Thu thap context truoc khi lam bat cu dieu gi - pipeline phu thuoc vao context
# 2. Check cache truoc khi chay pipeline ton kem - tranh goi LLM lap
# 3. Hard filter truoc retrieval - thu hep khong gian tim kiem cho vector search
# 4. Hybrid search - lay candidate co the phu hop nhat
# 5. Soft scoring - rerank theo business logic cu the
# 6. LLM chi goi cuoi cung sau khi da biet chinh xac mon nao se tra ve

@router.get("/api/v1/suggestions", response_model=SuggestionResponse)
async def get_suggestions(
    household_id: int,
    meal_type: Annotated[str, Query(pattern="^(breakfast|lunch|dinner|snack)$")],
    lat: float,
    lon: float,
    max_cook_minutes: int | None = None,
    db: AsyncSession = Depends(get_db),
    redis: Redis = Depends(get_redis),
) -> SuggestionResponse:
    ctx_svc = ContextService(db, WeatherService(redis, settings), settings)
    cache_svc = CacheService(redis, settings)

    ctx = await ctx_svc.build_context(household_id, meal_type, lat, lon, max_cook_minutes)

    cache_key = cache_svc.build_suggestion_cache_key(ctx)
    cached = await cache_svc.get_suggestion_cache(cache_key)
    if cached:
        return cached

    filter_svc = FilterService(db)
    candidate_ids = await filter_svc.get_candidate_recipe_ids(ctx)

    if not candidate_ids:
        return SuggestionResponse(
            fully_covered=[],
            partially_covered=[],
            weather_context=f"{ctx.weather.description}, {ctx.weather.temp_c}°C",
            generated_at=datetime.utcnow(),
        )

    retrieval_svc = RetrievalService(db, EmbeddingService(settings), settings)
    ranked_ids = await retrieval_svc.hybrid_search(ctx, candidate_ids)

    top_candidates = ranked_ids[:settings.top_k_retrieval]
    scored_recipes = await filter_svc.score_recipes(top_candidates, ctx)

    # Load Recipe metadata de weather boost va truyen cho LLM
    recipes_meta = await _load_recipes_meta(db, top_candidates)
    for sr in scored_recipes:
        meta = recipes_meta.get(sr.recipe_id)
        if meta:
            sr.final_score = filter_svc.apply_weather_boost(sr.final_score, meta, ctx.weather)

    fully_covered = sorted(
        [r for r in scored_recipes if r.is_fully_covered],
        key=lambda r: r.final_score,
        reverse=True,
    )[:5]
    partially_covered = sorted(
        [r for r in scored_recipes if not r.is_fully_covered],
        key=lambda r: r.final_score,
        reverse=True,
    )[:5]

    top_10 = fully_covered + partially_covered

    llm_svc = LLMService(settings)
    try:
        reasons = await llm_svc.generate_reasons(top_10, recipes_meta, ctx)
    except Exception as exc:
        logger.warning(
            "LLM reason generation failed for household_id=%s, meal_type=%s. Falling back to deterministic reasons. Error=%s",
            household_id,
            meal_type,
            exc,
        )
        reasons = _build_fallback_reasons(top_10, recipes_meta, ctx)

    response = _build_response(fully_covered, partially_covered, reasons, recipes_meta, ctx)
    await cache_svc.set_suggestion_cache(cache_key, response)
    return response


@router.get("/api/v1/recipes/all-catalog", response_model=SuggestionResponse)
async def get_all_recipe_catalog(
    household_id: int,
    meal_type: Annotated[str, Query(pattern="^(breakfast|lunch|dinner|snack)$")],
    lat: float,
    lon: float,
    max_cook_minutes: int | None = None,
    db: AsyncSession = Depends(get_db),
    redis: Redis = Depends(get_redis),
) -> SuggestionResponse:
    ctx_svc = ContextService(db, WeatherService(redis, settings), settings)
    ctx = await ctx_svc.build_context(household_id, meal_type, lat, lon, max_cook_minutes)

    all_recipe_rows = await db.execute(select(Recipe.id).order_by(Recipe.id.asc()))
    all_recipe_ids = [int(row[0]) for row in all_recipe_rows.all()]

    if not all_recipe_ids:
        return SuggestionResponse(
            fully_covered=[],
            partially_covered=[],
            weather_context=f"{ctx.weather.description}, {ctx.weather.temp_c}°C",
            generated_at=datetime.utcnow(),
        )

    filter_svc = FilterService(db)
    scored_recipes = await filter_svc.score_recipes(all_recipe_ids, ctx)

    recipes_meta = await _load_recipes_meta(db, all_recipe_ids)
    for sr in scored_recipes:
        meta = recipes_meta.get(sr.recipe_id)
        if meta:
            sr.final_score = filter_svc.apply_weather_boost(sr.final_score, meta, ctx.weather)

    fully_covered = sorted(
        [r for r in scored_recipes if r.is_fully_covered],
        key=lambda r: r.final_score,
        reverse=True,
    )
    partially_covered = sorted(
        [r for r in scored_recipes if not r.is_fully_covered],
        key=lambda r: r.final_score,
        reverse=True,
    )

    empty_reasons: list[SuggestionReason] = []
    return _build_response(fully_covered, partially_covered, empty_reasons, recipes_meta, ctx)


@router.get("/api/v1/recipes/search", response_model=RecipeSearchResponse)
async def search_recipes(
    household_id: int,
    query: str,
    meal_id: int | None = None,
    limit: int = 20,
    db: AsyncSession = Depends(get_db),
) -> RecipeSearchResponse:
    normalized_query = query.strip()
    if not normalized_query:
        return RecipeSearchResponse(query=query, household_id=household_id, total=0, results=[])

    safe_limit = max(1, min(limit, 50))

    members_stmt = select(HouseholdMember.user_id).where(HouseholdMember.household_id == household_id)
    member_rows = (await db.execute(members_stmt)).all()
    household_user_ids = {int(row.user_id) for row in member_rows if row.user_id is not None}

    if meal_id and household_user_ids:
        attendance_stmt = select(MealAttendance.user_id, MealAttendance.status).where(
            MealAttendance.meal_id == meal_id,
            MealAttendance.user_id.in_(household_user_ids),
        )
        attendance_rows = (await db.execute(attendance_stmt)).all()
        declined_user_ids = {
            int(row.user_id)
            for row in attendance_rows
            if row.user_id is not None
            and str(row.status or "").strip().lower() in DECLINED_STATUSES
        }
        household_user_ids = household_user_ids - declined_user_ids

    allergy_set: set[str] = set()
    if household_user_ids:
        preference_stmt = select(UserPreference.allergies).where(UserPreference.user_id.in_(household_user_ids))
        preference_rows = (await db.execute(preference_stmt)).all()
        for row in preference_rows:
            allergy_set.update(_parse_allergy_text(row.allergies))

    like_term = f"%{normalized_query}%"
    recipe_stmt = (
        select(Recipe)
        .where(
            or_(
                Recipe.name.ilike(like_term),
                Recipe.id.in_(
                    select(RecipeFood.recipe_id)
                    .join(Food, Food.id == RecipeFood.food_id)
                    .where(Food.name.ilike(like_term))
                ),
            )
        )
        .order_by(Recipe.name.asc())
        .limit(safe_limit)
    )
    recipe_rows = (await db.execute(recipe_stmt)).scalars().all()

    items: list[RecipeSearchItem] = []
    for recipe in recipe_rows:
        recipe_allergens = _normalize_allergen_list(recipe.allergen_contains)
        overlap = sorted(set(recipe_allergens).intersection(allergy_set))
        warning_message = (
            f"Cảnh báo dị ứng: {', '.join(overlap)}"
            if overlap
            else None
        )

        items.append(
            RecipeSearchItem(
                recipe_id=recipe.id,
                recipe_name=recipe.name or "",
                cook_time_minutes=recipe.cook_time_minutes or 0,
                difficulty=recipe.difficulty or "",
                cuisine_type=recipe.cuisine_type or "",
                allergy_overlap=overlap,
                warning_message=warning_message,
            )
        )

    return RecipeSearchResponse(
        query=query,
        household_id=household_id,
        total=len(items),
        results=items,
    )

@router.get("/api/v1/recipes/by-tag", response_model=RecipeSearchResponse)
async def search_recipes_by_tag(
    household_id: int,
    tag_type: str,
    tag_value: str,
    query: str = "",
    limit: int = 20,
    offset: int = 0,
    db: AsyncSession = Depends(get_db),
) -> RecipeSearchResponse:
    """
    Search recipes by tags (cuisine_type, difficulty, etc.).
    Supports additional filtering by query string.
    """
    safe_limit = max(1, min(limit, 50))
    safe_offset = max(0, offset)

    normalized_query = query.strip().lower() if query else ""
    tag_value = tag_value.strip().lower()

    if not tag_value:
        return RecipeSearchResponse(query=query, household_id=household_id, total=0, results=[])

    members_stmt = select(HouseholdMember.user_id).where(HouseholdMember.household_id == household_id)
    member_rows = (await db.execute(members_stmt)).all()
    household_user_ids = {int(row.user_id) for row in member_rows if row.user_id is not None}

    allergy_set: set[str] = set()
    if household_user_ids:
        preference_stmt = select(UserPreference.allergies).where(UserPreference.user_id.in_(household_user_ids))
        preference_rows = (await db.execute(preference_stmt)).all()
        for row in preference_rows:
            allergy_set.update(_parse_allergy_text(row.allergies))

    recipe_stmt = select(Recipe).order_by(Recipe.name.asc()).limit(safe_limit).offset(safe_offset)

    if tag_type.lower() == "cuisine":
        recipe_stmt = recipe_stmt.where(Recipe.cuisine_type.ilike(f"%{tag_value}%"))
    elif tag_type.lower() == "difficulty":
        recipe_stmt = recipe_stmt.where(Recipe.difficulty.ilike(f"%{tag_value}%"))
    elif tag_type.lower() == "meal_type":
        recipe_stmt = recipe_stmt.where(Recipe.meal_type_tags.astext.ilike(f"%{tag_value}%"))
    else:
        return RecipeSearchResponse(query=query, household_id=household_id, total=0, results=[])

    recipe_rows = (await db.execute(recipe_stmt)).scalars().all()

    items: list[RecipeSearchItem] = []
    for recipe in recipe_rows:
        if normalized_query and normalized_query not in (recipe.name or "").lower():
            continue

        recipe_allergens = _normalize_allergen_list(recipe.allergen_contains)
        overlap = sorted(set(recipe_allergens).intersection(allergy_set))
        warning_message = (
            f"Cảnh báo dị ứng: {', '.join(overlap)}"
            if overlap
            else None
        )

        items.append(
            RecipeSearchItem(
                recipe_id=recipe.id,
                recipe_name=recipe.name or "",
                cook_time_minutes=recipe.cook_time_minutes or 0,
                difficulty=recipe.difficulty or "",
                cuisine_type=recipe.cuisine_type or "",
                allergy_overlap=overlap,
                warning_message=warning_message,
            )
        )

    return RecipeSearchResponse(
        query=query,
        household_id=household_id,
        total=len(items),
        results=items,
    )