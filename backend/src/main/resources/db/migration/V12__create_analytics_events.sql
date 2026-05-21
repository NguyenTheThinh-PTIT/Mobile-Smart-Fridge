CREATE TABLE IF NOT EXISTS analytics_events (
    id BIGSERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    event_type VARCHAR(100) NOT NULL,
    event_data TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_user_id ON analytics_events (user_id);
CREATE INDEX IF NOT EXISTS idx_event_type ON analytics_events (event_type);
CREATE INDEX IF NOT EXISTS idx_created_at ON analytics_events (created_at);
