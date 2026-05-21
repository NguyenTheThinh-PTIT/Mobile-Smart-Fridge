# Prompt sinh code: AI Service - Tinh nang Goi y mon an

## 1. Boi canh du an

He thong quan ly thuc pham thong minh (Smart Food Management) dang van hanh mot backend chinh
ket noi vao PostgreSQL. Nhiem vu la tao them mot **AI Service doc lap** viet bang Python, ket noi
vao **cung mot database PostgreSQL do** (read-heavy, khong ghi vao bang nghiep vu chinh), expose
REST API rieng cho tinh nang goi y mon an.

AI Service chi duoc phep ghi vao cac bang do chinh no tao ra (recipe_embeddings va cac bang AI-specific).

---

## 2. Bien moi truong bat buoc

```env
# Google Gemini
GEMINI_API_KEY=

# Model config
# gemini-embedding-001 tra ve vector 3072 chieu theo tai lieu chinh thuc cua Google
EMBEDDING_MODEL=models/gemini-embedding-001
LLM_MODEL=gemini-2.5-flash
EMBEDDING_DIMENSION=3072

# TOP_K_RETRIEVAL: so luong candidate lay tu hybrid search truoc khi soft scoring
# Gia tri 20 can bang giua chat luong va latency - du rong de tim du 5+5 mon
TOP_K_RETRIEVAL=20

# PostgreSQL dung chung voi backend chinh
DATABASE_URL=postgresql+asyncpg://user:pass@host:5432/dbname

# Redis dung rieng cho WeatherCache (TTL 30 phut) va SuggestionSession cache (TTL 2 gio)
REDIS_URL=redis://localhost:6379/0

# OpenWeatherMap
OPENWEATHER_API_KEY=

# Service port tach biet khoi backend chinh
AI_SERVICE_PORT=8001
```

---

## 3. Cau truc thu muc can tao

```
ai_service/
    __init__.py
    main.py
    config.py
    dependencies.py
    models/
        __init__.py
        database.py
        orm_models.py
        schema_additions.sql
    routers/
        __init__.py
        suggestion.py
    services/
        __init__.py
        context_service.py
        filter_service.py
        retrieval_service.py
        embedding_service.py
        llm_service.py
        weather_service.py
        cache_service.py
    schemas/
        __init__.py
        suggestion_schema.py
    scripts/
        index_recipes.py
    requirements.txt
    .env.example
```

---

## 4. Database schema hien co (chi doc)

### 4.1 Cac bang chinh can JOIN

```sql
-- Bang "user" phai duoc quote vi 'user' la tu khoa trong PostgreSQL
"user" (id, email, fullname, google_oauth_token, created_at, updated_at, profile_id)

-- allergies, diets, tastes la TEXT (luu JSON string), KHONG phai JSONB
-- weight_goal KHONG ton tai trong bang nay
user_preference (id, user_id INT FK, cooking_skill_level VARCHAR(255),
                 allergies TEXT, diets TEXT, tastes TEXT)

household (id, name VARCHAR(255), created_at TIMESTAMP)
-- joined_at KHONG ton tai trong bang nay
household_member (id, user_id INT FK, household_id INT FK, role_id INT FK)

-- inventory KHONG co truong 'name'
inventory (id, household_id INT FK)
inventory_batch (
    id, inventory_id INT FK, food_id INT FK,
    quantity FLOAT8, unit VARCHAR(50),
    entry_date DATE, expiration_date DATE,
    status VARCHAR(100),
    storage_section VARCHAR(255),
    is_bought BOOLEAN
)
-- status values: 'Available' | 'LowStock' | 'Expired'

food (id, name VARCHAR(255), default_shelf_life_day INT, category_id INT FK)
category (id, name VARCHAR(255))

recipe (
    id, name VARCHAR(255), instructions TEXT,
    cook_time_minutes INT, difficulty VARCHAR(100)
)
recipe_food (id, recipe_id INT FK, food_id INT FK, require_quantity FLOAT8, unit VARCHAR(50))

-- Dung de xac dinh lich su nau an: meal.schedule_date + meal.status = 'Completed'
-- khong can them truong nao vao bang nay
meal (
    id, household_id INT FK, meal_type VARCHAR(100),
    schedule_date DATE, schedule_time TIMESTAMP, status VARCHAR(100)
)
-- meal_dish KHONG co truong total_calories
meal_dish (id, meal_id INT FK, dish_id INT FK, note TEXT)
dish (id, dish_type VARCHAR(100), name VARCHAR(255), description TEXT,
      image_url VARCHAR(255), calories INT, recipe_id INT FK)
```

