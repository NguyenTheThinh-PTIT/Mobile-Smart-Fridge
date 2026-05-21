-- Flyway V14 - Mock data for report screens
-- Mapping used by the current schema:
-- - meal + meal_dish = consumed/cooking history
-- - inventory + inventory_batch = wasted stock

INSERT INTO category (name)
SELECT v.name
FROM (
    VALUES
        ('Thịt'),
        ('Rau'),
        ('Sữa'),
        ('Tinh bột'),
        ('Gia vị'),
        ('Nấm'),
        ('Trứng')
) AS v(name)
WHERE NOT EXISTS (
    SELECT 1
    FROM category c
    WHERE lower(c.name) = lower(v.name)
);

INSERT INTO food (id, name, default_shelf_life_day, category_id)
SELECT 3001, 'Thịt bò', 5, c.id FROM category c WHERE lower(c.name) = lower('Thịt') LIMIT 1
ON CONFLICT (id) DO NOTHING;

INSERT INTO food (id, name, default_shelf_life_day, category_id)
SELECT 3002, 'Thịt lợn', 4, c.id FROM category c WHERE lower(c.name) = lower('Thịt') LIMIT 1
ON CONFLICT (id) DO NOTHING;

INSERT INTO food (id, name, default_shelf_life_day, category_id)
SELECT 3003, 'Rau cải', 5, c.id FROM category c WHERE lower(c.name) = lower('Rau') LIMIT 1
ON CONFLICT (id) DO NOTHING;

INSERT INTO food (id, name, default_shelf_life_day, category_id)
SELECT 3004, 'Cà rốt', 10, c.id FROM category c WHERE lower(c.name) = lower('Rau') LIMIT 1
ON CONFLICT (id) DO NOTHING;

INSERT INTO food (id, name, default_shelf_life_day, category_id)
SELECT 3005, 'Phô mai', 14, c.id FROM category c WHERE lower(c.name) = lower('Sữa') LIMIT 1
ON CONFLICT (id) DO NOTHING;

INSERT INTO food (id, name, default_shelf_life_day, category_id)
SELECT 3006, 'Mì Ý', 30, c.id FROM category c WHERE lower(c.name) = lower('Tinh bột') LIMIT 1
ON CONFLICT (id) DO NOTHING;

INSERT INTO food (id, name, default_shelf_life_day, category_id)
SELECT 3007, 'Hành tây', 12, c.id FROM category c WHERE lower(c.name) = lower('Gia vị') LIMIT 1
ON CONFLICT (id) DO NOTHING;

INSERT INTO food (id, name, default_shelf_life_day, category_id)
SELECT 3008, 'Tỏi', 20, c.id FROM category c WHERE lower(c.name) = lower('Gia vị') LIMIT 1
ON CONFLICT (id) DO NOTHING;

INSERT INTO food (id, name, default_shelf_life_day, category_id)
SELECT 3009, 'Nấm', 7, c.id FROM category c WHERE lower(c.name) = lower('Nấm') LIMIT 1
ON CONFLICT (id) DO NOTHING;

INSERT INTO food (id, name, default_shelf_life_day, category_id)
SELECT 3010, 'Trứng gà', 14, c.id FROM category c WHERE lower(c.name) = lower('Trứng') LIMIT 1
ON CONFLICT (id) DO NOTHING;

INSERT INTO recipe (id, name, instructions, cook_time_minutes, difficulty)
VALUES
    (4001, 'Bò cuộn phô mai', 'Ướp thịt bò, cuộn với phô mai và áp chảo nhanh trên lửa lớn.', 20, 'Dễ'),
    (4002, 'Bò xào nấm', 'Xào bò với tỏi, hành tây và nấm đến khi chín tới.', 18, 'Dễ'),
    (4003, 'Rau cải xào cà rốt', 'Xào rau cải với cà rốt và tỏi, nêm nhẹ để giữ độ giòn.', 12, 'Dễ'),
    (4004, 'Thịt lợn rim mặn ngọt', 'Rim thịt lợn với nước mắm, đường và hành tây đến khi sệt.', 25, 'Trung bình'),
    (4005, 'Mì Ý phô mai trứng', 'Luộc mì Ý, trộn sốt phô mai và trứng rồi hoàn thiện bằng tiêu đen.', 22, 'Dễ')
ON CONFLICT (id) DO NOTHING;

