ALTER TABLE "user"
    ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255),
    ADD COLUMN IF NOT EXISTS google_sub VARCHAR(255),
    ADD COLUMN IF NOT EXISTS email_verified BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP;

CREATE INDEX IF NOT EXISTS idx_user_email_lower ON "user" (LOWER(email));
CREATE UNIQUE INDEX IF NOT EXISTS uq_user_google_sub ON "user" (google_sub) WHERE google_sub IS NOT NULL;

CREATE TABLE IF NOT EXISTS auth_refresh_token (
    id BIGSERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    token_hash VARCHAR(128) NOT NULL,
    issued_at TIMESTAMP NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    revoked_at TIMESTAMP,
    created_by_ip VARCHAR(64),
    CONSTRAINT fk_refresh_token_user FOREIGN KEY (user_id) REFERENCES "user" (id)
);

CREATE INDEX IF NOT EXISTS idx_refresh_token_user_id ON auth_refresh_token (user_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_refresh_token_hash ON auth_refresh_token (token_hash);

CREATE TABLE IF NOT EXISTS password_reset_otp (
    id BIGSERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    otp_code VARCHAR(10) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    consumed_at TIMESTAMP,
    attempt_count INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_password_reset_otp_user FOREIGN KEY (user_id) REFERENCES "user" (id)
);

CREATE INDEX IF NOT EXISTS idx_password_reset_otp_user_id ON password_reset_otp (user_id);

CREATE TABLE IF NOT EXISTS household_event (
    id BIGSERIAL PRIMARY KEY,
    household_id INT NOT NULL,
    event_type VARCHAR(64) NOT NULL,
    payload TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    created_by INT,
    CONSTRAINT fk_household_event_household FOREIGN KEY (household_id) REFERENCES household (id),
    CONSTRAINT fk_household_event_user FOREIGN KEY (created_by) REFERENCES "user" (id)
);

CREATE INDEX IF NOT EXISTS idx_household_event_household_id ON household_event (household_id, created_at DESC);
