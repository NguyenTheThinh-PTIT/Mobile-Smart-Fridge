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
