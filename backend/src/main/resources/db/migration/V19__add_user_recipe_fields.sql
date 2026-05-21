-- Add columns to recipe table to support user-created recipes
-- source: 'ai' for AI-generated recipes, 'user' for user-created recipes
ALTER TABLE recipe ADD COLUMN source VARCHAR(50) DEFAULT 'ai';
ALTER TABLE recipe ADD COLUMN created_by INT;
ALTER TABLE recipe ADD COLUMN household_id INT;
ALTER TABLE recipe ADD COLUMN created_date TIMESTAMP DEFAULT NOW();
ALTER TABLE recipe ADD COLUMN updated_date TIMESTAMP DEFAULT NOW();

-- Add foreign key constraints
ALTER TABLE recipe ADD CONSTRAINT fk_recipe_created_by 
  FOREIGN KEY (created_by) REFERENCES "user"(id) ON DELETE SET NULL;

ALTER TABLE recipe ADD CONSTRAINT fk_recipe_household 
  FOREIGN KEY (household_id) REFERENCES household(id) ON DELETE CASCADE;

-- Add indexes for performance
CREATE INDEX idx_recipe_household_id ON recipe(household_id);
CREATE INDEX idx_recipe_created_by ON recipe(created_by);
CREATE INDEX idx_recipe_source ON recipe(source);
