CREATE TABLE category (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255)
);

CREATE TABLE food (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255),
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