### 4.2 Query xac dinh lich su nau an

De tranh goi y mon da nau trong 3 ngay gan nhat, dung query sau:

```sql
SELECT DISTINCT d.recipe_id
FROM meal m
JOIN meal_dish md ON md.meal_id = m.id
JOIN dish d ON d.id = md.dish_id
WHERE m.household_id = :household_id
  AND m.schedule_date >= CURRENT_DATE - INTERVAL ':days days'
  AND m.status = 'Completed'
  AND d.recipe_id IS NOT NULL
```

meal.schedule_date va meal.status = 'Completed' da du de xac dinh lich su - khong them cot
nao vao bang nay.

---

## 5. Schema bo sung do AI Service tao ra

### File: `models/schema_additions.sql`

AI Service tu chay migration nay khi khoi dong lan dau. Toan bo SQL phai idempotent.

```sql
CREATE EXTENSION IF NOT EXISTS vector;

-- pg_trgm phu vu trigram similarity search cho sparse leg cua hybrid search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Bo sung truong AI-specific vao bang recipe (idempotent)
ALTER TABLE recipe ADD COLUMN IF NOT EXISTS cuisine_type VARCHAR(100);
ALTER TABLE recipe ADD COLUMN IF NOT EXISTS season_tags JSONB DEFAULT '[]';
ALTER TABLE recipe ADD COLUMN IF NOT EXISTS meal_type_tags JSONB DEFAULT '[]';
ALTER TABLE recipe ADD COLUMN IF NOT EXISTS diet_compatible JSONB DEFAULT '[]';
ALTER TABLE recipe ADD COLUMN IF NOT EXISTS allergen_contains JSONB DEFAULT '[]';
ALTER TABLE recipe ADD COLUMN IF NOT EXISTS min_serving INT DEFAULT 1;
ALTER TABLE recipe ADD COLUMN IF NOT EXISTS max_serving INT DEFAULT 10;

-- Moi Recipe co 2 chunk: overview (semantic matching) va ingredients (keyword matching)
-- Vector duoc luu truc tiep trong PostgreSQL qua pgvector, khong can vector DB ngoai
-- Thiet ke nay don gian hoa infrastructure ma van dat chat luong retrieval tot voi dataset
-- quy mo vua (< 100k recipes) nhu trong du an nay
CREATE TABLE IF NOT EXISTS recipe_embeddings (
    id              SERIAL PRIMARY KEY,
    recipe_id       INT NOT NULL REFERENCES recipe(id) ON DELETE CASCADE,
    chunk_type      VARCHAR(20) NOT NULL CHECK (chunk_type IN ('overview', 'ingredients')),
    chunk_content   TEXT NOT NULL,
    embedding       vector(3072),
    embedding_model VARCHAR(100) NOT NULL,
    created_at      TIMESTAMP DEFAULT NOW(),
    updated_at      TIMESTAMP DEFAULT NOW(),
    UNIQUE (recipe_id, chunk_type)
);

-- HNSW index cho hieu nang cao hon IVFFlat o dataset nho-vua vi khong can training step
-- m=16 va ef_construction=128 la gia tri can bang giua build time va recall@10
CREATE INDEX IF NOT EXISTS idx_recipe_embeddings_vector
    ON recipe_embeddings
    USING hnsw (embedding vector_cosine_ops)
    WITH (m = 16, ef_construction = 128);

-- GIN index cho trigram search tren chunk_content (sparse leg)
CREATE INDEX IF NOT EXISTS idx_recipe_embeddings_trgm
    ON recipe_embeddings
    USING gin (chunk_content gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_recipe_embeddings_recipe_id
    ON recipe_embeddings (recipe_id);
```

---

## 6. Yeu cau chi tiet tung file

### 6.1 `config.py`

Su dung `pydantic-settings` de load va validate toan bo bien moi truong.
Raise loi ro rang khi thieu bien bat buoc thay vi de loi am tham o runtime.

