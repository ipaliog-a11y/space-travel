/**
 * Hangar System - Types
 */

import type { ShipType, WearTier, HardpointTier } from '../ship-ownership/types';

export type { ShipType, WearTier, HardpointTier };

export interface HangarShip {
  id: string;
  playerId: string;
  shipType: ShipType;
  wearPoints: number;
  hardpointTier: HardpointTier;
  purchasedAt: Date;
  lastRepairedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  
  // Calculated fields
  wearTier: WearTier;
  wearPercentage: number;
  maxWearPool: number;
  efficiencyPenalty: number;
  resaleValue: number;
  isRepairable: boolean;
}

export interface HangarStats {
  totalShips: number;
  totalValue: number;
  averageWear: number;
  shipsByType: Record<ShipType, number>;
  shipsByWearTier: Record<WearTier, number>;
  bestConditionShip: HangarShip | null;
  worstConditionShip: HangarShip | null;
}

export interface ShipFilter {
  shipType?: ShipType;
  wearTier?: WearTier;
  hardpointTier?: HardpointTier;
  search?: string;
}

export interface ShipSort {
  field: 'purchaseDate' | 'wearPoints' | 'resaleValue' | 'shipType';
  direction: 'asc' | 'desc';
}

export interface HangarView {
  ships: HangarShip[];
  stats: HangarStats;
  filter: ShipFilter;
  sort: ShipSort;
  isLoading: boolean;
  error: string | null;
}

/** Ship type display names */
export const SHIP_TYPE_NAMES: Record<ShipType, string> = {
  courier: 'Courier',
  hauler: 'Hauler',
  scout: 'Scout',
  clipper: 'Clipper',
  tender: 'Tender',
  tug: 'Tug',
};

/** Ship type descriptions */
export const SHIP_TYPE_DESCRIPTIONS: Record<ShipType, string> = {
  courier: 'Fast and agile, perfect for quick deliveries',
  hauler: 'Heavy cargo carrier with massive storage',
  scout: 'Long-range exploration vessel',
  clipper: 'Luxury transport with premium amenities',
  tender: 'Support ship for fleet operations',
  tug: 'Industrial vessel for heavy lifting',
};

/** Wear tier colors for UI */
export const WEAR_TIER_COLORS: Record<WearTier, string> = {
  excellent: 'text-green-400 bg-green-900/30 border-green-500',
  good: 'text-blue-400 bg-blue-900/30 border-blue-500',
  fair: 'text-yellow-400 bg-yellow-900/30 border-yellow-500',
  poor: 'text-orange-400 bg-orange-900/30 border-orange-500',
  critical: 'text-red-400 bg-red-900/30 border-red-500',
};

/** Hardpoint tier display names */
export const HARDPOINT_TIER_NAMES: Record<HardpointTier, string> = {
  stock: 'Stock',
  mk1: 'Mark I',
  mk2: 'Mark II',
  mk3: 'Mark III',
};

/** Get wear tier badge styles */
export function getWearTierBadgeClass(tier: WearTier): string {
  return WEAR_TIER_COLORS[tier];
}

/** Format ship type for display */
export function formatShipType(type: ShipType): string {
  return SHIP_TYPE_NAMES[type];
}

/** Get ship icon (emoji placeholder for now) */
export function getShipIcon(type: ShipType): string {
  const icons: Record<ShipType, string> = {
    courier: '🚀',
    hauler: '🚛',
    scout: '🛸',
    clipper: '✈️',
    tender: '🚁',
    tug: '🚜',
  };
  return icons[type];
}