INSERT INTO recipe_step (id, recipe_id, step_number, instruction, media_url)
VALUES
    (4101, 4001, 1, 'Sơ chế thịt bò, rắc tiêu và muối nhẹ.', NULL),
    (4102, 4001, 2, 'Cuộn với phô mai rồi áp chảo nhanh.', NULL),
    (4103, 4002, 1, 'Phi tỏi và hành tây.', NULL),
    (4104, 4002, 2, 'Thêm bò và nấm, đảo nhanh trên lửa lớn.', NULL),
    (4105, 4003, 1, 'Cắt rau cải và cà rốt thành miếng vừa ăn.', NULL),
    (4106, 4003, 2, 'Xào nhanh với tỏi và nêm nhẹ.', NULL),
    (4107, 4004, 1, 'Ướp thịt lợn với gia vị.', NULL),
    (4108, 4004, 2, 'Rim nhỏ lửa đến khi sệt.', NULL),
    (4109, 4005, 1, 'Luộc mì Ý đến độ chín mong muốn.', NULL),
    (4110, 4005, 2, 'Trộn sốt phô mai trứng rồi hoàn thiện.', NULL)
ON CONFLICT (id) DO NOTHING;

INSERT INTO recipe_food (id, recipe_id, food_id, require_quantity, unit)
VALUES
    (4201, 4001, 3001, 0.35, 'kg'),
    (4202, 4001, 3005, 0.10, 'kg'),
    (4203, 4001, 3008, 1.0, 'củ'),
    (4204, 4002, 3001, 0.30, 'kg'),
    (4205, 4002, 3009, 0.20, 'kg'),
    (4206, 4002, 3007, 1.0, 'củ'),
    (4207, 4003, 3003, 0.25, 'kg'),
    (4208, 4003, 3004, 2.0, 'củ'),
    (4209, 4003, 3008, 1.0, 'củ'),
    (4210, 4004, 3002, 0.40, 'kg'),
    (4211, 4004, 3007, 1.0, 'củ'),
    (4212, 4004, 3008, 2.0, 'tép'),
    (4213, 4005, 3006, 0.20, 'kg'),
    (4214, 4005, 3005, 0.12, 'kg'),
    (4215, 4005, 3010, 2.0, 'quả')
ON CONFLICT (id) DO NOTHING;

INSERT INTO dish (id, dish_type, name, description, image_url, calories, recipe_id)
VALUES
    (4301, 'MAIN', 'Bò cuộn phô mai', 'Món bò cuộn phô mai kiểu gia đình.', NULL, 430, 4001),
    (4302, 'MAIN', 'Bò xào nấm', 'Món bò xào nấm thơm và mềm.', NULL, 360, 4002),
    (4303, 'SIDE', 'Rau cải xào cà rốt', 'Món rau xào nhẹ cho bữa cơm.', NULL, 180, 4003),
    (4304, 'MAIN', 'Thịt lợn rim mặn ngọt', 'Món rim đậm vị dễ ăn.', NULL, 390, 4004),
    (4305, 'MAIN', 'Mì Ý phô mai trứng', 'Món mì Ý béo ngậy cho bữa nhanh.', NULL, 450, 4005)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory (id, household_id)
VALUES (3001, 1001)
ON CONFLICT (id) DO NOTHING;

INSERT INTO meal (id, household_id, meal_type, schedule_date, schedule_time, status)
SELECT v.id,
       1001,
       v.meal_type,
       CURRENT_DATE - (v.day_offset || ' days')::interval,
       (CURRENT_DATE - (v.day_offset || ' days')::interval) + v.meal_time,
       'COMPLETED'
FROM (
    VALUES
        (7001, 'BREAKFAST', 1, TIME '07:15:00'),
        (7002, 'LUNCH', 2, TIME '12:15:00'),
        (7003, 'DINNER', 3, TIME '19:00:00'),
        (7004, 'BREAKFAST', 4, TIME '07:00:00'),
        (7005, 'LUNCH', 5, TIME '12:45:00'),
        (7006, 'DINNER', 6, TIME '18:30:00'),
        (7007, 'BREAKFAST', 7, TIME '07:20:00'),
        (7008, 'LUNCH', 8, TIME '12:00:00'),
        (7009, 'DINNER', 10, TIME '19:10:00'),
        (7010, 'BREAKFAST', 12, TIME '07:10:00'),
        (7011, 'LUNCH', 14, TIME '12:30:00'),
        (7012, 'DINNER', 16, TIME '18:50:00'),
        (7013, 'BREAKFAST', 18, TIME '07:05:00'),
        (7014, 'LUNCH', 21, TIME '12:20:00'),
        (7015, 'DINNER', 24, TIME '19:25:00')
) AS v(id, meal_type, day_offset, meal_time)
ON CONFLICT (id) DO NOTHING;

