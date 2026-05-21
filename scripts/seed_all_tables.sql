BEGIN;

TRUNCATE TABLE
  chat_message,
  chat_session,
  meal_attendance,
  meal_dish,
  meal,
  dish,
  recipe_step,
  recipe_food,
  recipe_embeddings,
  inventory_batch,
  inventory,
  household_invite,
  notification,
  household_member,
  food,
  category,
  household,
  "user",
  user_preference,
  role,
  recipe
RESTART IDENTITY CASCADE;

INSERT INTO role (name)
VALUES
  ('Owner'),
  ('Admin'),
  ('Member');

INSERT INTO category (name)
SELECT 'Category ' || LPAD(gs::text, 2, '0')
FROM generate_series(1, 12) AS gs;

INSERT INTO food (name, default_shelf_life_day, category_id)
SELECT
  'Food ' || LPAD(gs::text, 3, '0'),
  3 + (gs % 25),
  ((gs - 1) % 12) + 1
FROM generate_series(1, 120) AS gs;

INSERT INTO household (name, created_at)
SELECT
  'Household ' || LPAD(gs::text, 2, '0'),
  NOW() - ((gs * 2)::text || ' days')::interval
FROM generate_series(1, 12) AS gs;

-- Seed password hash so QA/dev can verify auth flows without creating accounts manually.
INSERT INTO "user" (google_oauth_token, email, fullname, password_hash, created_at, updated_at)
SELECT
  'oauth_seed_' || gs,
  'user' || LPAD(gs::text, 3, '0') || '@seed.local',
  'Seed User ' || LPAD(gs::text, 3, '0'),
  '$2y$05$JZy0EOK7pl75VM1BJYWYR.fiz4fW9bIePHc8No5gORbMGWaogUYYG',
  NOW() - ((gs + 10)::text || ' days')::interval,
  NOW() - ((gs % 5)::text || ' days')::interval
FROM generate_series(1, 72) AS gs;

INSERT INTO user_preference (user_id, cooking_skill_level, allergies, diets, tastes)
SELECT
  u.id,
  (ARRAY['Beginner','Intermediate','Advanced'])[((u.id - 1) % 3) + 1],
  CASE WHEN u.id % 6 = 0 THEN '["peanut"]' WHEN u.id % 10 = 0 THEN '["seafood"]' ELSE '[]' END,
  CASE WHEN u.id % 7 = 0 THEN '["vegetarian"]' WHEN u.id % 11 = 0 THEN '["low_carb"]' ELSE '[]' END,
  CASE WHEN u.id % 2 = 0 THEN '["savory","light"]' ELSE '["spicy","home-style"]' END
FROM "user" u;

UPDATE "user" u
SET profile_id = p.id
FROM user_preference p
WHERE p.user_id = u.id;

INSERT INTO household_member (user_id, household_id, role_id)
SELECT
  u.id,
  ((u.id - 1) / 6) + 1,
  CASE
    WHEN ((u.id - 1) % 6) = 0 THEN 1
    WHEN ((u.id - 1) % 6) = 1 THEN 2
    ELSE 3
  END
FROM "user" u
WHERE u.id <= 72;

INSERT INTO inventory (household_id)
SELECT id
FROM household;

INSERT INTO inventory_batch (
  inventory_id,
  food_id,
  quantity,
  unit,
  entry_date,
  expiration_date,
  status,
  storage_section,
  is_bought
)
SELECT
  i.id,
  ((i.id * 13 + gs.n * 7) % 120) + 1,
  ((1 + ((i.id + gs.n) % 8))::float / 2.0),
  (ARRAY['kg','g','piece','ml'])[((gs.n - 1) % 4) + 1],
  CURRENT_DATE - ((i.id + gs.n) % 10),
  CURRENT_DATE + (((i.id * 3 + gs.n * 2) % 18) - 4),
  CASE
    WHEN (((i.id * 3 + gs.n * 2) % 18) - 4) < 0 THEN 'Expired'
    WHEN ((i.id + gs.n) % 5) = 0 THEN 'LowStock'
    ELSE 'Available'
  END,
  (ARRAY['Fridge','Freezer','Pantry'])[((i.id + gs.n) % 3) + 1],
  TRUE
FROM inventory i
CROSS JOIN generate_series(1, 20) AS gs(n);

