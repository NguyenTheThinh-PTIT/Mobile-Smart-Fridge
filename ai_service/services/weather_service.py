import httpx

from ai_service.config import Settings
from ai_service.schemas.suggestion_schema import WeatherContext


class WeatherService:

    def __init__(self, redis, settings: Settings) -> None:
        self.redis = redis
        self.settings = settings

    async def get_weather(self, lat: float, lon: float) -> WeatherContext:
        # Lam tron toa do den 2 chu so thap phan (~1km accuracy) truoc khi tao cache key
        # de tang cache hit rate khi user di chuyen trong pham vi ngan
        cache_key = f"weather:{round(lat, 2)}:{round(lon, 2)}"

        cached = await self.redis.get(cache_key)
        if cached:
            return WeatherContext.model_validate_json(cached)

        raw = await self._fetch_openweather(lat, lon)
        context = self._parse_weather_response(raw)

        await self.redis.setex(
            cache_key,
            self.settings.weather_cache_ttl_seconds,
            context.model_dump_json(),
        )
        return context

    async def _fetch_openweather(self, lat: float, lon: float) -> dict:
        url = "https://api.openweathermap.org/data/2.5/weather"
        params = {
            "lat": lat,
            "lon": lon,
            "appid": self.settings.openweather_api_key,
            "units": "metric",
        }
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(url, params=params)
            response.raise_for_status()
            return response.json()

    def _parse_weather_response(self, raw: dict) -> WeatherContext:
        temp = raw["main"]["temp"]
        main = raw["weather"][0]["main"]
        description = raw["weather"][0]["description"]

        # Mapping thoi tiet sang season_hint de match voi season_tags trong Recipe
        # Nguong nhiet do dua tren cam nhan thuc te cua nguoi Viet Nam, khong phai tieu chuan khi
        # tuong: < 20 do C cam thay lanh, > 33 do C cam thay rat nong
        if temp < 20:
            season_hint = "cold"
        elif temp > 33:
            season_hint = "hot"
        elif main == "Rain":
            season_hint = "rainy"
        else:
            season_hint = "normal"

        return WeatherContext(
            temp_c=temp,
            main=main,
            description=description,
            season_hint=season_hint,
        )
