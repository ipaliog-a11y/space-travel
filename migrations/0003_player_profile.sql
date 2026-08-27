-- Migration 0003: Add player profile fields
-- Adds call sign, icon selection, and credits to player profiles

-- Add new columns to players table
ALTER TABLE players
ADD COLUMN IF NOT EXISTS call_sign VARCHAR(20),
ADD COLUMN IF NOT EXISTS icon_id VARCHAR(50) DEFAULT 'pilot-01',
ADD COLUMN IF NOT EXISTS profile_created_at TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS credits BIGINT DEFAULT 1000;

-- Add check constraints
ALTER TABLE players
DROP CONSTRAINT IF EXISTS players_call_sign_check;

ALTER TABLE players
ADD CONSTRAINT players_call_sign_check 
  CHECK (call_sign IS NULL OR (length(call_sign) >= 3 AND length(call_sign) <= 20));

-- Add credits check constraint
ALTER TABLE players
DROP CONSTRAINT IF EXISTS players_credits_check;

ALTER TABLE players
ADD CONSTRAINT players_credits_check 
  CHECK (credits >= 0);

-- Update existing players with default values
UPDATE players 
SET 
  call_sign = COALESCE(call_sign, UPPER(SUBSTRING(display_name FROM 1 FOR 20))),
  icon_id = COALESCE(icon_id, 'pilot-01'),
  credits = COALESCE(credits, 1000)
WHERE call_sign IS NULL OR icon_id IS NULL;

-- Make call_sign NOT NULL after populating
ALTER TABLE players 
ALTER COLUMN call_sign SET NOT NULL;