INSERT INTO meal_dish (id, meal_id, dish_id, note)
VALUES
    (8001, 7001, 4301, 'Bữa sáng giàu đạm'),
    (8002, 7001, 4303, 'Ăn kèm rau'),
    (8003, 7002, 4302, 'Bữa trưa cân bằng'),
    (8004, 7002, 4303, 'Món phụ'),
    (8005, 7003, 4304, 'Bữa tối no bụng'),
    (8006, 7003, 4305, 'Món tráng miệng mặn'),
    (8007, 7004, 4305, 'Bữa sáng nhanh'),
    (8008, 7004, 4303, 'Ăn kèm rau'),
    (8009, 7005, 4301, 'Bữa trưa đặc biệt'),
    (8010, 7005, 4302, 'Món chính'),
    (8011, 7006, 4304, 'Bữa tối gia đình'),
    (8012, 7006, 4303, 'Món rau'),
    (8013, 7007, 4302, 'Bữa sáng muộn'),
    (8014, 7007, 4305, 'Món phụ'),
    (8015, 7008, 4303, 'Bữa trưa nhẹ'),
    (8016, 7008, 4301, 'Món chính'),
    (8017, 7009, 4305, 'Bữa tối cuối tuần'),
    (8018, 7009, 4304, 'Món chính'),
    (8019, 7010, 4301, 'Bữa sáng giàu năng lượng'),
    (8020, 7010, 4303, 'Món phụ'),
    (8021, 7011, 4302, 'Bữa trưa nhanh'),
    (8022, 7012, 4304, 'Bữa tối đậm vị'),
    (8023, 7013, 4305, 'Bữa sáng cho gia đình'),
    (8024, 7014, 4303, 'Món rau'),
    (8025, 7015, 4301, 'Bữa tối hoàn chỉnh')
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
VALUES
    (9001, 3001, 3001, 0.80, 'kg', CURRENT_DATE - INTERVAL '29 days', CURRENT_DATE - INTERVAL '2 days', 'WASTED', 'fridge', true),
    (9002, 3001, 3002, 1.20, 'kg', CURRENT_DATE - INTERVAL '27 days', CURRENT_DATE - INTERVAL '1 days', 'WASTED', 'fridge', true),
    (9003, 3001, 3003, 0.50, 'kg', CURRENT_DATE - INTERVAL '24 days', CURRENT_DATE - INTERVAL '4 days', 'WASTED', 'fridge', true),
    (9004, 3001, 3004, 0.60, 'kg', CURRENT_DATE - INTERVAL '22 days', CURRENT_DATE - INTERVAL '6 days', 'WASTED', 'fridge', true),
    (9005, 3001, 3005, 0.25, 'kg', CURRENT_DATE - INTERVAL '20 days', CURRENT_DATE - INTERVAL '5 days', 'WASTED', 'freezer', true),
    (9006, 3001, 3006, 0.40, 'kg', CURRENT_DATE - INTERVAL '18 days', CURRENT_DATE - INTERVAL '3 days', 'WASTED', 'dry', true),
    (9007, 3001, 3007, 1.00, 'củ', CURRENT_DATE - INTERVAL '16 days', CURRENT_DATE - INTERVAL '2 days', 'WASTED', 'fridge', true),
    (9008, 3001, 3008, 0.30, 'kg', CURRENT_DATE - INTERVAL '14 days', CURRENT_DATE - INTERVAL '1 days', 'WASTED', 'dry', true),
    (9009, 3001, 3009, 0.35, 'kg', CURRENT_DATE - INTERVAL '12 days', CURRENT_DATE - INTERVAL '2 days', 'WASTED', 'fridge', true),
    (9010, 3001, 3010, 6.00, 'quả', CURRENT_DATE - INTERVAL '10 days', CURRENT_DATE - INTERVAL '1 days', 'WASTED', 'fridge', true)
ON CONFLICT (id) DO NOTHING;

SELECT setval(pg_get_serial_sequence('category', 'id'), COALESCE((SELECT MAX(id) FROM category), 1), true);
SELECT setval(pg_get_serial_sequence('food', 'id'), COALESCE((SELECT MAX(id) FROM food), 1), true);
SELECT setval(pg_get_serial_sequence('recipe', 'id'), COALESCE((SELECT MAX(id) FROM recipe), 1), true);
SELECT setval(pg_get_serial_sequence('recipe_step', 'id'), COALESCE((SELECT MAX(id) FROM recipe_step), 1), true);
SELECT setval(pg_get_serial_sequence('recipe_food', 'id'), COALESCE((SELECT MAX(id) FROM recipe_food), 1), true);
SELECT setval(pg_get_serial_sequence('dish', 'id'), COALESCE((SELECT MAX(id) FROM dish), 1), true);
SELECT setval(pg_get_serial_sequence('meal', 'id'), COALESCE((SELECT MAX(id) FROM meal), 1), true);
SELECT setval(pg_get_serial_sequence('meal_dish', 'id'), COALESCE((SELECT MAX(id) FROM meal_dish), 1), true);
SELECT setval(pg_get_serial_sequence('inventory', 'id'), COALESCE((SELECT MAX(id) FROM inventory), 1), true);
SELECT setval(pg_get_serial_sequence('inventory_batch', 'id'), COALESCE((SELECT MAX(id) FROM inventory_batch), 1), true);