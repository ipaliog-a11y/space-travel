-- Base Players Table
-- Version: 0.0.1
-- Date: 2026-08-27
-- Description: Core players table required by all other systems

-- ============================================================================
-- TABLES
-- ============================================================================

-- Players table: Player profile with progression tracking
CREATE TABLE IF NOT EXISTS players (
  -- Unique identifier for player
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Player identity
  display_name VARCHAR(100) NOT NULL,
  call_sign VARCHAR(20) NOT NULL,
  icon_id VARCHAR(50) DEFAULT 'pilot-01',
  
  -- Profile completion
  profile_created_at TIMESTAMPTZ DEFAULT NOW(),
  last_login_at TIMESTAMPTZ,
  
  -- Progression tracking
  total_xp BIGINT DEFAULT 0,
  current_rank INT DEFAULT 1,
  credits BIGINT DEFAULT 1000,  -- Starting credits
  
  -- Constraints
  CONSTRAINT players_display_name_check CHECK (length(display_name) > 0 AND length(display_name) <= 100),
  CONSTRAINT players_call_sign_check CHECK (length(call_sign) >= 3 AND length(call_sign) <= 20),
  CONSTRAINT players_credits_check CHECK (credits >= 0)
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_players_id ON players(id);

-- ============================================================================
-- Triggers
-- ============================================================================

-- Auto-update last_login_at on player login (called by auth system)
CREATE OR REPLACE FUNCTION update_player_last_login()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_login_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Documentation
-- ============================================================================

COMMENT ON TABLE players IS 'Player accounts with progression tracking';
COMMENT ON COLUMN players.display_name IS 'Public player name';
COMMENT ON COLUMN players.total_xp IS 'Lifetime experience points for rank progression';
COMMENT ON COLUMN players.current_rank IS 'Current rank tier (1-15)';

-- ============================================================================
-- Sample Data (for testing)
-- ============================================================================

-- This would be populated by actual player registrations
-- INSERT INTO players (id, display_name) VALUES ('test-player-123', 'Test Pilot');
