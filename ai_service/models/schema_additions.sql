-- AI Service schema additions
-- Toan bo SQL idempotent: co the chay lai an toan

CREATE EXTENSION IF NOT EXISTS vector;

-- pg_trgm phu vu trigram similarity search cho sparse leg cua hybrid search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Bo sung truong AI-specific vao bang recipe (idempotent)
-- Bang 'recipe' la tên thực tế trong DB (singular, khong phai 'recipes')
ALTER TABLE recipe ADD COLUMN IF NOT EXISTS cuisine_type VARCHAR(100);
ALTER TABLE recipe ADD COLUMN IF NOT EXISTS season_tags JSONB DEFAULT '[]';
ALTER TABLE recipe ADD COLUMN IF NOT EXISTS meal_type_tags JSONB DEFAULT '[]';
ALTER TABLE recipe ADD COLUMN IF NOT EXISTS diet_compatible JSONB DEFAULT '[]';
ALTER TABLE recipe ADD COLUMN IF NOT EXISTS allergen_contains JSONB DEFAULT '[]';
ALTER TABLE recipe ADD COLUMN IF NOT EXISTS min_serving INT DEFAULT 1;
ALTER TABLE recipe ADD COLUMN IF NOT EXISTS max_serving INT DEFAULT 10;

-- Moi Recipe co 2 chunk: overview (semantic matching) va ingredients (keyword matching)
-- Vector duoc luu truc tiep trong PostgreSQL qua pgvector, khong can vector DB ngoai
-- Thiet ke nay don gian hoa infrastructure ma van dat chat luong retrieval tot voi dataset
-- quy mo vua (< 100k recipes) nhu trong du an nay
CREATE TABLE IF NOT EXISTS recipe_embeddings (
    id              SERIAL PRIMARY KEY,
    recipe_id       INT NOT NULL REFERENCES recipe(id) ON DELETE CASCADE,
    chunk_type      VARCHAR(20) NOT NULL CHECK (chunk_type IN ('overview', 'ingredients')),
    chunk_content   TEXT NOT NULL,
    embedding       vector(3072),
    embedding_model VARCHAR(100) NOT NULL,
    created_at      TIMESTAMP DEFAULT NOW(),
    updated_at      TIMESTAMP DEFAULT NOW(),
    UNIQUE (recipe_id, chunk_type)
);

-- ANN index (HNSW/IVFFlat) khong ho tro vector 3072 dimensions tren pgvector hien tai
-- Tam thoi bo qua index nay de service startup on dinh, co the giam dimension hoac doi chien luoc index sau

-- GIN index cho trigram search tren chunk_content (sparse leg)
CREATE INDEX IF NOT EXISTS idx_recipe_embeddings_trgm
    ON recipe_embeddings
    USING gin (chunk_content gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_recipe_embeddings_recipe_id
    ON recipe_embeddings (recipe_id);
