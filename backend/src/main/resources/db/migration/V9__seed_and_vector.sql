-- Flyway V9 - Seed data and vector setup for AI chat / RAG
-- Purpose:
-- 1) Enable pgvector
-- 2) Create recipe_vectors table for embeddings
-- 3) Seed a small cold-start knowledge base for recipes
--
-- Notes:
-- - This script assumes PostgreSQL 15.
-- - Embedding dimension is set to 768 as a practical default for Gemini-style embeddings.
--   Adjust if the selected embedding model returns a different dimension.

CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS recipe_vectors (
    id BIGSERIAL PRIMARY KEY,
    recipe_id INT NOT NULL UNIQUE,
    source_text TEXT NOT NULL,
    content_hash VARCHAR(128) NOT NULL,
    embedding vector(768) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_recipe_vectors_recipe FOREIGN KEY (recipe_id) REFERENCES recipe(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_recipe_vectors_recipe_id ON recipe_vectors(recipe_id);
CREATE INDEX IF NOT EXISTS idx_recipe_vectors_embedding ON recipe_vectors USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- ============================================================
-- Seed data: categories
-- ============================================================
INSERT INTO category (name)
SELECT v.name
FROM (VALUES
    ('Thịt'),
    ('Rau'),
    ('Trứng')
) AS v(name)
WHERE NOT EXISTS (
    SELECT 1 FROM category c WHERE lower(c.name) = lower(v.name)
);

-- ============================================================
-- Seed data: foods
-- ============================================================
INSERT INTO food (name, default_shelf_life_day, category_id)
SELECT v.name, v.default_shelf_life_day, c.id
FROM (VALUES
    ('Thịt bò', 5, 'Thịt'),
    ('Thịt heo', 4, 'Thịt'),
    ('Cà rốt', 10, 'Rau'),
    ('Rau cải', 5, 'Rau'),
    ('Trứng gà', 14, 'Trứng')
) AS v(name, default_shelf_life_day, category_name)
JOIN category c ON lower(c.name) = lower(v.category_name)
WHERE NOT EXISTS (
    SELECT 1 FROM food f WHERE lower(f.name) = lower(v.name)
);

-- ============================================================
-- Seed data: recipes
-- ============================================================
INSERT INTO recipe (name, instructions, cook_time_minutes, difficulty)
SELECT v.name, v.instructions, v.cook_time_minutes, v.difficulty
FROM (VALUES
    (
        'Bò xào cà rốt',
        'Ướp thịt bò với tỏi, tiêu và nước mắm. Xào nhanh trên lửa lớn, cho cà rốt vào sau để giữ độ giòn.',
        20,
        'Dễ'
    ),
    (
        'Trứng chiên rau',
        'Đánh trứng với gia vị, trộn rau đã thái nhỏ, chiên đến khi vàng đều.',
        15,
        'Dễ'
    ),
    (
        'Thịt heo rim',
        'Ướp thịt heo với nước mắm, đường, tiêu. Rim nhỏ lửa đến khi sệt và thấm vị.',
        30,
        'Trung bình'
    ),
    (
        'Canh rau thanh mát',
        'Đun nước dùng, cho rau vào nấu vừa chín tới, nêm nhạt để giữ vị thanh.',
        18,
        'Dễ'
    )
) AS v(name, instructions, cook_time_minutes, difficulty)
WHERE NOT EXISTS (
    SELECT 1 FROM recipe r WHERE lower(r.name) = lower(v.name)
);

-- ============================================================
-- Seed data: recipe steps
-- ============================================================
INSERT INTO recipe_step (recipe_id, step_number, instruction, media_url)
SELECT r.id, v.step_number, v.instruction, v.media_url
FROM recipe r
JOIN (VALUES
    ('Bò xào cà rốt', 1, 'Sơ chế thịt bò, cắt lát mỏng, ướp gia vị 10 phút.', NULL),
    ('Bò xào cà rốt', 2, 'Phi tỏi, xào bò trên lửa lớn rồi thêm cà rốt.', NULL),
    ('Bò xào cà rốt', 3, 'Nêm lại và tắt bếp khi cà rốt vừa chín.', NULL),
    ('Trứng chiên rau', 1, 'Đập trứng, đánh đều với muối và tiêu.', NULL),
    ('Trứng chiên rau', 2, 'Trộn rau thái nhỏ vào hỗn hợp trứng.', NULL),
    ('Trứng chiên rau', 3, 'Chiên vàng hai mặt trong chảo chống dính.', NULL),
    ('Thịt heo rim', 1, 'Rửa sạch, cắt miếng vừa ăn và ướp gia vị.', NULL),
    ('Thịt heo rim', 2, 'Áp chảo cho săn mặt, thêm nước và rim lửa nhỏ.', NULL),
    ('Canh rau thanh mát', 1, 'Đun sôi nước dùng hoặc nước lọc đã nêm nhẹ.', NULL),
    ('Canh rau thanh mát', 2, 'Cho rau vào, nấu đến khi vừa chín.', NULL)
) AS v(recipe_name, step_number, instruction, media_url)
ON lower(r.name) = lower(v.recipe_name)
WHERE NOT EXISTS (
    SELECT 1 FROM recipe_step rs
    WHERE rs.recipe_id = r.id AND rs.step_number = v.step_number
);

-- ============================================================
-- Seed data: recipe ingredients
-- ============================================================
INSERT INTO recipe_food (recipe_id, food_id, require_quantity, unit)
SELECT r.id, f.id, v.require_quantity, v.unit
FROM recipe r
JOIN (VALUES
    ('Bò xào cà rốt', 'Thịt bò', 0.3, 'kg'),
    ('Bò xào cà rốt', 'Cà rốt', 2.0, 'củ'),
    ('Bò xào cà rốt', 'Rau cải', 0.1, 'kg'),
    ('Trứng chiên rau', 'Trứng gà', 3.0, 'quả'),
    ('Trứng chiên rau', 'Rau cải', 0.15, 'kg'),
    ('Thịt heo rim', 'Thịt heo', 0.4, 'kg'),
    ('Canh rau thanh mát', 'Rau cải', 0.2, 'kg'),
    ('Canh rau thanh mát', 'Cà rốt', 1.0, 'củ')
) AS v(recipe_name, food_name, require_quantity, unit)
ON lower(r.name) = lower(v.recipe_name)
JOIN food f ON lower(f.name) = lower(v.food_name)
WHERE NOT EXISTS (
    SELECT 1 FROM recipe_food rf WHERE rf.recipe_id = r.id AND rf.food_id = f.id
);

-- ============================================================
-- Seed data: recipe vectors placeholders
-- Embeddings will be populated by the ingestion service after Gemini embedding setup.
-- Keeping empty rows here is not useful; the table is created for runtime ingestion.
-- ============================================================