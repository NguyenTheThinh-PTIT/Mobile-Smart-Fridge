-- V21__add_is_guest_to_user.sql
-- Fix transaction abort error in AuthService.createUser
-- Adds missing is_guest column used for QR guest accounts

ALTER TABLE "user" 
ADD COLUMN IF NOT EXISTS is_guest BOOLEAN NOT NULL DEFAULT false;

-- Index for guest filtering (used in household creation logic)
CREATE INDEX IF NOT EXISTS idx_user_is_guest ON "user" (is_guest);

COMMENT ON COLUMN "user".is_guest IS 'Flag for temporary guest accounts (QR join) - skips auto household creation';
