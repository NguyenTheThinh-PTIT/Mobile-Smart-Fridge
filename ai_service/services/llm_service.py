import asyncio
import json
import re

import google.generativeai as genai

from ai_service.config import Settings
from ai_service.models.orm_models import Recipe
from ai_service.schemas.suggestion_schema import CoverageResult, SuggestionContext, SuggestionReason


class LLMResponseParseError(Exception):
    """LLM tra ve phan hoi khong phai JSON hop le."""


SYSTEM_PROMPT = (
    "Ban la tro ly goi y mon an thong minh trong ung dung quan ly thuc pham. "
    "Nhiem vu cua ban la viet ly do goi y ngan gon, tu nhien, than thien (2-3 cau) cho moi mon. "
    "Tra ve chi JSON, khong them bat ky van ban nao khac ngoai JSON. "
    "Format bat buoc: "
    '{"suggestions": [{"recipe_id": <int>, "reason": "<string>", "highlight": "<string>"}]}'
)


class LLMService:

    def __init__(self, settings: Settings) -> None:
        genai.configure(api_key=settings.gemini_api_key)
        self.model_name = settings.llm_model

    async def generate_reasons(
        self,
        scored_recipes: list[CoverageResult],
        recipes_meta: dict[int, Recipe],
        ctx: SuggestionContext,
    ) -> list[SuggestionReason]:
        # LLM chi duoc goi SAU KHI hard filter, retrieval, va scoring hoan thanh
        # Input cho LLM la top 10 Recipe da duoc loc va xep hang
        # Muc dich: giu cho LLM focus vao viec sinh ngon ngu tu nhien, khong phai chon lua Recipe
        user_content = self._build_user_prompt(scored_recipes, recipes_meta, ctx)

        response = await asyncio.to_thread(self._call_gemini_sync, user_content)
        raw_text = response.text

        # Gemini co the wrap JSON trong markdown code block du da yeu cau khong lam vay
        # Strip markdown fence de dam bao parse thanh cong
        cleaned = re.sub(r"```(?:json)?|```", "", raw_text).strip()

        try:
            data = json.loads(cleaned)
        except json.JSONDecodeError as exc:
            raise LLMResponseParseError(
                f"LLM returned non-JSON response: {raw_text[:200]}"
            ) from exc

        return [
            SuggestionReason(
                recipe_id=item["recipe_id"],
                reason=item["reason"],
                highlight=item["highlight"],
            )
            for item in data.get("suggestions", [])
        ]

    def _call_gemini_sync(self, user_content: str) -> object:
        model = genai.GenerativeModel(
            model_name=self.model_name,
            system_instruction=SYSTEM_PROMPT,
        )
        return model.generate_content(user_content)

    def _build_user_prompt(
        self,
        scored_recipes: list[CoverageResult],
        recipes_meta: dict[int, Recipe],
        ctx: SuggestionContext,
    ) -> str:
        recipe_list = []
        for sr in scored_recipes:
            meta = recipes_meta.get(sr.recipe_id)
            if not meta:
                continue
            recipe_list.append({
                "recipe_id": sr.recipe_id,
                "name": meta.name,
                "cook_time_minutes": meta.cook_time_minutes,
                "difficulty": meta.difficulty,
                "is_fully_covered": sr.is_fully_covered,
                "missing_ingredients": [
                    {"name": m.food_name, "can_thieu": m.required - m.available, "don_vi": m.unit}
                    for m in sr.missing_ingredients
                ],
                "uses_expiring": sr.expiring_ingredients_used,
            })

        expiring_names = [
            ctx.food_id_to_name[fid]
            for fid in ctx.expiring_soon_ids
            if fid in ctx.food_id_to_name
        ]

        return (
            f"Thong tin ngu canh:\n"
            f"- Bua: {ctx.meal_type}\n"
            f"- Thoi tiet: {ctx.weather.description}, {ctx.weather.temp_c} do C\n"
            f"- Che do an: {', '.join(ctx.combined_diets) or 'khong gioi han'}\n"
            f"- Nguyen lieu sap het han can uu tien dung: {', '.join(expiring_names)}\n\n"
            f"Danh sach mon an can giai thich ly do goi y:\n"
            f"{json.dumps(recipe_list, ensure_ascii=False, indent=2)}"
        )
