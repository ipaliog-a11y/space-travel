/**
 * Ship Ownership System - Server Functions
 * Version: 0.1.0
 * Date: 2026-08-27
 */

import { getSql } from '../db.ts';
import type { PlayerShip, ShipType, HardpointTier, WearTier } from './types.ts';
import {
  getMaxWearPool,
  calculateWearTier,
  calculateWearPenalty,
  calculateResaleValue,
  getNextHardpointTier,
  getUpgradeCost,
  SHIP_DEFINITIONS,
  HARDPOINT_COSTS,
} from './types.ts';

// ============================================================================
// Ship Acquisition
// ============================================================================

/**
 * Acquire a new ship for a player
 * @param playerId - Player ID
 * @param shipType - Type of ship to acquire
 * @param purchasePrice - Purchase price in credits
 * @returns The newly created ship
 */
export async function acquireShip(
  playerId: string,
  shipType: ShipType,
  purchasePrice: number
): Promise<PlayerShip> {
  const sql = await getSql();
  
  // Check if player already owns this ship type
  const existing = await sql<PlayerShip>`
    SELECT * FROM player_ships
    WHERE player_id = ${playerId} AND ship_type = ${shipType}
  `;
  
  if (existing.length > 0) {
    throw new Error(`Player already owns a ${shipType}`);
  }
  
  // Create the ship
  const result = await sql<PlayerShip>`
    INSERT INTO player_ships (player_id, ship_type, wear_points, hardpoint_tier, purchased_at)
    VALUES (${playerId}, ${shipType}, 0, 'stock', NOW())
    RETURNING *
  `;
  
  return result[0];
}

/**
 * Sell a ship
 * @param playerId - Player ID
 * @param shipId - Ship ID to sell
 * @param baseValue - Base value of the ship for resale calculation
 * @returns Resale value in credits
 */
export async function sellShip(
  playerId: string,
  shipId: string,
  baseValue: number
): Promise<number> {
  const sql = await getSql();
  
  // Get the ship
  const ships = await sql<PlayerShip>`
    SELECT * FROM player_ships
    WHERE id = ${shipId} AND player_id = ${playerId}
  `;
  
  if (ships.length === 0) {
    throw new Error('Ship not found');
  }
  
  const ship = ships[0];
  
  // Calculate resale value
  const resaleValue = calculateResaleValue(
    baseValue,
    ship.wearPoints,
    ship.shipType,
    ship.hardpointTier
  );
  
  // Remove the ship
  await sql`
    DELETE FROM player_ships
    WHERE id = ${shipId} AND player_id = ${playerId}
  `;
  
  return resaleValue;
}

// ============================================================================
// Wear Management
// ============================================================================

/**
 * Add wear to a ship
 * @param shipId - Ship ID
 * @param wearAmount - Amount of wear to add
 * @returns Updated wear configuration
 */
export async function addWear(
  shipId: string,
  wearAmount: number
): Promise<{
  wearPoints: number;
  maxWear: number;
  tier: WearTier;
  penalty: number;
}> {
  const sql = await getSql();
  
  // Update wear points
  const result = await sql<PlayerShip>`
    UPDATE player_ships
    SET wear_points = wear_points + ${wearAmount},
        updated_at = NOW()
    WHERE id = ${shipId}
    RETURNING *
  `;
  
  if (result.length === 0) {
    throw new Error('Ship not found');
  }
  
  const ship = result[0];
  const maxWear = getMaxWearPool(ship.shipType, ship.hardpointTier);
  
  return {
    wearPoints: ship.wearPoints,
    maxWear,
    tier: calculateWearTier(ship.wearPoints, maxWear),
    penalty: calculateWearPenalty(ship.wearPoints, maxWear),
  };
}

/**
 * Add wear based on activity type
 * @param shipId - Ship ID
 * @param activity - Activity type
 * @param duration - Duration in minutes (for time-based activities)
 * @returns Updated wear configuration
 */
export async function addWearForActivity(
  shipId: string,
  activity: 'normal_flight' | 'boosting' | 'hyperspace' | 'docking' | 'emergency_landing',
  duration?: number
): Promise<{
  wearPoints: number;
  maxWear: number;
  tier: WearTier;
  penalty: number;
}> {
  const wearRates: Record<string, number> = {
    normal_flight: 0.1,
    boosting: 0.3,
    hyperspace: 0.5,
    docking: 1.0,
    emergency_landing: 5.0,
  };
  
  let wearAmount: number;
  
  if (activity === 'normal_flight' || activity === 'boosting') {
    if (!duration) {
      throw new Error(`Duration required for ${activity}`);
    }
    wearAmount = wearRates[activity] * duration;
  } else {
    wearAmount = wearRates[activity];
  }
  
  return addWear(shipId, wearAmount);
}

/**
 * Repair a ship (reduce wear points)
 * @param shipId - Ship ID
 * @param repairAmount - Amount of wear to remove (default: full repair)
 * @param repairCost - Cost of repair in credits
 * @returns Updated wear configuration
 */
