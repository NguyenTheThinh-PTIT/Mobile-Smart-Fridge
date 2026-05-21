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

-- Handle circular dependency: User <-> UserPreference
ALTER TABLE "user"
ADD CONSTRAINT fk_user_profile FOREIGN KEY (profile_id) REFERENCES user_preference(id);
