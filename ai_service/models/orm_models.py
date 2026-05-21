from sqlalchemy import Column, Integer, String, Float, Boolean, Text, Date, TIMESTAMP, JSON
from sqlalchemy.orm import DeclarativeBase, relationship
from pgvector.sqlalchemy import Vector

from ai_service.config import settings


class Base(DeclarativeBase):
    pass


class UserPreference(Base):
    __tablename__ = "user_preference"
    __table_args__ = {"extend_existing": True}

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer)
    cooking_skill_level = Column(String(255))
    # TEXT trong DB (luu JSON string), KHONG phai JSONB
    # phai dung json.loads() khi doc ra
    allergies = Column(Text)
    diets = Column(Text)
    tastes = Column(Text)


class User(Base):
    # 'user' la reserved word trong PostgreSQL, phai quote
    __tablename__ = "user"
    __table_args__ = {"extend_existing": True}

    id = Column(Integer, primary_key=True)
    email = Column(String(255))
    fullname = Column(String(255))
    google_oauth_token = Column(String(255))
    created_at = Column(TIMESTAMP)
    updated_at = Column(TIMESTAMP)
    # profile_id la FK ngoc den user_preference.id (circular dependency cua backend)
    profile_id = Column(Integer)

    # Relationship den UserPreference qua profile_id
    # Dung primaryjoin tuong minh vi day la quan he nguoc chieu (User -> UserPreference)
    user_preference = relationship(
        "UserPreference",
        primaryjoin="User.profile_id == UserPreference.id",
        foreign_keys="[User.profile_id]",
        uselist=False,
        lazy="raise",
    )


class HouseholdMember(Base):
    __tablename__ = "household_member"
    __table_args__ = {"extend_existing": True}

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer)
    household_id = Column(Integer)
    role_id = Column(Integer)
    # KHONG co joined_at

    user = relationship(
        "User",
        primaryjoin="HouseholdMember.user_id == User.id",
        foreign_keys="[HouseholdMember.user_id]",
        lazy="raise",
    )


class Inventory(Base):
    __tablename__ = "inventory"
    __table_args__ = {"extend_existing": True}

    id = Column(Integer, primary_key=True)
    household_id = Column(Integer)
    # KHONG co truong 'name'


class Food(Base):
    __tablename__ = "food"
    __table_args__ = {"extend_existing": True}

    id = Column(Integer, primary_key=True)
    name = Column(String(255))
    default_shelf_life_day = Column(Integer)
    category_id = Column(Integer)


class InventoryBatch(Base):
    __tablename__ = "inventory_batch"
    __table_args__ = {"extend_existing": True}

    id = Column(Integer, primary_key=True)
    inventory_id = Column(Integer)
    food_id = Column(Integer)
    quantity = Column(Float)
    unit = Column(String(50))
    entry_date = Column(Date)
    expiration_date = Column(Date)
    status = Column(String(100))
    storage_section = Column(String(255))
    is_bought = Column(Boolean)

    food = relationship(
        "Food",
        primaryjoin="InventoryBatch.food_id == Food.id",
        foreign_keys="[InventoryBatch.food_id]",
        lazy="raise",
    )


class Recipe(Base):
    __tablename__ = "recipe"
    __table_args__ = {"extend_existing": True}

    id = Column(Integer, primary_key=True)
    name = Column(String(255))
    instructions = Column(Text)
    cook_time_minutes = Column(Integer)
    difficulty = Column(String(100))
    # Cac cot AI them vao qua schema_additions.sql
    cuisine_type = Column(String(100))
    season_tags = Column(JSON)
    meal_type_tags = Column(JSON)
    diet_compatible = Column(JSON)
    allergen_contains = Column(JSON)
    min_serving = Column(Integer)
    max_serving = Column(Integer)


class RecipeFood(Base):
    __tablename__ = "recipe_food"
    __table_args__ = {"extend_existing": True}

    id = Column(Integer, primary_key=True)
    recipe_id = Column(Integer)
    food_id = Column(Integer)
    require_quantity = Column(Float)
    unit = Column(String(50))

    food = relationship(
        "Food",
        primaryjoin="RecipeFood.food_id == Food.id",
        foreign_keys="[RecipeFood.food_id]",
        lazy="raise",
    )


class Meal(Base):
    __tablename__ = "meal"
    __table_args__ = {"extend_existing": True}

    id = Column(Integer, primary_key=True)
    household_id = Column(Integer)
    meal_type = Column(String(100))
    schedule_date = Column(Date)
    schedule_time = Column(TIMESTAMP)
    status = Column(String(100))


class MealAttendance(Base):
    __tablename__ = "meal_attendance"
    __table_args__ = {"extend_existing": True}

    id = Column(Integer, primary_key=True)
    meal_id = Column(Integer)
    user_id = Column(Integer)
    status = Column(String(100))
    is_guest = Column(Boolean)


class MealDish(Base):
    __tablename__ = "meal_dish"
    __table_args__ = {"extend_existing": True}

    id = Column(Integer, primary_key=True)
    meal_id = Column(Integer)
    dish_id = Column(Integer)
    note = Column(Text)
    # KHONG co total_calories


class Dish(Base):
    __tablename__ = "dish"
    __table_args__ = {"extend_existing": True}

    id = Column(Integer, primary_key=True)
    dish_type = Column(String(100))
    name = Column(String(255))
    description = Column(Text)
    image_url = Column(String(255))
    calories = Column(Integer)
    recipe_id = Column(Integer)


class RecipeEmbedding(Base):
    # Bang do AI Service tao ra, duoc phep ghi
    __tablename__ = "recipe_embeddings"
    __table_args__ = {"extend_existing": True}

    id = Column(Integer, primary_key=True)
    recipe_id = Column(Integer)
    chunk_type = Column(String(20))
    chunk_content = Column(Text)
    # kich thuoc phai khop voi EMBEDDING_DIMENSION trong config
    embedding = Column(Vector(settings.embedding_dimension))
    embedding_model = Column(String(100))
    created_at = Column(TIMESTAMP)
    updated_at = Column(TIMESTAMP)