INSERT INTO recipe (
  name,
  instructions,
  cook_time_minutes,
  difficulty,
  cuisine_type,
  season_tags,
  meal_type_tags,
  diet_compatible,
  allergen_contains,
  min_serving,
  max_serving
)
SELECT
  'Recipe ' || LPAD(gs::text, 3, '0'),
  'Step 1: Prepare ingredients. Step 2: Cook with medium heat. Step 3: Season and serve. Seed recipe #' || gs,
  10 + (gs % 50),
  (ARRAY['Easy','Medium','Hard'])[((gs - 1) % 3) + 1],
  (ARRAY['Vietnamese','Asian','Fusion'])[((gs - 1) % 3) + 1],
  CASE WHEN gs % 5 = 0 THEN '["hot"]'::jsonb WHEN gs % 7 = 0 THEN '["rainy"]'::jsonb ELSE '["normal"]'::jsonb END,
  CASE
    WHEN gs % 3 = 1 THEN '["breakfast"]'::jsonb
    WHEN gs % 3 = 2 THEN '["lunch"]'::jsonb
    ELSE '["dinner"]'::jsonb
  END,
  CASE WHEN gs % 9 = 0 THEN '["vegetarian"]'::jsonb ELSE '[]'::jsonb END,
  CASE WHEN gs % 10 = 0 THEN '["peanut"]'::jsonb ELSE '[]'::jsonb END,
  1 + (gs % 3),
  3 + (gs % 5)
FROM generate_series(1, 180) AS gs;

INSERT INTO recipe_food (recipe_id, food_id, require_quantity, unit)
SELECT
  r.id,
  ((r.id * 11 + gs.n * 5) % 120) + 1,
  0.5 + ((gs.n % 4) * 0.5),
  (ARRAY['kg','g','piece','ml'])[((gs.n - 1) % 4) + 1]
FROM recipe r
CROSS JOIN generate_series(1, 6) AS gs(n);

INSERT INTO recipe_step (recipe_id, step_number, instruction, media_url)
SELECT
  r.id,
  gs.n,
  'Recipe ' || r.id || ' - instruction step ' || gs.n,
  'https://example.com/recipe/' || r.id || '/step/' || gs.n
FROM recipe r
CROSS JOIN generate_series(1, 4) AS gs(n);

INSERT INTO dish (dish_type, name, description, image_url, calories, recipe_id)
SELECT
  (ARRAY['Main','Side','Soup'])[((r.id - 1) % 3) + 1],
  'Dish ' || LPAD(r.id::text, 3, '0'),
  'Dish generated from recipe ' || r.id,
  'https://example.com/dish/' || r.id || '.jpg',
  220 + (r.id % 380),
  r.id
FROM recipe r;

INSERT INTO meal (household_id, meal_type, schedule_date, schedule_time, status)
SELECT
  h.id,
  (ARRAY['breakfast','lunch','dinner'])[((gs.n - 1) % 3) + 1],
  CURRENT_DATE - 10 + gs.n,
  (CURRENT_DATE - 10 + gs.n) + (ARRAY['07:30:00','12:00:00','19:00:00'])[((gs.n - 1) % 3) + 1]::time,
  CASE
    WHEN gs.n <= 10 THEN 'Completed'
    WHEN gs.n <= 20 THEN 'Planned'
    ELSE 'Cancelled'
  END
FROM household h
CROSS JOIN generate_series(1, 24) AS gs(n);

INSERT INTO meal_dish (meal_id, dish_id, note)
SELECT
  m.id,
  ((m.id * 7 + gs.n * 13) % 180) + 1,
  'Seed note ' || gs.n || ' for meal ' || m.id
FROM meal m
CROSS JOIN generate_series(1, 2) AS gs(n);

WITH member_rank AS (
  SELECT
    hm.user_id,
    hm.household_id,
    ROW_NUMBER() OVER (PARTITION BY hm.household_id ORDER BY hm.id) AS rn
  FROM household_member hm
)
INSERT INTO meal_attendance (meal_id, user_id, status, is_guest)
SELECT
  m.id,
  mr.user_id,
  CASE
    WHEN mr.rn = 1 THEN 'Accepted'
    WHEN mr.rn = 2 AND m.status = 'Completed' THEN 'Accepted'
    WHEN m.status = 'Cancelled' THEN 'Declined'
    ELSE 'Pending'
  END,
  FALSE
FROM meal m
JOIN member_rank mr ON mr.household_id = m.household_id
WHERE mr.rn <= 3;

