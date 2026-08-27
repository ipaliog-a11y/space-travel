/**
 * Ship Ownership System - TypeScript Types
 * Version: 0.1.0
 * Date: 2026-08-27
 */

// ============================================================================
// Enums
// ============================================================================

/** Available ship types in the game */
export type ShipType = 'courier' | 'hauler' | 'scout' | 'clipper' | 'tender' | 'tug';

/** Wear tier classifications based on wear percentage */
export type WearTier = 'excellent' | 'good' | 'fair' | 'poor' | 'critical';

/** Hardpoint upgrade tiers for reliability */
export type HardpointTier = 'stock' | 'mk1' | 'mk2' | 'mk3';

// ============================================================================
// Core Types
// ============================================================================

/** Player ship instance with wear and upgrade tracking */
export interface PlayerShip {
  /** Unique identifier for this ship instance */
  id: string;
  
  /** Owner player ID */
  playerId: string;
  
  /** Ship type (courier, hauler, etc.) */
  shipType: ShipType;
  
  /** Current wear points (0 to maxWearPool) */
  wearPoints: number;
  
  /** Hardpoint upgrade level */
  hardpointTier: HardpointTier;
  
  /** Timestamps */
  purchasedAt: Date;
  lastRepairedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

/** Ship definition with base stats */
export interface ShipDefinition {
  id: ShipType;
  name: string;
  role: string;
  baseWearPool: number;  // 90-120 points
  description: string;
}

/** Hardpoint upgrade configuration */
export interface HardpointConfig {
  tier: HardpointTier;
  bonus: number;  // +0/+10/+20/+30 wear pool
  cost: number;   // Credit cost
}

/** Wear configuration */
export interface WearConfig {
  /** Current wear points */
  points: number;
  /** Maximum wear pool (base + hardpoint bonus) */
  maxPoints: number;
  /** Current wear tier */
  tier: WearTier;
  /** Efficiency penalty (0.00 to 0.25) */
  penalty: number;
  /** Percentage of wear (0.0 to 1.0) */
  percentage: number;
}

// ============================================================================
// Constants
// ============================================================================

/** Base wear pool for each ship type */
export const SHIP_WEAR_POOLS: Record<ShipType, number> = {
  courier: 90,
  hauler: 120,
  scout: 95,
  clipper: 90,
  tender: 115,
  tug: 100,
};

/** Hardpoint progression bonuses */
export const HARDPOINT_BONUSES: Record<HardpointTier, number> = {
  stock: 0,
  mk1: 10,
  mk2: 20,
  mk3: 30,
};

/** Hardpoint upgrade costs */
export const HARDPOINT_COSTS: Record<HardpointTier, number> = {
  stock: 0,
  mk1: 5000,     // 5k credits
  mk2: 15000,    // 15k credits
  mk3: 30000,    // 30k credits
};

/** Wear accumulation rates */
export const WEAR_RATES = {
  normal_flight: 0.1,       // per minute
  boosting: 0.3,            // per minute
  hyperspace: 0.5,          // per jump
  docking: 1.0,             // per event
  emergency_landing: 5.0,   // per incident
};

/** Wear tier thresholds (as percentage of max pool) */
export const WEAR_TIER_THRESHOLDS: Record<WearTier, number> = {
  excellent: 0.20,  // 0-20%
  good: 0.40,       // 21-40%
  fair: 0.60,       // 41-60%
  poor: 0.80,       // 61-80%
  critical: 1.00,   // 81-100%
};

/** Efficiency penalties per wear tier */
export const WEAR_PENALTIES: Record<WearTier, number> = {
  excellent: 0.00,  // No penalty
  good: 0.05,       // -5% efficiency
  fair: 0.10,       // -10% efficiency
  poor: 0.15,       // -15% efficiency
  critical: 0.25,   // -25% efficiency
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Calculate maximum wear pool for a ship
 */
export function getMaxWearPool(shipType: ShipType, hardpointTier: HardpointTier = 'stock'): number {
  return SHIP_WEAR_POOLS[shipType] + HARDPOINT_BONUSES[hardpointTier];
}

/**
 * Calculate current wear tier from wear points
 */
export function calculateWearTier(wearPoints: number, maxWear: number): WearTier {
  const percentage = wearPoints / maxWear;
  
  if (percentage <= WEAR_TIER_THRESHOLDS.excellent) return 'excellent';
  if (percentage <= WEAR_TIER_THRESHOLDS.good) return 'good';
  if (percentage <= WEAR_TIER_THRESHOLDS.fair) return 'fair';
  if (percentage <= WEAR_TIER_THRESHOLDS.poor) return 'poor';
  return 'critical';
}

/**
 * Calculate efficiency penalty from wear points
 */
export function calculateWearPenalty(wearPoints: number, maxWear: number): number {
  const tier = calculateWearTier(wearPoints, maxWear);
  return WEAR_PENALTIES[tier];
}

/**
 * Get full wear configuration for a ship
 */
export function getWearConfig(wearPoints: number, shipType: ShipType, hardpointTier: HardpointTier): WearConfig {
  const maxPoints = getMaxWearPool(shipType, hardpointTier);
  const percentage = wearPoints / maxPoints;
  const tier = calculateWearTier(wearPoints, maxPoints);
  const penalty = WEAR_PENALTIES[tier];
  
  return {
    points: wearPoints,
    maxPoints,
    tier,
    penalty,
    percentage,
  };
}

/**
 * Calculate resale value based on wear
 * @param baseValue - Original purchase price
 * @param wearPoints - Current wear points
 * @param shipType - Ship type for max wear calculation
 * @param hardpointTier - Hardpoint tier for max wear calculation
 */
export function calculateResaleValue(
  baseValue: number,
  wearPoints: number,
  shipType: ShipType,
  hardpointTier: HardpointTier
): number {
  const maxWear = getMaxWearPool(shipType, hardpointTier);
  const wearPercentage = Math.min(wearPoints / maxWear, 1.0);
  const baseResale = baseValue * 0.70;  // 30% base depreciation
  const wearPenalty = baseResale * wearPercentage * 0.40;  // Up to 40% reduction for wear
  
  return Math.max(baseResale - wearPenalty, baseValue * 0.10);  // Minimum 10% of base value
}

/**
 * Get next hardpoint tier
 */
export function getNextHardpointTier(current: HardpointTier): HardpointTier | null {
  const progression: HardpointTier[] = ['stock', 'mk1', 'mk2', 'mk3'];
  const currentIndex = progression.indexOf(current);
  
  if (currentIndex >= progression.length - 1) {
    return null;  // Already at max
  }
  
  return progression[currentIndex + 1];
}

/**
 * Calculate hardpoint upgrade cost
 */
export function getUpgradeCost(currentTier: HardpointTier, targetTier: HardpointTier): number {
  const progression: HardpointTier[] = ['stock', 'mk1', 'mk2', 'mk3'];
  const currentIndex = progression.indexOf(currentTier);
  const targetIndex = progression.indexOf(targetTier);
  
  if (targetIndex <= currentIndex) {
    return 0;  // Can't downgrade or same tier
  }
  
  // Sum costs of all intermediate upgrades
  let totalCost = 0;
  for (let i = currentIndex + 1; i <= targetIndex; i++) {
    totalCost += HARDPOINT_COSTS[progression[i]];
  }
  
  return totalCost;
}

// ============================================================================
// Ship Definitions (Reference)
// ============================================================================

export const SHIP_DEFINITIONS: Record<ShipType, ShipDefinition> = {
  courier: {
    id: 'courier',
    name: 'Courier',
    role: 'Packet',
    baseWearPool: 90,
    description: 'Light frame. Snaps onto a heading. Short legs.',
  },
  hauler: {
    id: 'hauler',
    name: 'Hauler',
    role: 'Bulk',
    baseWearPool: 120,
    description: 'Mass first. Slow to spool. Reaches farther.',
  },
  scout: {
    id: 'scout',
    name: 'Scout',
    role: 'Pathfinder',
    baseWearPool: 95,
    description: 'Long eye. Sample drawer. Built to log wild worlds.',
  },
  clipper: {
    id: 'clipper',
    name: 'Clipper',
    role: 'Runner',
    baseWearPool: 90,
    description: 'In-system sprint. Hot drive. Short FSD.',
  },
  tender: {
    id: 'tender',
    name: 'Tender',
    role: 'Fuel',
    baseWearPool: 115,
    description: 'Cryo spheres. Fat T1. The bay that never runs dry.',
  },
  tug: {
    id: 'tug',
    name: 'Tug',
    role: 'Harbor',
    baseWearPool: 100,
    description: 'Short legs. Hard RCS. Built to shove a lock.',
  },
};
