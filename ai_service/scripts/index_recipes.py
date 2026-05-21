#!/usr/bin/env python3
"""
Script one-time embed toan bo Recipe vao bang recipe_embeddings.

Chay bang lenh: python -m ai_service.scripts.index_recipes

Nen chay lai khi:
- Them Recipe moi vao database
- Thay doi EMBEDDING_MODEL (vector space thay doi, embedding cu khong tuong thich)
- Thay doi cach build chunk text (lam thay doi noi dung document)

Script idempotent: dung INSERT ... ON CONFLICT (recipe_id, chunk_type) DO UPDATE
de update embedding neu Recipe da duoc index truoc do, khong loi khi chay lai.
"""

import asyncio
from datetime import datetime

from sqlalchemy import select
from sqlalchemy.orm import selectinload

from ai_service.config import settings
from ai_service.models.database import AsyncSessionLocal
from ai_service.models.orm_models import Recipe, RecipeFood, Food, RecipeEmbedding
from ai_service.services.embedding_service import EmbeddingService


async def build_overview_text(recipe: Recipe, food_names: list[str]) -> str:
    """
    Overview chunk phu vu semantic matching voi context query nguoi dung.
    Chuyen ve tieng Viet khong dau va format ngan gon de dong nhat voi query text
    duoc xay dung trong _build_context_query_text() cua RetrievalService.
    """
    tags = list(recipe.season_tags or []) + list(recipe.meal_type_tags or [])
    return (
        f"Ten mon: {recipe.name}. "
        f"Mo ta: {(recipe.instructions or '')[:200]}. "
        f"Loai am thuc: {recipe.cuisine_type or 'Viet Nam'}. "
        f"Do kho: {recipe.difficulty}. "
        f"Thoi gian nau: {recipe.cook_time_minutes} phut. "
        f"Dieu kien phu hop: {', '.join(tags)}. "
        f"Nguyen lieu chinh: {', '.join(food_names[:10])}."
    )


async def build_ingredients_text(food_names: list[str]) -> str:
    """
    Ingredients chunk phu vu keyword matching voi ten nguyen lieu trong kho.
    Danh sach nguyen lieu khong dau de pg_trgm tinh similarity chinh xac hon
    khi so sanh voi food.name trong inventory.
    """
    return "Nguyen lieu: " + ", ".join(food_names)


async def _load_all_recipes_with_foods(db) -> list[Recipe]:
    # Load toan bo recipes
    recipes_result = await db.execute(select(Recipe))
    recipes = list(recipes_result.scalars().all())

    # Load toan bo recipe_food + food trong mot query de tranh N+1
    foods_result = await db.execute(
        select(RecipeFood).options(selectinload(RecipeFood.food))
    )
    all_rfoods = foods_result.scalars().all()

    # Map food names cho moi recipe_id
    recipe_foods_map: dict[int, list[str]] = {}
    for rf in all_rfoods:
        recipe_foods_map.setdefault(rf.recipe_id, []).append(rf.food.name)

    # Gan food names vao recipe nhu attribute tam thoi de tranh query them
    for recipe in recipes:
        recipe._food_names = recipe_foods_map.get(recipe.id, [])  # type: ignore[attr-defined]

    return recipes



async def _index_single_recipe(
    db,
    embedding_svc: EmbeddingService,
    recipe: Recipe,
) -> None:
    food_names: list[str] = getattr(recipe, "_food_names", [])

    overview_text = await build_overview_text(recipe, food_names)
    ingredients_text = await build_ingredients_text(food_names)

    overview_vec, ingredients_vec = await asyncio.gather(
        embedding_svc.embed_document(overview_text),
        embedding_svc.embed_document(ingredients_text),
    )

    now = datetime.utcnow()
    for chunk_type, chunk_content, embedding in [
        ("overview", overview_text, overview_vec),
        ("ingredients", ingredients_text, ingredients_vec),
    ]:
        # Idempotent upsert: du lieu cu se bi ghi de bang embedding moi
        from sqlalchemy.dialects.postgresql import insert
        stmt = insert(RecipeEmbedding).values(
            recipe_id=recipe.id,
            chunk_type=chunk_type,
            chunk_content=chunk_content,
            embedding=embedding,
            embedding_model=settings.embedding_model,
            created_at=now,
            updated_at=now,
        ).on_conflict_do_update(
            index_elements=["recipe_id", "chunk_type"],
            set_={
                "chunk_content": chunk_content,
                "embedding": embedding,
                "embedding_model": settings.embedding_model,
                "updated_at": now,
            },
        )
        await db.execute(stmt)

    await db.commit()


async def index_all_recipes() -> None:
    """
    Chay theo batch de tranh qua tai Gemini API rate limit.
    Gemini Embedding API co rate limit khoang 1500 requests/phut o free tier.
    """
    BATCH_SIZE = 10  # ke hoach: moi recipe 2 chunk = 20 API calls/batch de an toan

    async with AsyncSessionLocal() as db:
        embedding_svc = EmbeddingService(settings)
        recipes = await _load_all_recipes_with_foods(db)

        print(f"Found {len(recipes)} recipes to index")

        for i in range(0, len(recipes), BATCH_SIZE):
            batch = recipes[i:i + BATCH_SIZE]
            tasks = [_index_single_recipe(db, embedding_svc, recipe) for recipe in batch]
            await asyncio.gather(*tasks)
            print(f"Indexed {min(i + BATCH_SIZE, len(recipes))}/{len(recipes)} recipes")
            # Tranh rate limit: delay nho giua cac batch
            await asyncio.sleep(0.5)

    print("Indexing complete")


if __name__ == "__main__":
    asyncio.run(index_all_recipes())
