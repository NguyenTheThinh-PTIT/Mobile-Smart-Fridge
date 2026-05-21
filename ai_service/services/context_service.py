import asyncio
import json
from datetime import date

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from ai_service.config import Settings
from ai_service.models.orm_models import (
    HouseholdMember,
    Inventory,
    InventoryBatch,
    Food,
    User,
)
from ai_service.schemas.suggestion_schema import SuggestionContext, WeatherContext
from ai_service.services.weather_service import WeatherService


def _parse_text_list(val: str | None) -> list[str]:
    # allergies, diets, tastes duoc luu la TEXT (JSON string) trong DB, khong phai JSONB
    # parse loi an toan: tra ve list rong neu du lieu bi hong
    if not val:
        return []
    try:
        result = json.loads(val)
        return result if isinstance(result, list) else []
    except (ValueError, TypeError):
        return []


class ContextService:

    def __init__(
        self,
        db: AsyncSession,
        weather_service: WeatherService,
        settings: Settings,
    ) -> None:
        self.db = db
        self.weather_service = weather_service
        self.settings = settings

    async def build_context(
        self,
        household_id: int,
        meal_type: str,
        lat: float,
        lon: float,
        max_cook_minutes: int | None,
    ) -> SuggestionContext:
        # AsyncSession khong cho phep nhieu query DB chay dong thoi tren cung session.
        # Vi vay chi weather API chay song song, con truy van DB can chay tuan tu de on dinh.
        weather_task = asyncio.create_task(self.weather_service.get_weather(lat, lon))

        members = await self._get_members_with_preferences(household_id)
        inventory_batches = await self._get_available_inventory(household_id)
        recent_recipe_ids = await self._get_recent_recipe_ids(household_id, days=3)
        weather = await weather_task

        # Union allergies va diets cua TAT CA thanh vien
        # Dung union thay vi intersection: mot thanh vien di ung la du de loai mon do,
        # bo qua nguoi di ung se tao rui ro suc khoe - day la business constraint cung
        combined_allergies: set[str] = set()
        combined_diets: set[str] = set()
        combined_tastes: list[str] = []

        for member in members:
            # user_preference truy cap qua user.user_preference (thong qua profile_id)
            pref = member.user.user_preference if member.user else None
            if pref:
                combined_allergies.update(_parse_text_list(pref.allergies))
                combined_diets.update(_parse_text_list(pref.diets))
                combined_tastes.extend(_parse_text_list(pref.tastes))

        # Gop cac batch khac nhau cua cung loai food de co tong so luong
        inventory_map: dict[int, float] = {}
        food_id_to_name: dict[int, str] = {}
        expiring_soon_ids: set[int] = set()

        for batch in inventory_batches:
            inventory_map[batch.food_id] = inventory_map.get(batch.food_id, 0.0) + batch.quantity
            food_id_to_name[batch.food_id] = batch.food.name
            if batch.expiration_date:
                days_left = (batch.expiration_date - date.today()).days
                if 0 <= days_left <= self.settings.expiring_threshold_days:
                    expiring_soon_ids.add(batch.food_id)

        return SuggestionContext(
            household_id=household_id,
            meal_type=meal_type,
            combined_allergies=list(combined_allergies),
            combined_diets=list(combined_diets),
            combined_tastes=combined_tastes,
            inventory_map=inventory_map,
            food_id_to_name=food_id_to_name,
            expiring_soon_ids=expiring_soon_ids,
            recent_recipe_ids=recent_recipe_ids,
            weather=weather,
            max_cook_minutes=max_cook_minutes,
        )

    async def _get_members_with_preferences(self, household_id: int) -> list[HouseholdMember]:
        # Join HouseholdMember -> User -> UserPreference qua profile_id
        # User.profile_id la FK ngoc den UserPreference.id (thiet ke circular dependency cua backend)
        stmt = (
            select(HouseholdMember)
            .join(User, User.id == HouseholdMember.user_id)
            .options(
                selectinload(HouseholdMember.user).selectinload(User.user_preference)
            )
            .where(HouseholdMember.household_id == household_id)
        )
        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    async def _get_available_inventory(self, household_id: int) -> list[InventoryBatch]:
        # Chi lay batch con Available va LowStock, bo qua Expired
        # Expired batch van con trong DB cho muc dich audit, khong nen dung de nau an
        stmt = (
            select(InventoryBatch)
            .join(Inventory, Inventory.id == InventoryBatch.inventory_id)
            .join(Food, Food.id == InventoryBatch.food_id)
            .options(selectinload(InventoryBatch.food))
            .where(
                Inventory.household_id == household_id,
                InventoryBatch.status.in_(["Available", "LowStock"]),
                InventoryBatch.quantity > 0,
            )
            .order_by(InventoryBatch.expiration_date.asc())
        )
        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    async def _get_recent_recipe_ids(self, household_id: int, days: int) -> list[int]:
        # Dung ten bang thuc te (singular): meal, meal_dish, dish
        # Tranh goi y mon da nau de giam cam giac nham chan
        from sqlalchemy import text
        sql = text("""
            SELECT DISTINCT d.recipe_id
            FROM meal m
            JOIN meal_dish md ON md.meal_id = m.id
            JOIN dish d ON d.id = md.dish_id
            WHERE m.household_id = :household_id
                            AND m.schedule_date >= CURRENT_DATE - make_interval(days => :days)
              AND m.status = 'Completed'
              AND d.recipe_id IS NOT NULL
        """)
        result = await self.db.execute(sql, {"household_id": household_id, "days": days})
        return [row[0] for row in result.all()]
