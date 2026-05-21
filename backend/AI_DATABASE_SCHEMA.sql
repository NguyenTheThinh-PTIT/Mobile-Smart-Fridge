-- Fridge AI - Current database schema snapshot
-- Source: Flyway migrations V1__init_users_roles.sql -> V8__create_household_invite.sql
-- Purpose: provide a single SQL file that describes the current database structure
-- Notes:
-- - This file reflects the schema currently present in the repository migrations.
-- - It does not add indexes, triggers, or extra tables that are not in the migrations.
-- - Default schema is public.

CREATE TABLE "role" (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255)
);

CREATE TABLE "user" (
    id SERIAL PRIMARY KEY,
    google_oauth_token VARCHAR(255),
    email VARCHAR(255),
    fullname VARCHAR(255),
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    profile_id INT
);

CREATE TABLE user_preference (
    id SERIAL PRIMARY KEY,
    user_id INT,
    cooking_skill_level VARCHAR(255),
    allergies TEXT,
    diets TEXT,
    tastes TEXT,
    CONSTRAINT fk_user_preference_user FOREIGN KEY (user_id) REFERENCES "user"(id)
);

-- Circular dependency between user and user_preference
ALTER TABLE "user"
ADD CONSTRAINT fk_user_profile FOREIGN KEY (profile_id) REFERENCES user_preference(id);

CREATE TABLE household (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255),
    created_at TIMESTAMP
);

CREATE TABLE household_member (
    id SERIAL PRIMARY KEY,
    user_id INT,
    household_id INT,
    role_id INT,
    CONSTRAINT fk_hm_user FOREIGN KEY (user_id) REFERENCES "user"(id),
    CONSTRAINT fk_hm_household FOREIGN KEY (household_id) REFERENCES household(id),
    CONSTRAINT fk_hm_role FOREIGN KEY (role_id) REFERENCES "role"(id)
);

CREATE TABLE chat_session (
    id SERIAL PRIMARY KEY,
    member_id INT,
    title VARCHAR(255),
    context_tags TEXT,
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    CONSTRAINT fk_chat_member FOREIGN KEY (member_id) REFERENCES household_member(id)
);

CREATE TABLE chat_message (
    id SERIAL PRIMARY KEY,
    session_id INT,
    sender_type VARCHAR(50),
    content TEXT,
    "timestamp" TIMESTAMP,
    CONSTRAINT fk_chat_message_session FOREIGN KEY (session_id) REFERENCES chat_session(id)
);

CREATE TABLE category (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255)
);

CREATE TABLE food (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255),
    image_url VARCHAR(255),
    default_shelf_life_day INT,
    category_id INT,
    CONSTRAINT fk_food_category FOREIGN KEY (category_id) REFERENCES category(id)
);

CREATE TABLE recipe (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255),
    instructions TEXT,
    cook_time_minutes INT,
    difficulty VARCHAR(100)
);

CREATE TABLE recipe_step (
    id SERIAL PRIMARY KEY,
    recipe_id INT,
    step_number INT,
    instruction TEXT,
    media_url VARCHAR(255),
    CONSTRAINT fk_recipe_step_recipe FOREIGN KEY (recipe_id) REFERENCES recipe(id)
);

CREATE TABLE recipe_food (
    id SERIAL PRIMARY KEY,
    recipe_id INT,
    food_id INT,
    require_quantity FLOAT8,
    unit VARCHAR(50),
    CONSTRAINT fk_rf_recipe FOREIGN KEY (recipe_id) REFERENCES recipe(id),
    CONSTRAINT fk_rf_food FOREIGN KEY (food_id) REFERENCES food(id)
);

CREATE TABLE dish (
    id SERIAL PRIMARY KEY,
    dish_type VARCHAR(100),
    name VARCHAR(255),
    description TEXT,
    image_url VARCHAR(255),
    calories INT,
    recipe_id INT,
    CONSTRAINT fk_dish_recipe FOREIGN KEY (recipe_id) REFERENCES recipe(id)
);

CREATE TABLE meal (
    id SERIAL PRIMARY KEY,
    household_id INT,
    meal_type VARCHAR(100),
    schedule_date DATE,
    schedule_time TIMESTAMP,
    status VARCHAR(100),
    CONSTRAINT fk_meal_household FOREIGN KEY (household_id) REFERENCES household(id)
);

CREATE TABLE meal_attendance (
    id SERIAL PRIMARY KEY,
    meal_id INT,
    user_id INT,
    status VARCHAR(100),
    is_guest BOOLEAN,
    CONSTRAINT fk_ma_meal FOREIGN KEY (meal_id) REFERENCES meal(id),
    CONSTRAINT fk_ma_user FOREIGN KEY (user_id) REFERENCES "user"(id)
);

CREATE TABLE meal_dish (
    id SERIAL PRIMARY KEY,
    meal_id INT,
    dish_id INT,
    note TEXT,
    CONSTRAINT fk_md_meal FOREIGN KEY (meal_id) REFERENCES meal(id),
    CONSTRAINT fk_md_dish FOREIGN KEY (dish_id) REFERENCES dish(id)
);

CREATE TABLE inventory (
    id SERIAL PRIMARY KEY,
    household_id INT,
    CONSTRAINT fk_inventory_household FOREIGN KEY (household_id) REFERENCES household(id)
);

CREATE TABLE inventory_batch (
    id SERIAL PRIMARY KEY,
    inventory_id INT,
    food_id INT,
    quantity FLOAT8,
    unit VARCHAR(50),
    entry_date DATE,
    expiration_date DATE,
    status VARCHAR(100),
    storage_section VARCHAR(255),
    is_bought BOOLEAN,
    CONSTRAINT fk_ib_inventory FOREIGN KEY (inventory_id) REFERENCES inventory(id),
    CONSTRAINT fk_ib_food FOREIGN KEY (food_id) REFERENCES food(id)
);

CREATE TABLE notification (
    id SERIAL PRIMARY KEY,
    household_id INT,
    title VARCHAR(255),
    content TEXT,
    is_read BOOLEAN,
    metadata TEXT,
    CONSTRAINT fk_notif_household FOREIGN KEY (household_id) REFERENCES household(id)
);

CREATE TABLE household_invite (
    id SERIAL PRIMARY KEY,
    household_id INT NOT NULL,
    code VARCHAR(20) NOT NULL UNIQUE,
    invite_link VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_by INT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_household_invite_household FOREIGN KEY (household_id) REFERENCES household(id),
    CONSTRAINT fk_household_invite_created_by FOREIGN KEY (created_by) REFERENCES "user"(id)
);

-- Quick domain map for AI / humans:
-- role, user, user_preference: identity & profile
-- household, household_member, household_invite: household management
-- chat_session, chat_message: chat history
-- category, food, recipe, recipe_step, recipe_food, dish: food knowledge & recipes
-- meal, meal_attendance, meal_dish: meal planning
-- inventory, inventory_batch: stock tracking
-- notification: household notifications