```python
from pydantic_settings import BaseSettings
from pydantic import Field

class Settings(BaseSettings):
    gemini_api_key: str
    embedding_model: str = "models/gemini-embedding-001"
    llm_model: str = "gemini-2.5-flash"
    embedding_dimension: int = 3072
    top_k_retrieval: int = 20

    database_url: str
    redis_url: str = "redis://localhost:6379/0"
    openweather_api_key: str
    ai_service_port: int = 8001

    # 30 phut du tuoi cho du bao thoi tiet nhung tranh goi API lien tuc
    weather_cache_ttl_seconds: int = Field(default=1800)

    # 2 gio: kho thuc pham it khi thay doi trong thoi gian ngan, tranh goi LLM lap
    suggestion_cache_ttl_seconds: int = Field(default=7200)

    # Nguong "sap het han" de tinh expiring bonus trong scoring
    expiring_threshold_days: int = Field(default=3)

    class Config:
        env_file = ".env"

settings = Settings()
```

### 6.2 `models/database.py`

```python
# pool_pre_ping=True de detect connection chet truoc khi su dung, tranh loi bi an
# pool_size va max_overflow can dieu chinh theo so luong concurrent request thuc te
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from pgvector.sqlalchemy import Vector  # noqa: F401 - phai import de register custom type voi SQLAlchemy

engine = create_async_engine(
    settings.database_url,
    pool_pre_ping=True,
    pool_size=10,
    max_overflow=20,
    echo=False,
)
AsyncSessionLocal = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)
```

### 6.3 `models/orm_models.py`

Khai bao ORM mapping cho tat ca bang can dung.

Cac bang chi doc tu backend chinh:
- `Recipe` -> anh xa bang `recipe` (bao gom cac cot AI moi sau migration)
- `RecipeFood` -> anh xa bang `recipe_food`
- `Food` -> anh xa bang `food`
- `InventoryBatch` -> anh xa bang `inventory_batch`
- `Inventory` -> anh xa bang `inventory`
- `HouseholdMember` -> anh xa bang `household_member`
- `UserPreference` -> anh xa bang `user_preference`
- `User` -> anh xa bang `"user"` (can quote vi la tu khoa PostgreSQL)
- `Meal`, `MealDish`, `Dish` -> anh xa bang `meal`, `meal_dish`, `dish`

Luu y ve user_preference:
- `allergies`, `diets`, `tastes` la `TEXT` trong DB (luu JSON string),
  can parse bang `json.loads()` trong Python khi doc ra, khong phai JSONB.
- Bang `user_preference` KHONG co ` weight_goal`.
- Bang `inventory` KHONG co truong `name`.
- Bang `meal_dish` KHONG co truong `total_calories`.
- Bang `household_member` KHONG co truong `joined_at`.

Bang AI Service co quyen ghi:
- `RecipeEmbedding`

Truong `embedding` trong `RecipeEmbedding` dung type `Vector(settings.embedding_dimension)`
tu `pgvector.sqlalchemy`.

Dung `__table_args__ = {'extend_existing': True}` de tranh conflict neu backend cung dung
SQLAlchemy voi cung engine.

```python
from sqlalchemy import Column, Integer, String, Float, Boolean, Text, Date, TIMESTAMP
from sqlalchemy import JSON
from sqlalchemy.orm import DeclarativeBase, relationship
from pgvector.sqlalchemy import Vector

class Base(DeclarativeBase):
    pass

class UserPreference(Base):
    __tablename__ = "user_preference"
    __table_args__ = {"extend_existing": True}
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer)
    cooking_skill_level = Column(String(255))
    # TEXT, khong phai JSONB - phai dung json.loads() khi doc
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
    # Relationship den UserPreference qua profile_id (foreign_keys chi dinh ro)
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
    user = relationship("User", primaryjoin="HouseholdMember.user_id == User.id",
                        foreign_keys="[HouseholdMember.user_id]", lazy="raise")

class Inventory(Base):
    __tablename__ = "inventory"
    __table_args__ = {"extend_existing": True}
    id = Column(Integer, primary_key=True)
    household_id = Column(Integer)
    # KHONG co truong 'name'

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
    food = relationship("Food", primaryjoin="InventoryBatch.food_id == Food.id",
                        foreign_keys="[InventoryBatch.food_id]", lazy="raise")

class Food(Base):
    __tablename__ = "food"
    __table_args__ = {"extend_existing": True}
    id = Column(Integer, primary_key=True)
    name = Column(String(255))
    default_shelf_life_day = Column(Integer)
    category_id = Column(Integer)

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
    food = relationship("Food", primaryjoin="RecipeFood.food_id == Food.id",
                        foreign_keys="[RecipeFood.food_id]", lazy="raise")

class Meal(Base):
    __tablename__ = "meal"
    __table_args__ = {"extend_existing": True}
    id = Column(Integer, primary_key=True)
    household_id = Column(Integer)
    meal_type = Column(String(100))
    schedule_date = Column(Date)
    schedule_time = Column(TIMESTAMP)
    status = Column(String(100))

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
    embedding = Column(Vector(3072))
    embedding_model = Column(String(100))
    created_at = Column(TIMESTAMP)
    updated_at = Column(TIMESTAMP)
```

