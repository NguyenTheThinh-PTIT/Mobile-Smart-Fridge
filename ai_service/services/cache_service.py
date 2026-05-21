import hashlib
import json
from pydantic import ValidationError

from ai_service.config import Settings
from ai_service.schemas.suggestion_schema import SuggestionContext, SuggestionResponse


class CacheService:

    def __init__(self, redis, settings: Settings) -> None:
        self.redis = redis
        self.settings = settings

    def build_suggestion_cache_key(self, ctx: SuggestionContext) -> str:
        # Hash cac yeu to quyet dinh ket qua goi y.
        # Khong hash timestamp vi goi y trong 2 gio voi cung context nen tra ket qua giong nhau.
        # Khong hash weather.temp_c ma hash weather.season_hint de tranh miss cache
        # khi nhiet do thay doi nho trong cung dieu kien (vi du 27C va 28C deu la 'normal').
        payload = {
            "household_id": ctx.household_id,
            "meal_type": ctx.meal_type,
            "inventory_snapshot": sorted(
                (fid, round(qty, 2)) for fid, qty in ctx.inventory_map.items()
            ),
            "allergies": sorted(ctx.combined_allergies),
            "diets": sorted(ctx.combined_diets),
            "weather_hint": ctx.weather.season_hint,
            "max_cook_minutes": ctx.max_cook_minutes,
        }
        digest = hashlib.md5(json.dumps(payload, sort_keys=True).encode()).hexdigest()
        return f"suggestion:{digest}"

    async def get_suggestion_cache(self, key: str) -> SuggestionResponse | None:
        raw = await self.redis.get(key)
        if raw:
            try:
                return SuggestionResponse.model_validate_json(raw)
            except ValidationError:
                await self.redis.delete(key)
                return None
        return None

    async def set_suggestion_cache(self, key: str, response: SuggestionResponse) -> None:
        await self.redis.setex(
            key,
            self.settings.suggestion_cache_ttl_seconds,
            response.model_dump_json(),
        )
