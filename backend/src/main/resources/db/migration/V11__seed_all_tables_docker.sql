-- Flyway V11 - Full seed data for Docker environments
-- Goal: ensure all core tables have 20 valid records with FK integrity.
-- Strategy:
-- 1) Insert deterministic IDs in range 1001..1020 to avoid collisions with existing local data.
-- 2) Use ON CONFLICT(id) DO NOTHING so migration remains idempotent for repeated restores.
-- 3) Sync sequences to max(id) after inserts.

-- =========================
-- Identity and household base
-- =========================
INSERT INTO "role" (id, name)
SELECT 1000 + i,
       CASE
         WHEN i = 1 THEN 'owner'
         WHEN i = 2 THEN 'member'
         ELSE 'role_' || i
       END
FROM generate_series(1, 20) AS s(i)
ON CONFLICT (id) DO NOTHING;

INSERT INTO "user" (
    id,
    google_oauth_token,
    email,
    fullname,
    password_hash,
    google_sub,
    email_verified,
    last_login_at,
    created_at,
    updated_at,
    profile_id
)
SELECT 1000 + i,
       NULL,
       'seed.user' || i || '@fridge.ai',
       'Seed User ' || i,
       '$2a$10$3f2Ew5uH9Ilm0SO6f3nRz.0p0Q6xQynYJ5Q4u9n9TjJQ4z6qJ6Ymu',
       'seed-google-sub-' || i,
       true,
       NOW() - (i || ' hours')::interval,
       NOW() - (i || ' days')::interval,
       NOW() - (i || ' days')::interval,
       NULL
FROM generate_series(1, 20) AS s(i)
ON CONFLICT (id) DO NOTHING;

INSERT INTO user_preference (id, user_id, cooking_skill_level, allergies, diets, tastes)
SELECT 1000 + i,
       1000 + i,
       CASE WHEN i % 3 = 0 THEN 'advanced' WHEN i % 3 = 1 THEN 'beginner' ELSE 'intermediate' END,
       CASE WHEN i % 5 = 0 THEN 'peanut' ELSE NULL END,
       CASE WHEN i % 4 = 0 THEN 'low-carb' ELSE NULL END,
       CASE WHEN i % 2 = 0 THEN 'savory' ELSE 'balanced' END
FROM generate_series(1, 20) AS s(i)
ON CONFLICT (id) DO NOTHING;

UPDATE "user" u
SET profile_id = up.id,
    updated_at = NOW()
FROM user_preference up
WHERE u.id = up.user_id
  AND u.id BETWEEN 1001 AND 1020
  AND (u.profile_id IS NULL OR u.profile_id <> up.id);

INSERT INTO household (id, name, created_at)
SELECT 1000 + i,
       'Seed Household ' || i,
       NOW() - (i || ' days')::interval
FROM generate_series(1, 20) AS s(i)
ON CONFLICT (id) DO NOTHING;

INSERT INTO household_member (id, user_id, household_id, role_id)
SELECT 1000 + i,
       1000 + i,
       1000 + i,
       CASE WHEN i % 5 = 1 THEN 1001 ELSE 1002 END
FROM generate_series(1, 20) AS s(i)
ON CONFLICT (id) DO NOTHING;

-- =========================
-- Chat
-- =========================
INSERT INTO chat_session (id, member_id, title, context_tags, created_at, updated_at)
SELECT 1000 + i,
       1000 + i,
       'Seed Chat Session ' || i,
       'inventory,meal-planning',
       NOW() - (i || ' days')::interval,
       NOW() - (i || ' hours')::interval
FROM generate_series(1, 20) AS s(i)
ON CONFLICT (id) DO NOTHING;

INSERT INTO chat_message (id, session_id, sender_type, content, "timestamp")
SELECT 1000 + i,
       1000 + i,
       CASE WHEN i % 2 = 0 THEN 'USER' ELSE 'ASSISTANT' END,
       'Seed chat message content #' || i,
       NOW() - (i || ' minutes')::interval
FROM generate_series(1, 20) AS s(i)
ON CONFLICT (id) DO NOTHING;

-- =========================
-- Food / recipe domain
-- =========================
INSERT INTO category (id, name)
SELECT 1000 + i, 'Seed Category ' || i
FROM generate_series(1, 20) AS s(i)
ON CONFLICT (id) DO NOTHING;

INSERT INTO food (id, name, default_shelf_life_day, category_id)
SELECT 1000 + i,
       'Seed Food ' || i,
       3 + (i % 10),
       1000 + i
FROM generate_series(1, 20) AS s(i)
ON CONFLICT (id) DO NOTHING;

INSERT INTO recipe (id, name, instructions, cook_time_minutes, difficulty)
SELECT 1000 + i,
       'Seed Recipe ' || i,
       'Step-by-step seed instructions for recipe #' || i,
       10 + i,
       CASE WHEN i % 3 = 0 THEN 'Hard' WHEN i % 3 = 1 THEN 'Easy' ELSE 'Medium' END
