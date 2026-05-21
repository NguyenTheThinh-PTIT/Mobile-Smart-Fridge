ALTER TABLE meal
  ADD COLUMN IF NOT EXISTS user_id BIGINT,
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP;

UPDATE meal
SET schedule_date = COALESCE(schedule_date, schedule_time::date)
WHERE schedule_time IS NOT NULL;

UPDATE meal
SET created_at = COALESCE(created_at, NOW()),
    updated_at = COALESCE(updated_at, NOW());

UPDATE meal m
SET household_id = hm.household_id
FROM household_member hm
WHERE m.household_id IS NULL
  AND m.user_id IS NOT NULL
  AND hm.user_id = m.user_id;

CREATE INDEX IF NOT EXISTS idx_meal_user_id ON meal(user_id);
CREATE INDEX IF NOT EXISTS idx_meal_schedule_time ON meal(schedule_time);

DO $$
BEGIN
  IF to_regclass('public.meal_plans') IS NOT NULL THEN
    INSERT INTO meal (user_id, meal_type, schedule_date, schedule_time, status, notes, created_at, updated_at)
    SELECT
      mp.user_id,
      mp.meal_type,
      mp.planned_date::date,
      mp.planned_date,
      'planned',
      mp.notes,
      COALESCE(mp.created_at, NOW()),
      COALESCE(mp.updated_at, NOW())
    FROM meal_plans mp;
  END IF;
END
$$;

DROP TABLE IF EXISTS meal_plans;
