from sqlalchemy import select, and_, or_, true, cast, String
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.dialects.postgresql import ARRAY
from sqlalchemy import func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from ai_service.models.orm_models import Recipe, RecipeFood, Food
from ai_service.schemas.suggestion_schema import (
    CoverageResult,
    MissingIngredient,
    SuggestionContext,
    WeatherContext,
)


class FilterService:

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def get_candidate_recipe_ids(self, ctx: SuggestionContext) -> list[int]:
        """
        Tra ve recipe_id thoa man constraint cung truoc khi di vao vector search.
        Thuc hien bang SQL WHERE thay vi Python-side filter de tan dung query planner
        PostgreSQL va giam data transfer qua network.
        """
        conditions = [
            # Loai mon da nau trong 3 ngay: tranh nguoi dung cam thay nham chan
            Recipe.id.notin_(ctx.recent_recipe_ids) if ctx.recent_recipe_ids else true(),

            # Loai mon chua allergen cua bat ky thanh vien nao
            # Su dung PostgreSQL ?| operator: kiem tra JSONB array co chua bat ky phan tu nao
            # trong danh sach combined_allergies khong
            ~Recipe.allergen_contains.op("?|")(
                cast(ctx.combined_allergies, ARRAY(String))
            )
            if ctx.combined_allergies else true(),

            # Chi lay Recipe phu hop meal_type hoac Recipe khong gioi han meal_type (mang rong)
            or_(
                func.jsonb_array_length(Recipe.meal_type_tags) == 0,
                Recipe.meal_type_tags.op("@>")(cast([ctx.meal_type], JSONB)),
            ),
        ]

        if ctx.max_cook_minutes is not None:
            conditions.append(Recipe.cook_time_minutes <= ctx.max_cook_minutes)

        stmt = select(Recipe.id).where(and_(*conditions))
        result = await self.db.execute(stmt)
        return [row[0] for row in result.all()]

    async def score_recipes(
        self,
        recipe_ids: list[int],
        ctx: SuggestionContext,
    ) -> list[CoverageResult]:
        """
        Tinh coverage score cho tung Recipe sau khi da qua hybrid search.
        Soft scoring khong loai bo Recipe, chi dieu chinh thu tu uu tien.
        """
        if not recipe_ids:
            return []

        # Load recipe_foods cua tat ca candidate trong mot query de tranh N+1 problem
        stmt = (
            select(RecipeFood)
            .join(Food, Food.id == RecipeFood.food_id)
            .options(selectinload(RecipeFood.food))
            .where(RecipeFood.recipe_id.in_(recipe_ids))
        )
        result = await self.db.execute(stmt)
        all_recipe_foods = result.scalars().all()

        recipe_foods_map: dict[int, list[RecipeFood]] = {}
        for rf in all_recipe_foods:
            recipe_foods_map.setdefault(rf.recipe_id, []).append(rf)

        scored = []
        for recipe_id in recipe_ids:
            rfoods = recipe_foods_map.get(recipe_id, [])
            score_result = self._calculate_coverage(recipe_id, rfoods, ctx)
            scored.append(score_result)

        return scored

    def _calculate_coverage(
        self,
        recipe_id: int,
        recipe_foods: list[RecipeFood],
        ctx: SuggestionContext,
    ) -> CoverageResult:
        if not recipe_foods:
            return CoverageResult(
                recipe_id=recipe_id,
                coverage_ratio=0.0,
                final_score=0.0,
                missing_ingredients=[],
                available_ingredients=[],
                is_fully_covered=False,
                expiring_ingredients_used=[],
            )

        covered = 0
        missing: list[MissingIngredient] = []
        available_ingredients: list[str] = []
        expiring_used: list[str] = []
        expiring_bonus = 0.0

        for rf in recipe_foods:
            quantity_available = ctx.inventory_map.get(rf.food_id, 0.0)
            if quantity_available >= rf.require_quantity:
                covered += 1
                available_ingredients.append(ctx.food_id_to_name.get(rf.food_id, rf.food.name))
                if rf.food_id in ctx.expiring_soon_ids:
                    # Moi nguyen lieu sap het han duoc su dung tang them 0.1 diem
                    # de khuyen khich chon mon giam lua phuc pham, phu hop muc tieu he thong
                    expiring_bonus += 0.1
                    expiring_used.append(ctx.food_id_to_name.get(rf.food_id, ""))
            else:
                missing.append(MissingIngredient(
                    food_name=ctx.food_id_to_name.get(rf.food_id, rf.food.name),
                    required=rf.require_quantity,
                    available=quantity_available,
                    unit=rf.unit,
                ))

        coverage_ratio = covered / len(recipe_foods)
        final_score = coverage_ratio + expiring_bonus

        return CoverageResult(
            recipe_id=recipe_id,
            coverage_ratio=coverage_ratio,
            final_score=final_score,
            missing_ingredients=missing,
            available_ingredients=available_ingredients,
            is_fully_covered=(coverage_ratio >= 1.0),
            expiring_ingredients_used=expiring_used,
        )

    @staticmethod
    def apply_weather_boost(
        base_score: float,
        recipe: Recipe,
        weather: WeatherContext,
    ) -> float:
        # Boost nho (0.05) de khong override coverage score
        # Nguyen lieu san co quan trong hon su phu hop thoi tiet
        if weather.season_hint in (recipe.season_tags or []):
            return base_score + 0.05
        return base_score