### 6.4 `services/embedding_service.py`

```python
# Gemini Embedding API yeu cau phan biet task_type:
# - RETRIEVAL_DOCUMENT: khi embed noi dung can index (Recipe) - toi uu vector space cho storage
# - RETRIEVAL_QUERY: khi embed cau query luc search - toi uu vector space cho retrieval
# Dung sai task_type lam giam chat luong cosine similarity dang ke
import google.generativeai as genai
from tenacity import retry, stop_after_attempt, wait_exponential
import asyncio

class EmbeddingService:

    def __init__(self, settings: Settings):
        genai.configure(api_key=settings.gemini_api_key)
        self.model = settings.embedding_model
        self.dimension = settings.embedding_dimension

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=10))
    async def embed_document(self, text: str) -> list[float]:
        # Wrap sync SDK call vi Gemini SDK chua ho tro async native
        result = await asyncio.to_thread(
            genai.embed_content,
            model=self.model,
            content=text,
            task_type="RETRIEVAL_DOCUMENT",
        )
        return result["embedding"]

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=10))
    async def embed_query(self, text: str) -> list[float]:
        result = await asyncio.to_thread(
            genai.embed_content,
            model=self.model,
            content=text,
            task_type="RETRIEVAL_QUERY",
        )
        return result["embedding"]
```

### 6.5 `services/weather_service.py`

```python
# Lam tron toa do den 2 chu so thap phan (~1km accuracy) truoc khi tao cache key
# de tang cache hit rate khi user di chuyen trong pham vi ngan
class WeatherService:

    async def get_weather(self, lat: float, lon: float) -> WeatherContext:
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
```

### 6.6 `services/context_service.py`

```python
# Tat ca DB query chay concurrent bang asyncio.gather de giam tong latency
# thu thap context tu ~100ms xuong con ~30-40ms
class ContextService:

    async def build_context(
        self,
        household_id: int,
        meal_type: str,
        lat: float,
        lon: float,
        max_cook_minutes: int | None,
    ) -> SuggestionContext:

        members_task = self._get_members_with_preferences(household_id)
        inventory_task = self._get_available_inventory(household_id)
        history_task = self._get_recent_recipe_ids(household_id, days=3)
        weather_task = self.weather_service.get_weather(lat, lon)

        members, inventory_batches, recent_recipe_ids, weather = await asyncio.gather(
            members_task, inventory_task, history_task, weather_task
        )

        # Union allergies va diets cua TAT CA thanh vien
        # Dung union thay vi intersection: mot thanh vien di ung la du de loai mon do,
        # bo qua nguoi di ung se tao rui ro suc khoe - day la business constraint cung
        combined_allergies: set[str] = set()
        combined_diets: set[str] = set()
        combined_tastes: list[str] = []
        for member in members:
            # user_preference duoc truy cap qua user.user_preference (thong qua profile_id)
            pref = member.user.user_preference if member.user else None
            if pref:
                # allergies, diets, tastes la TEXT trong DB, phai parse JSON truoc khi dung
                # Backend luu la JSON string ("[\"egg\", \"milk\"]"), khong phai JSONB
                import json as _json
                def _parse_text_list(val) -> list:
                    if not val:
                        return []
                    try:
                        return _json.loads(val)
                    except (ValueError, TypeError):
                        return []

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
        return result.scalars().all()

    async def _get_members_with_preferences(self, household_id: int):
        # Join HouseholdMember -> User -> UserPreference qua profile_id
        # User.profile_id la FK den UserPreference.id (thiet ke circular dependency cua backend)
        from sqlalchemy.orm import selectinload
        stmt = (
            select(HouseholdMember)
            .join(User, User.id == HouseholdMember.user_id)
            .options(selectinload(HouseholdMember.user).selectinload(User.user_preference))
            .where(HouseholdMember.household_id == household_id)
        )
        result = await self.db.execute(stmt)
        return result.scalars().all()

    async def _get_recent_recipe_ids(self, household_id: int, days: int) -> list[int]:
        # Dung bang meal, meal_dish, dish voi ten bang thuc te (singular)
        from sqlalchemy import text
        sql = text("""
            SELECT DISTINCT d.recipe_id
            FROM meal m
            JOIN meal_dish md ON md.meal_id = m.id
            JOIN dish d ON d.id = md.dish_id
            WHERE m.household_id = :household_id
              AND m.schedule_date >= CURRENT_DATE - INTERVAL ':days days'
              AND m.status = 'Completed'
              AND d.recipe_id IS NOT NULL
        """)
        result = await self.db.execute(sql, {"household_id": household_id, "days": days})
        return [row[0] for row in result.all()]
```

