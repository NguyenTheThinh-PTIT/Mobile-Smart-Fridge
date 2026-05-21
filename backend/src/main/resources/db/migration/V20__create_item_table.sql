-- V18__create_item_table.sql
-- Create dedicated Item table matching ItemEntity.java
-- Table: inventory_batch (as per @Table(name = "inventory_batch"))

CREATE TABLE IF NOT EXISTS inventory_batch (
    id BIGSERIAL PRIMARY KEY,
    inventory_id BIGINT NOT NULL REFERENCES inventory(id) ON DELETE CASCADE,
    food_id BIGINT REFERENCES food(id),
    quantity DOUBLE PRECISION NOT NULL CHECK (quantity >= 0),
    unit VARCHAR(50) NOT NULL CHECK (unit <> ''),
    entry_date DATE,
    expiration_date DATE,
    status VARCHAR(100),
    storage_section VARCHAR(255),
    is_bought BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


-- Performance indexes (PostgreSQL partial index for active stock)
CREATE INDEX IF NOT EXISTS idx_ib_inventory_id ON inventory_batch (inventory_id);
CREATE INDEX IF NOT EXISTS idx_ib_food_id ON inventory_batch (food_id);
CREATE INDEX IF NOT EXISTS idx_ib_expiration ON inventory_batch (expiration_date);
CREATE INDEX IF NOT EXISTS idx_ib_status ON inventory_batch (status);
CREATE INDEX IF NOT EXISTS idx_ib_active_stock ON inventory_batch (inventory_id) WHERE quantity > 0;

-- Data validation constraints (Production-safe PostgreSQL)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'chk_ib_quantity_positive'
    ) THEN
        ALTER TABLE inventory_batch
        ADD CONSTRAINT chk_ib_quantity_positive CHECK (quantity >= 0);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'chk_ib_unit_not_empty'
    ) THEN
        ALTER TABLE inventory_batch
        ADD CONSTRAINT chk_ib_unit_not_empty CHECK (LENGTH(TRIM(unit)) > 0);
    END IF;
END $$;

COMMENT ON TABLE inventory_batch IS 'Item entities - inventory batches tracked by ItemService/ItemRepository';
COMMENT ON COLUMN inventory_batch.inventory_id IS 'FK: User fridge (inventory)';
COMMENT ON COLUMN inventory_batch.food_id IS 'FK: Product catalog (food)';
COMMENT ON COLUMN inventory_batch.quantity IS 'Remaining quantity (>0 = active stock)';