FROM generate_series(1, 20) AS s(i)
ON CONFLICT (id) DO NOTHING;

INSERT INTO recipe_step (id, recipe_id, step_number, instruction, media_url)
SELECT 1000 + i,
       1000 + i,
       1,
       'Seed step 1 for recipe #' || i,
       NULL
FROM generate_series(1, 20) AS s(i)
ON CONFLICT (id) DO NOTHING;

INSERT INTO recipe_food (id, recipe_id, food_id, require_quantity, unit)
SELECT 1000 + i,
       1000 + i,
       1000 + i,
       1.0 + (i % 3),
       CASE WHEN i % 2 = 0 THEN 'kg' ELSE 'pcs' END
FROM generate_series(1, 20) AS s(i)
ON CONFLICT (id) DO NOTHING;

INSERT INTO dish (id, dish_type, name, description, image_url, calories, recipe_id)
SELECT 1000 + i,
       CASE WHEN i % 2 = 0 THEN 'MAIN' ELSE 'SIDE' END,
       'Seed Dish ' || i,
       'Seed dish description #' || i,
       'https://example.com/dish-' || i || '.jpg',
       250 + i,
       1000 + i
FROM generate_series(1, 20) AS s(i)
ON CONFLICT (id) DO NOTHING;

-- =========================
-- Meal planning
-- =========================
INSERT INTO meal (id, household_id, meal_type, schedule_date, schedule_time, status)
SELECT 1000 + i,
       1000 + i,
       CASE WHEN i % 3 = 0 THEN 'DINNER' WHEN i % 3 = 1 THEN 'BREAKFAST' ELSE 'LUNCH' END,
       CURRENT_DATE + i,
       NOW() + (i || ' hours')::interval,
       'PLANNED'
FROM generate_series(1, 20) AS s(i)
ON CONFLICT (id) DO NOTHING;

INSERT INTO meal_attendance (id, meal_id, user_id, status, is_guest)
SELECT 1000 + i,
       1000 + i,
       1000 + i,
       CASE WHEN i % 2 = 0 THEN 'CONFIRMED' ELSE 'PENDING' END,
       false
FROM generate_series(1, 20) AS s(i)
ON CONFLICT (id) DO NOTHING;

INSERT INTO meal_dish (id, meal_id, dish_id, note)
SELECT 1000 + i,
       1000 + i,
       1000 + i,
       'Seed note for meal_dish #' || i
FROM generate_series(1, 20) AS s(i)
ON CONFLICT (id) DO NOTHING;