### 6.7 `services/filter_service.py`

**Phan Hard Filter:**

```python
class FilterService:

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
            ~Recipe.allergen_contains.op("?|")(ctx.combined_allergies)
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
```

**Phan Soft Scoring:**

```python
    async def score_recipes(
        self,
        recipe_ids: list[int],
        ctx: SuggestionContext,
    ) -> list[CoverageResult]:
        """
        Tinh coverage score cho tung Recipe sau khi da qua hybrid search.
        Soft scoring khong loai bo Recipe, chi dieu chinh thu tu uu tien.
        """
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
            return CoverageResult(recipe_id=recipe_id, coverage_ratio=0.0, final_score=0.0,
                                  missing_ingredients=[], is_fully_covered=False,
                                  expiring_ingredients_used=[])

        covered = 0
        missing = []
        expiring_used = []
        expiring_bonus = 0.0

        for rf in recipe_foods:
            available = ctx.inventory_map.get(rf.food_id, 0.0)
            if available >= rf.require_quantity:
                covered += 1
                if rf.food_id in ctx.expiring_soon_ids:
                    # Moi nguyen lieu sap het han duoc su dung tang them 0.1 diem
                    # de khuyen khich chon mon giam lua phuc pham, phu hop muc tieu he thong
                    expiring_bonus += 0.1
                    expiring_used.append(ctx.food_id_to_name.get(rf.food_id, ""))
            else:
                missing.append(MissingIngredient(
                    food_name=ctx.food_id_to_name.get(rf.food_id, rf.food.name),
                    required=rf.require_quantity,
                    available=available,
                    unit=rf.unit,
                ))

        coverage_ratio = covered / len(recipe_foods)
        final_score = coverage_ratio + expiring_bonus

        return CoverageResult(
            recipe_id=recipe_id,
            coverage_ratio=coverage_ratio,
            final_score=final_score,
            missing_ingredients=missing,
            is_fully_covered=(coverage_ratio >= 1.0),
            expiring_ingredients_used=expiring_used,
        )

    @staticmethod
    def apply_weather_boost(base_score: float, recipe: Recipe, weather: WeatherContext) -> float:
        # Boost nho (0.05) de khong override coverage score
        # Nguyen lieu san co quan trong hon su phu hop thoi tiet
        if weather.season_hint in (recipe.season_tags or []):
            return base_score + 0.05
        return base_score
```

### 6.8 `services/retrieval_service.py`

Day la file phuc tap nhat. Implement Hybrid Search voi hai leg doc lap.

**Leg 1 - Dense Vector Search (Semantic):**

