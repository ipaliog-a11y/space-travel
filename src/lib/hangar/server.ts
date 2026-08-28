/**
 * Hangar view helpers. Import only from createServerFn handlers
 * (see ./api.ts).
 */

import { getPlayerShips, getShipDetails as getShipDetailsFn } from "../ship-ownership/server.ts";
import {
  calculateResaleValue,
  getMaxWearPool,
  getWearConfig,
  SHIP_BASE_PRICES,
} from "../ship-ownership/types.ts";
import type { HangarShip, HangarStats } from "./types.ts";
import type { PlayerShip } from "../ship-ownership/types.ts";

export function toHangarShip(ship: PlayerShip): HangarShip {
  const wearConfig = getWearConfig(ship.wearPoints, ship.shipType, ship.hardpointTier);
  const maxWearPool = getMaxWearPool(ship.shipType, ship.hardpointTier);
  const wearPercentage = (ship.wearPoints / maxWearPool) * 100;
  const resaleValue = calculateResaleValue(
    SHIP_BASE_PRICES[ship.shipType],
    ship.wearPoints,
    ship.shipType,
    ship.hardpointTier,
  );

  return {
    ...ship,
    wearTier: wearConfig.tier,
    wearPercentage,
    maxWearPool,
    efficiencyPenalty: wearConfig.penalty,
    resaleValue: Math.round(resaleValue),
    isRepairable: ship.wearPoints > 0,
  };
}

export async function getHangarShips(playerId: string): Promise<HangarShip[]> {
  const ships = await getPlayerShips(playerId);
  return ships.map(toHangarShip);
}

export async function getHangarStats(playerId: string): Promise<HangarStats> {
  const ships = await getHangarShips(playerId);

  if (ships.length === 0) {
    return {
      totalShips: 0,
      totalValue: 0,
      averageWear: 0,
      shipsByType: {} as HangarStats["shipsByType"],
      shipsByWearTier: {} as HangarStats["shipsByWearTier"],
      bestConditionShip: null,
      worstConditionShip: null,
    };
  }

  const totalValue = ships.reduce((sum, ship) => sum + ship.resaleValue, 0);
  const averageWear = Math.round(
    ships.reduce((sum, ship) => sum + ship.wearPercentage, 0) / ships.length,
  );

  const shipsByType = ships.reduce(
    (acc, ship) => {
      acc[ship.shipType] = (acc[ship.shipType] || 0) + 1;
      return acc;
    },
    {} as HangarStats["shipsByType"],
  );

  const shipsByWearTier = ships.reduce(
    (acc, ship) => {
      acc[ship.wearTier] = (acc[ship.wearTier] || 0) + 1;
      return acc;
    },
    {} as HangarStats["shipsByWearTier"],
  );

  const sortedByCondition = [...ships].sort((a, b) => a.wearPercentage - b.wearPercentage);

  return {
    totalShips: ships.length,
    totalValue,
    averageWear,
    shipsByType,
    shipsByWearTier,
    bestConditionShip: sortedByCondition[0],
    worstConditionShip: sortedByCondition[sortedByCondition.length - 1],
  };
}

export async function getHangarShipDetails(
  playerId: string,
  shipId: string,
): Promise<HangarShip | null> {
  const details = await getShipDetailsFn(shipId, playerId);
  if (!details) return null;
  return toHangarShip(details.ship);
}