-- =========================
-- Inventory
-- =========================
INSERT INTO inventory (id, household_id)
SELECT 1000 + i, 1000 + i
FROM generate_series(1, 20) AS s(i)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_batch (
    id,
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
SELECT 1000 + i,
       1000 + i,
       1000 + i,
       1.5 + (i % 4),
       CASE WHEN i % 2 = 0 THEN 'kg' ELSE 'pcs' END,
       CURRENT_DATE - (i % 7),
       CURRENT_DATE + (5 + i),
       'active',
       CASE WHEN i % 2 = 0 THEN 'fridge' ELSE 'freezer' END,
       true
FROM generate_series(1, 20) AS s(i)
ON CONFLICT (id) DO NOTHING;

-- =========================
-- Notification and invites
-- =========================
INSERT INTO notification (id, household_id, title, content, is_read, metadata)
SELECT 1000 + i,
       1000 + i,
       'Seed Notification ' || i,
       'Seed notification content #' || i,
       (i % 2 = 0),
       '{"source":"seed","priority":"normal"}'
FROM generate_series(1, 20) AS s(i)
ON CONFLICT (id) DO NOTHING;

INSERT INTO household_invite (
    id,
    household_id,
    code,
    invite_link,
    expires_at,
    is_active,
    created_by,
    created_at
)
SELECT 1000 + i,
       1000 + i,
       'INV' || LPAD(i::text, 6, '0'),
       'https://fridge.app/invite/INV' || LPAD(i::text, 6, '0'),
       NOW() + ((24 + i) || ' hours')::interval,
       true,
       1000 + i,
       NOW() - (i || ' hours')::interval
FROM generate_series(1, 20) AS s(i)
ON CONFLICT (id) DO NOTHING;

-- =========================
-- Auth and realtime tables (V10)
-- =========================
INSERT INTO auth_refresh_token (id, user_id, token_hash, issued_at, expires_at, revoked_at, created_by_ip)
SELECT 1000 + i,
       1000 + i,
       'seed_refresh_hash_' || LPAD(i::text, 3, '0'),
       NOW() - (i || ' days')::interval,
       NOW() + ((30 + i) || ' days')::interval,
       NULL,
       '127.0.0.' || i
FROM generate_series(1, 20) AS s(i)
ON CONFLICT (id) DO NOTHING;

INSERT INTO password_reset_otp (id, user_id, otp_code, expires_at, consumed_at, attempt_count, created_at)
SELECT 1000 + i,
       1000 + i,
       LPAD((100000 + i)::text, 6, '0'),
       NOW() + ((10 + i) || ' minutes')::interval,
       NULL,
       0,
       NOW() - (i || ' minutes')::interval
FROM generate_series(1, 20) AS s(i)
ON CONFLICT (id) DO NOTHING;

INSERT INTO household_event (id, household_id, event_type, payload, created_at, created_by)
SELECT 1000 + i,
       1000 + i,
       CASE WHEN i % 2 = 0 THEN 'MEMBER_JOINED' ELSE 'INVITE_REGENERATED' END,
       '{"seed":true,"eventNo":' || i || '}',
       NOW() - (i || ' minutes')::interval,
       1000 + i
FROM generate_series(1, 20) AS s(i)
ON CONFLICT (id) DO NOTHING;

-- =========================
-- Vector table (V9)
-- =========================
INSERT INTO recipe_vectors (id, recipe_id, source_text, content_hash, embedding, created_at, updated_at)
SELECT 1000 + i,
       1000 + i,
       'Seed vector source text for recipe #' || i,
       md5('seed-recipe-vector-' || i),
       array_fill(0::real, ARRAY[768])::vector,
       NOW() - (i || ' days')::interval,
       NOW() - (i || ' days')::interval
FROM generate_series(1, 20) AS s(i)
ON CONFLICT (id) DO NOTHING;

-- =========================
-- Sequence synchronization
-- =========================
SELECT setval(pg_get_serial_sequence('"role"', 'id'), COALESCE((SELECT MAX(id) FROM "role"), 1), true);
SELECT setval(pg_get_serial_sequence('"user"', 'id'), COALESCE((SELECT MAX(id) FROM "user"), 1), true);
SELECT setval(pg_get_serial_sequence('user_preference', 'id'), COALESCE((SELECT MAX(id) FROM user_preference), 1), true);
SELECT setval(pg_get_serial_sequence('household', 'id'), COALESCE((SELECT MAX(id) FROM household), 1), true);
SELECT setval(pg_get_serial_sequence('household_member', 'id'), COALESCE((SELECT MAX(id) FROM household_member), 1), true);
SELECT setval(pg_get_serial_sequence('chat_session', 'id'), COALESCE((SELECT MAX(id) FROM chat_session), 1), true);
SELECT setval(pg_get_serial_sequence('chat_message', 'id'), COALESCE((SELECT MAX(id) FROM chat_message), 1), true);
SELECT setval(pg_get_serial_sequence('category', 'id'), COALESCE((SELECT MAX(id) FROM category), 1), true);
SELECT setval(pg_get_serial_sequence('food', 'id'), COALESCE((SELECT MAX(id) FROM food), 1), true);
SELECT setval(pg_get_serial_sequence('recipe', 'id'), COALESCE((SELECT MAX(id) FROM recipe), 1), true);
SELECT setval(pg_get_serial_sequence('recipe_step', 'id'), COALESCE((SELECT MAX(id) FROM recipe_step), 1), true);
SELECT setval(pg_get_serial_sequence('recipe_food', 'id'), COALESCE((SELECT MAX(id) FROM recipe_food), 1), true);
SELECT setval(pg_get_serial_sequence('dish', 'id'), COALESCE((SELECT MAX(id) FROM dish), 1), true);
SELECT setval(pg_get_serial_sequence('meal', 'id'), COALESCE((SELECT MAX(id) FROM meal), 1), true);
SELECT setval(pg_get_serial_sequence('meal_attendance', 'id'), COALESCE((SELECT MAX(id) FROM meal_attendance), 1), true);
SELECT setval(pg_get_serial_sequence('meal_dish', 'id'), COALESCE((SELECT MAX(id) FROM meal_dish), 1), true);
SELECT setval(pg_get_serial_sequence('inventory', 'id'), COALESCE((SELECT MAX(id) FROM inventory), 1), true);
SELECT setval(pg_get_serial_sequence('inventory_batch', 'id'), COALESCE((SELECT MAX(id) FROM inventory_batch), 1), true);
SELECT setval(pg_get_serial_sequence('notification', 'id'), COALESCE((SELECT MAX(id) FROM notification), 1), true);
SELECT setval(pg_get_serial_sequence('household_invite', 'id'), COALESCE((SELECT MAX(id) FROM household_invite), 1), true);
SELECT setval(pg_get_serial_sequence('recipe_vectors', 'id'), COALESCE((SELECT MAX(id) FROM recipe_vectors), 1), true);
SELECT setval(pg_get_serial_sequence('auth_refresh_token', 'id'), COALESCE((SELECT MAX(id) FROM auth_refresh_token), 1), true);
SELECT setval(pg_get_serial_sequence('password_reset_otp', 'id'), COALESCE((SELECT MAX(id) FROM password_reset_otp), 1), true);
SELECT setval(pg_get_serial_sequence('household_event', 'id'), COALESCE((SELECT MAX(id) FROM household_event), 1), true);