```python
def _build_context_query_text(self, ctx: SuggestionContext) -> str:
    """
    Xay dung text mo ta ngu canh nguoi dung de embed thanh query vector.
    Day KHONG phai cau hoi tu nhien - day la mo ta structured de Gemini embedding
    map vao cung vector space voi Recipe document (da embed voi task_type=RETRIEVAL_DOCUMENT).

    Dung tieng Viet khong dau de dong nhat voi format da dung khi index Recipe,
    giam tokenization mismatch giua index time va query time.
    """
    available_names = [
        ctx.food_id_to_name[fid]
        for fid in ctx.inventory_map
        if fid in ctx.food_id_to_name
    ]
    expiring_names = [
        ctx.food_id_to_name[fid]
        for fid in ctx.expiring_soon_ids
        if fid in ctx.food_id_to_name
    ]
    return (
        f"Can goi y mon an cho bua {ctx.meal_type}. "
        f"Thoi tiet: {ctx.weather.description}, nhiet do {ctx.weather.temp_c} do C, "
        f"dieu kien: {ctx.weather.season_hint}. "
        f"Nguyen lieu co san: {', '.join(available_names[:30])}. "
        f"Uu tien dung: {', '.join(expiring_names)} vi sap het han. "
        f"Khau vi: {', '.join(ctx.combined_tastes)}. "
        f"Che do an: {', '.join(ctx.combined_diets) or 'khong gioi han'}."
    )

async def _dense_search(
    self,
    query_vector: list[float],
    candidate_ids: list[int],
    top_k: int,
) -> list[tuple[int, float]]:
    """
    Tim Recipe co embedding gan nhat voi query vector bang cosine similarity.
    Gioi han trong candidate_ids da qua hard filter de tranh retrieve Recipe bi cam.
    Tra ve tat ca chunk type (overview va ingredients), tinh diem tong hop theo recipe_id.
    """
    sql = text("""
        SELECT
            recipe_id,
            MAX(1 - (embedding <=> :query_vector::vector)) AS cosine_similarity
        FROM recipe_embeddings
        WHERE recipe_id = ANY(:candidate_ids)
        GROUP BY recipe_id
        ORDER BY cosine_similarity DESC
        LIMIT :top_k
    """)
    result = await self.db.execute(sql, {
        "query_vector": str(query_vector),
        "candidate_ids": candidate_ids,
        "top_k": top_k,
    })
    return [(row.recipe_id, row.cosine_similarity) for row in result.all()]
```

**Leg 2 - Sparse Search (Trigram Keyword):**

```python
async def _sparse_search(
    self,
    available_food_names: list[str],
    candidate_ids: list[int],
    top_k: int,
) -> list[tuple[int, float]]:
    """
    Tim Recipe co ten nguyen lieu trung khop voi kho thuc pham bang trigram similarity.
    Chi search tren chunk_type='ingredients' vi chunk do chua danh sach nguyen lieu
    duoc chuan hoa, phu hop voi pg_trgm so sanh.

    Sparse leg bu dap cho truong hop vector search bi miss khi ten nguyen lieu rat cu the
    (vi du: "ca loc" trong inventory nhung query vector khong capture du do specific nay).
    """
    keyword_query = " ".join(available_food_names[:30])

    sql = text("""
        SELECT
            recipe_id,
            MAX(similarity(chunk_content, :keyword_query)) AS trgm_score
        FROM recipe_embeddings
        WHERE recipe_id = ANY(:candidate_ids)
          AND chunk_type = 'ingredients'
          AND chunk_content % :keyword_query
        GROUP BY recipe_id
        ORDER BY trgm_score DESC
        LIMIT :top_k
    """)
    result = await self.db.execute(sql, {
        "keyword_query": keyword_query,
        "candidate_ids": candidate_ids,
        "top_k": top_k,
    })
    return [(row.recipe_id, row.trgm_score) for row in result.all()]
```

**Reciprocal Rank Fusion:**

```python
@staticmethod
def _reciprocal_rank_fusion(
    dense_results: list[tuple[int, float]],
    sparse_results: list[tuple[int, float]],
    k: int = 60,
) -> list[int]:
    """
    Ket hop ranking tu dense va sparse leg ma khong can chuan hoa score ve cung scale.
    k=60 la hang so empirically tot duoc su dung rong rai trong cac he thong production
    (nguon: Cormack et al. 2009 "Reciprocal Rank Fusion outperforms Condorcet and individual
    Rank Learning Methods").
    RRF uu viet hon score averaging vi no khong bi anh huong boi su chenh lech scale giua
    cosine similarity (0-1) va trigram score (0-1 nhung phan phoi khac).
    """
    rrf_scores: dict[int, float] = {}

    for rank, (recipe_id, _) in enumerate(dense_results):
        rrf_scores[recipe_id] = rrf_scores.get(recipe_id, 0.0) + 1.0 / (k + rank + 1)

    for rank, (recipe_id, _) in enumerate(sparse_results):
        rrf_scores[recipe_id] = rrf_scores.get(recipe_id, 0.0) + 1.0 / (k + rank + 1)

    sorted_ids = sorted(rrf_scores.items(), key=lambda x: x[1], reverse=True)
    return [recipe_id for recipe_id, _ in sorted_ids]

async def hybrid_search(
    self,
    ctx: SuggestionContext,
    candidate_ids: list[int],
) -> list[int]:
    query_text = self._build_context_query_text(ctx)
    query_vector = await self.embedding_service.embed_query(query_text)

    available_names = list(ctx.food_id_to_name.values())
    top_k = self.settings.top_k_retrieval

    # Hai leg chay song song vi doc lap nhau, giam latency
    dense_task = self._dense_search(query_vector, candidate_ids, top_k)
    sparse_task = self._sparse_search(available_names, candidate_ids, top_k)

    dense_results, sparse_results = await asyncio.gather(dense_task, sparse_task)

    return self._reciprocal_rank_fusion(dense_results, sparse_results)
```

