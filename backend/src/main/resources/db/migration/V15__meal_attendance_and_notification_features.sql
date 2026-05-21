ALTER TABLE meal
  ADD COLUMN IF NOT EXISTS expected_diners INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS guest_count INT DEFAULT 0;

UPDATE meal m
SET expected_diners = COALESCE(sub.total_attendees, 0),
    guest_count = COALESCE(sub.total_guests, 0)
FROM (
  SELECT
    meal_id,
    COUNT(*) AS total_attendees,
    COUNT(*) FILTER (WHERE is_guest = TRUE) AS total_guests
  FROM meal_attendance
  GROUP BY meal_id
) sub
WHERE m.id = sub.meal_id
  AND (m.expected_diners IS NULL OR m.expected_diners = 0);

ALTER TABLE notification
  ADD COLUMN IF NOT EXISTS user_id BIGINT,
  ADD COLUMN IF NOT EXISTS type VARCHAR(100) DEFAULT 'general',
  ADD COLUMN IF NOT EXISTS action_required BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS action_taken BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS related_meal_id BIGINT,
  ADD COLUMN IF NOT EXISTS read_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

UPDATE notification
SET type = COALESCE(type, 'general'),
    action_required = COALESCE(action_required, FALSE),
    action_taken = COALESCE(action_taken, FALSE),
    created_at = COALESCE(created_at, NOW()),
    updated_at = COALESCE(updated_at, NOW())
WHERE TRUE;

ALTER TABLE notification
  ADD CONSTRAINT fk_notification_user_id
  FOREIGN KEY (user_id) REFERENCES "user"(id);

ALTER TABLE notification
  ADD CONSTRAINT fk_notification_related_meal
  FOREIGN KEY (related_meal_id) REFERENCES meal(id);

CREATE INDEX IF NOT EXISTS idx_notification_user_id ON notification(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_household_id ON notification(household_id);
CREATE INDEX IF NOT EXISTS idx_notification_created_at ON notification(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notification_related_meal ON notification(related_meal_id);
