from pydantic import BaseModel
from datetime import datetime
from typing import Literal


class MissingIngredient(BaseModel):
    food_name: str
    required: float
    available: float
    unit: str


class SuggestedRecipe(BaseModel):
    recipe_id: int
    recipe_name: str
    cook_time_minutes: int
    difficulty: str
    cuisine_type: str
    coverage_ratio: float
    missing_ingredients: list[MissingIngredient]
    available_ingredients: list[str] = []
    uses_expiring_ingredients: list[str]
    reason: str       # Sinh boi LLM
    highlight: str    # Sinh boi LLM
    allergy_overlap: list[str] = []
    warning_message: str | None = None


class SuggestionResponse(BaseModel):
    fully_covered: list[SuggestedRecipe]
    partially_covered: list[SuggestedRecipe]
    weather_context: str
    generated_at: datetime


class WeatherContext(BaseModel):
    temp_c: float
    main: str
    description: str
    season_hint: Literal["cold", "hot", "rainy", "normal"]


class SuggestionContext(BaseModel):
    household_id: int
    meal_type: str
    combined_allergies: list[str]
    combined_diets: list[str]
    combined_tastes: list[str]
    inventory_map: dict[int, float]
    food_id_to_name: dict[int, str]
    expiring_soon_ids: set[int]
    recent_recipe_ids: list[int]
    weather: WeatherContext
    max_cook_minutes: int | None

    @property
    def expiring_food_names(self) -> list[str]:
        return [
            self.food_id_to_name[fid]
            for fid in self.expiring_soon_ids
            if fid in self.food_id_to_name
        ]

    class Config:
        arbitrary_types_allowed = True


class CoverageResult(BaseModel):
    """Ket qua soft scoring cho mot Recipe sau hybrid search."""
    recipe_id: int
    coverage_ratio: float
    final_score: float
    missing_ingredients: list[MissingIngredient]
    available_ingredients: list[str] = []
    is_fully_covered: bool
    expiring_ingredients_used: list[str]


class SuggestionReason(BaseModel):
    """Ly do goi y sinh boi LLM cho mot Recipe."""
    recipe_id: int
    reason: str
    highlight: str


class RecipeSearchItem(BaseModel):
    recipe_id: int
    recipe_name: str
    cook_time_minutes: int
    difficulty: str
    cuisine_type: str
    allergy_overlap: list[str]
    warning_message: str | None


class RecipeSearchResponse(BaseModel):
    query: str
    household_id: int
    total: int
    results: list[RecipeSearchItem]