### 6.9 `services/llm_service.py`

```python
# LLM chi duoc goi SAU KHI hard filter, retrieval, va scoring hoan thanh
# Input cho LLM la top 10 Recipe da duoc loc va xep hang - khong phai toan bo database
# Muc dich: giu cho LLM focus vao viec sinh ngon ngu tu nhien, khong phai chon lua Recipe
# Cach tiep can nay giam context window va tang chat luong reason vi LLM khong can
# xu ly nhieu Recipe khong lien quan

import google.generativeai as genai
import json
import asyncio
import re

SYSTEM_PROMPT = (
    "Ban la tro ly goi y mon an thong minh trong ung dung quan ly thuc pham. "
    "Nhiem vu cua ban la viet ly do goi y ngan gon, tu nhien, than thien (2-3 cau) cho moi mon. "
    "Tra ve chi JSON, khong them bat ky van ban nao khac ngoai JSON. "
    "Format bat buoc: "
    '{"suggestions": [{"recipe_id": <int>, "reason": "<string>", "highlight": "<string>"}]}'
)

class LLMService:

    def __init__(self, settings: Settings):
        genai.configure(api_key=settings.gemini_api_key)
        self.model_name = settings.llm_model

    async def generate_reasons(
        self,
        scored_recipes: list[CoverageResult],
        recipes_meta: dict[int, Recipe],
        ctx: SuggestionContext,
    ) -> list[SuggestionReason]:
        user_content = self._build_user_prompt(scored_recipes, recipes_meta, ctx)

        response = await asyncio.to_thread(self._call_gemini_sync, user_content)
        raw_text = response.text

        # Gemini co the wrap JSON trong markdown code block du da yeu cau khong lam vay
        # Strip markdown fence de dam bao parse thanh cong
        cleaned = re.sub(r"```(?:json)?|```", "", raw_text).strip()

        try:
            data = json.loads(cleaned)
        except json.JSONDecodeError as exc:
            raise LLMResponseParseError(f"LLM returned non-JSON response: {raw_text[:200]}") from exc

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
```

### 6.10 `services/cache_service.py`

```python
class CacheService:

    def build_suggestion_cache_key(self, ctx: SuggestionContext) -> str:
        """
        Hash cac yeu to quyet dinh ket qua goi y.
        Khong hash timestamp vi goi y trong 2 gio voi cung context nen tra ket qua giong nhau.
        Khong hash weather.temp_c ma hash weather.season_hint de tranh miss cache
        khi nhiet do thay doi nho trong cung dieu kien (vi du 27°C va 28°C deu la 'normal').
        """
        import hashlib

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
            return SuggestionResponse.model_validate_json(raw)
        return None

    async def set_suggestion_cache(self, key: str, response: SuggestionResponse) -> None:
        await self.redis.setex(
            key,
            self.settings.suggestion_cache_ttl_seconds,
            response.model_dump_json(),
        )
```

### 6.11 `routers/suggestion.py`

```python
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
):
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

    # Load Recipe metadata de weather boost va de truyen cho LLM
    recipes_meta = await _load_recipes_meta(db, top_candidates)
    for sr in scored_recipes:
        meta = recipes_meta.get(sr.recipe_id)
        if meta:
            sr.final_score = filter_svc.apply_weather_boost(sr.final_score, meta, ctx.weather)

    fully_covered = sorted(
        [r for r in scored_recipes if r.is_fully_covered],
        key=lambda r: r.final_score, reverse=True
    )[:5]
    partially_covered = sorted(
        [r for r in scored_recipes if not r.is_fully_covered],
        key=lambda r: r.final_score, reverse=True
    )[:5]

    top_10 = fully_covered + partially_covered

    llm_svc = LLMService(settings)
    reasons = await llm_svc.generate_reasons(top_10, recipes_meta, ctx)

    response = _build_response(fully_covered, partially_covered, reasons, recipes_meta, ctx)
    await cache_svc.set_suggestion_cache(cache_key, response)
    return response
```

