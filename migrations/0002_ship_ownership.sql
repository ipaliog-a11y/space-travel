-- Ship Ownership System Database Schema
-- Version: 0.1.0
-- Date: 2026-08-27
-- Description: Core tables for ship ownership, wear tracking, and hardpoint upgrades

-- ============================================================================
-- ENUMS
-- ============================================================================

-- Ship types available in the game
CREATE TYPE ship_type AS ENUM (
  'courier',
  'hauler',
  'scout',
  'clipper',
  'tender',
  'tug'
);

-- Wear tier classifications (calculated from wear points)
CREATE TYPE wear_tier AS ENUM (
  'excellent',  -- 0-20% wear, 0% penalty
  'good',       -- 21-40% wear, -5% penalty
  'fair',       -- 41-60% wear, -10% penalty
  'poor',       -- 61-80% wear, -15% penalty
  'critical'    -- 81-100% wear, -25% penalty
);

-- Hardpoint upgrade tiers
CREATE TYPE hardpoint_tier AS ENUM (
  'stock',  -- Tier 0: No upgrade
  'mk1',    -- Tier 1: +10 wear pool
  'mk2',    -- Tier 2: +20 wear pool
  'mk3'     -- Tier 3: +30 wear pool
);

-- ============================================================================
-- TABLES
-- ============================================================================

-- Player ships table: Tracks which ships a player owns and their condition
CREATE TABLE player_ships (
  -- Unique identifier for this ship instance
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Which player owns this ship
  player_id UUID NOT NULL,
  
  -- The ship type (courier, hauler, etc.)
  ship_type ship_type NOT NULL,
  
  -- Current wear points (0 to max_wear_pool + hardpoint_bonus)
  wear_points INT DEFAULT 0 NOT NULL,
  
  -- Hardpoint upgrade level (stock, mk1, mk2, mk3)
  hardpoint_tier hardpoint_tier DEFAULT 'stock' NOT NULL,
  
  -- Timestamps for tracking
  purchased_at TIMESTAMPTZ DEFAULT NOW(),
  last_repaired_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT player_ships_wear_points_check CHECK (wear_points >= 0),
  CONSTRAINT player_ships_player_id_fk FOREIGN KEY (player_id) REFERENCES players(id)
);

-- Index for fast lookups by player
CREATE INDEX idx_player_ships_player_id ON player_ships(player_id);

-- Index for fast lookups by ship type
CREATE INDEX idx_player_ships_type ON player_ships(ship_type);

-- Composite index for common query pattern
CREATE INDEX idx_player_ships_player_type ON player_ships(player_id, ship_type);

-- ============================================================================
-- Helper Functions
-- ============================================================================

-- Function: Get base wear pool for a ship type
CREATE OR REPLACE FUNCTION get_base_wear_pool(ship ship_type)
RETURNS INT AS $$
BEGIN
  RETURN CASE ship
    WHEN 'courier' THEN 90
    WHEN 'hauler' THEN 120
    WHEN 'scout' THEN 95
    WHEN 'clipper' THEN 90
    WHEN 'tender' THEN 115
    WHEN 'tug' THEN 100
    ELSE 100  -- Default fallback
  END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function: Get hardpoint bonus wear pool
CREATE OR REPLACE FUNCTION get_hardpoint_bonus(tier hardpoint_tier)
RETURNS INT AS $$
BEGIN
  RETURN CASE tier
    WHEN 'stock' THEN 0
    WHEN 'mk1' THEN 10
    WHEN 'mk2' THEN 20
    WHEN 'mk3' THEN 30
    ELSE 0
  END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function: Calculate max wear pool for a specific ship
CREATE OR REPLACE FUNCTION get_max_wear_pool(ship player_ships)
RETURNS INT AS $$
BEGIN
  RETURN get_base_wear_pool(ship.ship_type) + get_hardpoint_bonus(ship.hardpoint_tier);
END;
$$ LANGUAGE plpgsql STABLE;

-- Function: Calculate wear tier from current wear points
CREATE OR REPLACE FUNCTION calculate_wear_tier(ship player_ships)
RETURNS wear_tier AS $$
DECLARE
  max_wear INT;
  percentage NUMERIC;
BEGIN
  max_wear := get_max_wear_pool(ship);
  percentage := ship.wear_points::NUMERIC / max_wear::NUMERIC;
  
  IF percentage <= 0.20 THEN
    RETURN 'excellent'::wear_tier;
  ELSIF percentage <= 0.40 THEN
    RETURN 'good'::wear_tier;
  ELSIF percentage <= 0.60 THEN
    RETURN 'fair'::wear_tier;
  ELSIF percentage <= 0.80 THEN
    RETURN 'poor'::wear_tier;
  ELSE
    RETURN 'critical'::wear_tier;
  END IF;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function: Calculate efficiency penalty based on wear
CREATE OR REPLACE FUNCTION get_wear_penalty(ship player_ships)
RETURNS NUMERIC AS $$
DECLARE
  tier wear_tier;
BEGIN
  tier := calculate_wear_tier(ship);
  
  RETURN CASE tier
    WHEN 'excellent' THEN 0.00
    WHEN 'good' THEN 0.05
    WHEN 'fair' THEN 0.10
    WHEN 'poor' THEN 0.15
    WHEN 'critical' THEN 0.25
    ELSE 0.00
  END;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function: Calculate resale value based on wear
CREATE OR REPLACE FUNCTION calculate_resale_value(ship player_ships, base_value NUMERIC)
RETURNS NUMERIC AS $$
DECLARE
  max_wear INT;
  wear_percentage NUMERIC;
  base_resale NUMERIC;
  wear_penalty NUMERIC;
BEGIN
  max_wear := get_max_wear_pool(ship);
  wear_percentage := LEAST(ship.wear_points::NUMERIC / max_wear::NUMERIC, 1.0);
  base_resale := base_value * 0.70;  -- 30% base depreciation
  wear_penalty := base_resale * wear_percentage * 0.40;  -- Up to 40% reduction for wear
  
  RETURN GREATEST(base_resale - wear_penalty, base_value * 0.10);  -- Minimum 10% of base value
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================================
-- Triggers
-- ============================================================================

-- Trigger: Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_player_ships_updated_at
  BEFORE UPDATE ON player_ships
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- Sample Data (for testing)
-- ============================================================================

-- This section would be populated by actual gameplay
-- Example:
-- INSERT INTO player_ships (player_id, ship_type, wear_points, hardpoint_tier)
-- VALUES ('player-uuid-123', 'courier', 15, 'stock');

-- ============================================================================
-- Documentation
-- ============================================================================

COMMENT ON TABLE player_ships IS 'Tracks player-owned ships with wear and upgrade state';
COMMENT ON COLUMN player_ships.wear_points IS 'Current wear accumulation (0 to max_wear_pool)';
COMMENT ON COLUMN player_ships.hardpoint_tier IS 'Reliability upgrade level (stock/mk1/mk2/mk3)';
COMMENT ON FUNCTION get_base_wear_pool IS 'Returns base wear pool for ship type (90-120 points)';
COMMENT ON FUNCTION get_hardpoint_bonus IS 'Returns hardpoint bonus (+0/+10/+20/+30 points)';
COMMENT ON FUNCTION calculate_wear_tier IS 'Calculates wear tier based on percentage of max pool';
COMMENT ON FUNCTION get_wear_penalty IS 'Returns efficiency penalty (0.00 to 0.25) based on wear tier';
COMMENT ON FUNCTION calculate_resale_value IS 'Calculates resale value with depreciation and wear penalties';