-- Seed bo sung de dam bao household 1 luon co mot so mon "San sang"
-- Logic:
-- 1) Chon nhom recipe dinner khong nam trong recent completed meals
-- 2) Lay tap food cua nhom recipe do va nap ton kho du lon
-- Muc tieu: fully_covered khong bi rong khi goi API suggestion
WITH target_inventory AS (
  SELECT id
  FROM inventory
  WHERE household_id = 1
  ORDER BY id
  LIMIT 1
),
recent_recipes AS (
  SELECT DISTINCT d.recipe_id
  FROM meal m
  JOIN meal_dish md ON md.meal_id = m.id
  JOIN dish d ON d.id = md.dish_id
  WHERE m.household_id = 1
    AND m.schedule_date >= CURRENT_DATE - INTERVAL '3 days'
    AND m.status = 'Completed'
    AND d.recipe_id IS NOT NULL
),
target_recipes AS (
  SELECT r.id
  FROM recipe r
  WHERE r.meal_type_tags @> '["dinner"]'::jsonb
    AND (r.allergen_contains IS NULL OR jsonb_array_length(r.allergen_contains) = 0)
    AND r.id NOT IN (SELECT recipe_id FROM recent_recipes)
  ORDER BY r.id
  LIMIT 12
),
required_foods AS (
  SELECT
    rf.food_id,
    MAX(rf.require_quantity) AS max_required
  FROM recipe_food rf
  JOIN target_recipes tr ON tr.id = rf.recipe_id
  GROUP BY rf.food_id
)
INSERT INTO inventory_batch (
  inventory_id,
  food_id,
  quantity,
  unit,
  entry_date,
  expiration_date,
  status,
  storage_section,
  is_bought
)
SELECT
  ti.id,
  rf.food_id,
  GREATEST(rf.max_required * 4, 3.0),
  'piece',
  CURRENT_DATE - 1,
  CURRENT_DATE + 10,
  'Available',
  'Fridge',
  TRUE
FROM required_foods rf
CROSS JOIN target_inventory ti;

INSERT INTO household_invite (household_id, code, invite_link, expires_at, is_active, created_by, created_at)
SELECT
  h.id,
  'INV-' || h.id || '-' || gs.n,
  'https://fridge.local/invite/INV-' || h.id || '-' || gs.n,
  NOW() + ((3 + gs.n)::text || ' days')::interval,
  TRUE,
  owner_hm.user_id,
  NOW() - ((h.id + gs.n)::text || ' days')::interval
FROM household h
JOIN LATERAL (
  SELECT hm.user_id
  FROM household_member hm
  WHERE hm.household_id = h.id
  ORDER BY hm.id
  LIMIT 1
) owner_hm ON TRUE
CROSS JOIN generate_series(1, 2) AS gs(n);

INSERT INTO notification (household_id, title, content, is_read, metadata)
SELECT
  h.id,
  'Notification ' || gs.n || ' for household ' || h.id,
  'Generated notification content #' || gs.n,
  (gs.n % 3 = 0),
  '{"type":"seed","priority":"normal","household_id":' || h.id || ',"index":' || gs.n || '}'
FROM household h
CROSS JOIN generate_series(1, 8) AS gs(n);

WITH member_rank AS (
  SELECT
    hm.id AS member_id,
    hm.household_id,
    ROW_NUMBER() OVER (PARTITION BY hm.household_id ORDER BY hm.id) AS rn
  FROM household_member hm
)
INSERT INTO chat_session (member_id, title, context_tags, created_at, updated_at)
SELECT
  mr.member_id,
  'Session for household ' || mr.household_id || ' member rank ' || mr.rn,
  '["meal_planning","inventory"]',
  NOW() - ((mr.household_id + mr.rn)::text || ' days')::interval,
  NOW() - ((mr.rn)::text || ' hours')::interval
FROM member_rank mr
WHERE mr.rn <= 2;

INSERT INTO chat_message (session_id, sender_type, content, timestamp)
SELECT
  cs.id,
  CASE WHEN gs.n % 2 = 0 THEN 'assistant' ELSE 'user' END,
  'Seed chat message #' || gs.n || ' in session ' || cs.id,
  cs.created_at + ((gs.n * 5)::text || ' minutes')::interval
FROM chat_session cs
CROSS JOIN generate_series(1, 5) AS gs(n);

WITH const_vec AS (
  SELECT ('[' || array_to_string(array_fill(0.01::float8, ARRAY[3072]), ',') || ']')::vector AS vec
)
INSERT INTO recipe_embeddings (
  recipe_id,
  chunk_type,
  chunk_content,
  embedding,
  embedding_model,
  created_at,
  updated_at
)
SELECT
  r.id,
  c.chunk_type,
  CASE
    WHEN c.chunk_type = 'overview' THEN
      'Overview for ' || r.name || '. Cuisine: ' || COALESCE(r.cuisine_type, 'Unknown') || '. Time: ' || COALESCE(r.cook_time_minutes::text, '0') || ' minutes.'
    ELSE
      'Ingredients for ' || r.name || ': ' || (
        SELECT string_agg(f.name, ', ')
        FROM recipe_food rf
        JOIN food f ON f.id = rf.food_id
        WHERE rf.recipe_id = r.id
      )
  END,
  const_vec.vec,
  'seed-static-3072',
  NOW(),
  NOW()
FROM recipe r
CROSS JOIN (VALUES ('overview'), ('ingredients')) AS c(chunk_type)
CROSS JOIN const_vec;

COMMIT;