### 6.12 `scripts/index_recipes.py`

```python
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

async def build_overview_text(recipe, food_names: list[str]) -> str:
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

async def index_all_recipes():
    """
    Chay theo batch de tranh qua tai Gemini API rate limit.
    Gemini Embedding API co rate limit khoang 1500 requests/phut o free tier.
    """
    BATCH_SIZE = 10

    async with AsyncSessionLocal() as db:
        embedding_svc = EmbeddingService(settings)
        recipes = await _load_all_recipes_with_foods(db)

        for i in range(0, len(recipes), BATCH_SIZE):
            batch = recipes[i:i + BATCH_SIZE]
            tasks = [_index_single_recipe(db, embedding_svc, recipe) for recipe in batch]
            await asyncio.gather(*tasks)
            print(f"Indexed {min(i + BATCH_SIZE, len(recipes))}/{len(recipes)} recipes")
            # Tranh rate limit: delay nho giua cac batch
            await asyncio.sleep(0.5)
```

---

## 7. Pydantic Schemas

### `schemas/suggestion_schema.py`

```python
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
    coverage_ratio: float
    missing_ingredients: list[MissingIngredient]
    uses_expiring_ingredients: list[str]
    reason: str       # Sinh boi LLM
    highlight: str    # Sinh boi LLM

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
        return [self.food_id_to_name[fid] for fid in self.expiring_soon_ids
                if fid in self.food_id_to_name]

    class Config:
        arbitrary_types_allowed = True
```

---

## 8. Requirements

```text
# requirements.txt
fastapi>=0.111.0
uvicorn[standard]>=0.30.0
sqlalchemy>=2.0.0
asyncpg>=0.29.0
pgvector>=0.3.0
pydantic>=2.7.0
pydantic-settings>=2.3.0
google-generativeai>=0.7.0
redis[hiredis]>=5.0.0
httpx>=0.27.0
tenacity>=8.3.0
python-dotenv>=1.0.0
```

---

## 9. Quy tac code bat buoc

1. **Comment style - WHY not WHAT**: Moi comment phai giai thich ly do thiet ke, trade-off, hoac gioi han. Khong giai thich dieu code da tu noi. Vi du sai: `# Lay danh sach thanh vien`. Vi du dung: `# Union allergies thay vi intersection vi mot thanh vien di ung la du de loai mon, bo qua se tao rui ro suc khoe`.

2. **Khong dung emoji**: Trong bat ky string, comment, log, hay message nao.

3. **Async toan phan**: Moi I/O phai dung async/await. Wrap sync SDK call bang `asyncio.to_thread()`.

4. **Error handling ro rang**: Dinh nghia custom exception class. HTTP error tra ve JSON co truong `detail`. Khong raise bare `Exception`.

5. **Type hint day du**: Moi function phai co type hint cho tat ca parameter va return type, ke ca `self`.

6. **Khong hard-code gia tri**: Moi gia tri co the thay doi phai den tu `settings`. Khong co magic number trong business logic.

7. **Idempotent migration**: SQL trong `schema_additions.sql` phai dung `IF NOT EXISTS` va `ADD COLUMN IF NOT EXISTS` de co the chay lai an toan.

8. **No N+1 query**: Khi load quan he (Recipe -> RecipeFood -> Food), phai dung `selectinload` hoac query batch, khong loop tung record.

---

## 10. Thu tu implement de xuat

```
Buoc 1: config.py -> models/database.py -> models/schema_additions.sql
Buoc 2: models/orm_models.py
Buoc 3: schemas/suggestion_schema.py
Buoc 4: services/embedding_service.py
Buoc 5: scripts/index_recipes.py  [test embedding pipeline ngay]
Buoc 6: services/weather_service.py + services/cache_service.py
Buoc 7: services/context_service.py
Buoc 8: services/filter_service.py (phan hard filter)
Buoc 9: services/retrieval_service.py (hybrid search)
Buoc 10: services/filter_service.py (phan soft scoring, bo sung vao file cu)
Buoc 11: services/llm_service.py
Buoc 12: routers/suggestion.py + main.py + dependencies.py
Buoc 13: Test end-to-end voi du lieu thuc
```