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
