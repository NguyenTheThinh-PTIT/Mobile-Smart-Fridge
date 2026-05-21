CREATE TABLE notification (
    id SERIAL PRIMARY KEY,
    household_id INT,
    title VARCHAR(255),
    content TEXT,
    is_read BOOLEAN,
    metadata TEXT,
    CONSTRAINT fk_notif_household FOREIGN KEY (household_id) REFERENCES household(id)
);
