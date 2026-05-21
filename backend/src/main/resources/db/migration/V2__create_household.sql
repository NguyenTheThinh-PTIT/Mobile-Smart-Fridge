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