export async function repairShip(
  shipId: string,
  repairAmount?: number,
  repairCost?: number
): Promise<{
  wearPoints: number;
  maxWear: number;
  tier: WearTier;
  penalty: number;
}> {
  const sql = await getSql();
  
  // Get current ship state
  const ships = await sql<PlayerShip>`
    SELECT * FROM player_ships
    WHERE id = ${shipId}
  `;
  
  if (ships.length === 0) {
    throw new Error('Ship not found');
  }
  
  const ship = ships[0];
  const maxWear = getMaxWearPool(ship.shipType, ship.hardpointTier);
  
  // Calculate repair amount if not specified (full repair)
  const actualRepairAmount = repairAmount !== undefined ? repairAmount : ship.wearPoints;
  const newWearPoints = Math.max(0, ship.wearPoints - actualRepairAmount);
  
  // Update ship
  const result = await sql<PlayerShip>`
    UPDATE player_ships
    SET wear_points = ${newWearPoints},
        last_repaired_at = NOW(),
        updated_at = NOW()
    WHERE id = ${shipId}
    RETURNING *
  `;
  
  const repairedShip = result[0];
  
  return {
    wearPoints: newWearPoints,
    maxWear,
    tier: calculateWearTier(newWearPoints, maxWear),
    penalty: calculateWearPenalty(newWearPoints, maxWear),
  };
}

// ============================================================================
// Hardpoint Upgrades
// ============================================================================

/**
 * Upgrade ship hardpoint
 * @param shipId - Ship ID
 * @param targetTier - Target hardpoint tier
 * @param playerId - Player ID (for ownership verification)
 * @returns Updated ship with new hardpoint tier
 */
export async function upgradeHardpoint(
  shipId: string,
  targetTier: HardpointTier,
  playerId: string
): Promise<PlayerShip> {
  const sql = await getSql();
  
  // Get current ship
  const ships = await sql<PlayerShip>`
    SELECT * FROM player_ships
    WHERE id = ${shipId} AND player_id = ${playerId}
  `;
  
  if (ships.length === 0) {
    throw new Error('Ship not found');
  }
  
  const ship = ships[0];
  
  // Validate upgrade path
  const nextTier = getNextHardpointTier(ship.hardpointTier);
  if (!nextTier) {
    throw new Error('Ship already at maximum hardpoint tier');
  }
  
  if (targetTier !== nextTier) {
    throw new Error(`Invalid upgrade path. Next tier is ${nextTier}, not ${targetTier}`);
  }
  
  // Upgrade the hardpoint
  const result = await sql<PlayerShip>`
    UPDATE player_ships
    SET hardpoint_tier = ${targetTier},
        updated_at = NOW()
    WHERE id = ${shipId} AND player_id = ${playerId}
    RETURNING *
  `;
  
  return result[0];
}

/**
 * Get hardpoint upgrade cost for a ship
 * @param shipId - Ship ID
 * @param targetTier - Target tier
 * @param playerId - Player ID
 * @returns Upgrade cost in credits
 */
export async function getHardpointUpgradeCost(
  shipId: string,
  targetTier: HardpointTier,
  playerId: string
): Promise<number> {
  const sql = await getSql();
  
  const ships = await sql<PlayerShip>`
    SELECT * FROM player_ships
    WHERE id = ${shipId} AND player_id = ${playerId}
  `;
  
  if (ships.length === 0) {
    throw new Error('Ship not found');
  }
  
  const ship = ships[0];
  return getUpgradeCost(ship.hardpointTier, targetTier);
}

// ============================================================================
// Queries
// ============================================================================

/**
 * Get all ships for a player
 * @param playerId - Player ID
 * @returns Array of player ships
 */
export async function getPlayerShips(playerId: string): Promise<PlayerShip[]> {
  const sql = await getSql();
  return sql<PlayerShip>`
    SELECT * FROM player_ships
    WHERE player_id = ${playerId}
    ORDER BY ship_type, created_at
  `;
}

/**
 * Get a specific ship by ID
 * @param shipId - Ship ID
 * @param playerId - Player ID (for ownership verification)
 * @returns Ship details with wear configuration
 */
export async function getShipDetails(
  shipId: string,
  playerId: string
): Promise<{
  ship: PlayerShip;
  wearConfig: {
    points: number;
    maxPoints: number;
    tier: WearTier;
    penalty: number;
    percentage: number;
  };
  definition: typeof SHIP_DEFINITIONS[ShipType];
} | null> {
  const sql = await getSql();
  
  const ships = await sql<PlayerShip>`
    SELECT * FROM player_ships
    WHERE id = ${shipId} AND player_id = ${playerId}
  `;
  
  if (ships.length === 0) {
    return null;
  }
  
  const ship = ships[0];
  const maxWear = getMaxWearPool(ship.shipType, ship.hardpointTier);
  
  return {
    ship,
    wearConfig: {
      points: ship.wearPoints,
      maxPoints: maxWear,
      tier: calculateWearTier(ship.wearPoints, maxWear),
      penalty: calculateWearPenalty(ship.wearPoints, maxWear),
      percentage: ship.wearPoints / maxWear,
    },
    definition: SHIP_DEFINITIONS[ship.shipType],
  };
}

/**
 * Check if a player owns a specific ship type
 * @param playerId - Player ID
 * @param shipType - Ship type to check
 * @returns True if player owns this ship type
 */
export async function playerOwnsShipType(
  playerId: string,
  shipType: ShipType
): Promise<boolean> {
  const sql = await getSql();
  
  const result = await sql<{ count: number }>`
    SELECT COUNT(*) as count
    FROM player_ships
    WHERE player_id = ${playerId} AND ship_type = ${shipType}
  `;
  
  return result[0].count > 0;
}
