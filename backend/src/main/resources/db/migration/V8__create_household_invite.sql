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
