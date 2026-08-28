/**
 * Ship ownership SQL helpers. Import only from createServerFn handlers
 * (see ./api.ts), never from React components or route loaders.
 */

import { getSql } from "../db.ts";
import { getPlayerProfile } from "../player-profile/server.ts";
import type { HardpointTier, PlayerShip, ShipType, WearTier } from "./types.ts";
import {
  calculateResaleValue,
  calculateWearPenalty,
  calculateWearTier,
  getMaxWearPool,
  getNextHardpointTier,
  getUpgradeCost,
  hangarSlotCapacity,
  SHIP_DEFINITIONS,
} from "./types.ts";

type ShipRow = {
  id: string;
  player_id: string;
  ship_type: ShipType;
  wear_points: number;
  hardpoint_tier: HardpointTier;
  purchased_at: Date;
  last_repaired_at: Date | null;
  created_at: Date;
  updated_at: Date;
};

export function mapShip(row: ShipRow): PlayerShip {
  return {
    id: row.id,
    playerId: row.player_id,
    shipType: row.ship_type,
    wearPoints: Number(row.wear_points ?? 0),
    hardpointTier: row.hardpoint_tier,
    purchasedAt: row.purchased_at,
    lastRepairedAt: row.last_repaired_at ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function acquireShip(playerId: string, shipType: ShipType): Promise<PlayerShip> {
  const sql = await getSql();
  const profile = await getPlayerProfile(playerId);
  if (!profile) {
    throw new Error("Create a pilot profile before acquiring a ship");
  }

  const owned = await sql<{ count: number }>`
    SELECT COUNT(*)::int as count FROM player_ships WHERE player_id = ${playerId}
  `;
  const cap = hangarSlotCapacity(profile.currentRank, profile.hangarBonusSlots);
  if (Number(owned[0].count) >= cap) {
    throw new Error(`Hangar full (${cap} bay${cap === 1 ? "" : "s"})`);
  }

  const result = await sql<ShipRow>`
    INSERT INTO player_ships (player_id, ship_type, wear_points, hardpoint_tier, purchased_at)
    VALUES (${playerId}, ${shipType}, 0, 'stock', NOW())
    RETURNING *
  `;
  return mapShip(result[0]);
}

export async function sellShip(
  playerId: string,
  shipId: string,
  baseValue: number,
): Promise<number> {
  const sql = await getSql();
  const ships = await sql<ShipRow>`
    SELECT * FROM player_ships
    WHERE id = ${shipId} AND player_id = ${playerId}
  `;
  if (ships.length === 0) throw new Error("Ship not found");

  const ship = mapShip(ships[0]);
  const resaleValue = calculateResaleValue(
    baseValue,
    ship.wearPoints,
    ship.shipType,
    ship.hardpointTier,
  );

  await sql`
    DELETE FROM player_ships
    WHERE id = ${shipId} AND player_id = ${playerId}
  `;
  return resaleValue;
}

export async function addWear(
  shipId: string,
  wearAmount: number,
): Promise<{ wearPoints: number; maxWear: number; tier: WearTier; penalty: number }> {
  const sql = await getSql();
  const current = await sql<ShipRow>`
    SELECT * FROM player_ships WHERE id = ${shipId}
  `;
  if (current.length === 0) throw new Error("Ship not found");

  const ship = mapShip(current[0]);
  const maxWear = getMaxWearPool(ship.shipType, ship.hardpointTier);
  const nextPoints = Math.min(maxWear, ship.wearPoints + wearAmount);

  const result = await sql<ShipRow>`
    UPDATE player_ships
    SET wear_points = ${nextPoints},
        updated_at = NOW()
    WHERE id = ${shipId}
    RETURNING *
  `;
  const updated = mapShip(result[0]);
  return {
    wearPoints: updated.wearPoints,
    maxWear,
    tier: calculateWearTier(updated.wearPoints, maxWear),
    penalty: calculateWearPenalty(updated.wearPoints, maxWear),
  };
}

export async function addWearForActivity(
  shipId: string,
  activity: "normal_flight" | "boosting" | "hyperspace" | "docking" | "emergency_landing",
  duration?: number,
): Promise<{ wearPoints: number; maxWear: number; tier: WearTier; penalty: number }> {
  const wearRates: Record<string, number> = {
    normal_flight: 0.1,
    boosting: 0.3,
    hyperspace: 0.5,
    docking: 1.0,
    emergency_landing: 5.0,
  };

  let wearAmount: number;
  if (activity === "normal_flight" || activity === "boosting") {
    if (!duration) throw new Error(`Duration required for ${activity}`);
    wearAmount = wearRates[activity] * duration;
  } else {
    wearAmount = wearRates[activity];
  }
  return addWear(shipId, wearAmount);
}

export async function repairShip(
  shipId: string,
  repairAmount?: number,
): Promise<{ wearPoints: number; maxWear: number; tier: WearTier; penalty: number }> {
  const sql = await getSql();
  const ships = await sql<ShipRow>`
    SELECT * FROM player_ships WHERE id = ${shipId}
  `;
  if (ships.length === 0) throw new Error("Ship not found");

  const ship = mapShip(ships[0]);
  const maxWear = getMaxWearPool(ship.shipType, ship.hardpointTier);
  const actualRepairAmount = repairAmount !== undefined ? repairAmount : ship.wearPoints;
  const newWearPoints = Math.max(0, ship.wearPoints - actualRepairAmount);

  await sql`
    UPDATE player_ships
    SET wear_points = ${newWearPoints},
        last_repaired_at = NOW(),
        updated_at = NOW()
    WHERE id = ${shipId}
  `;

  return {
    wearPoints: newWearPoints,
    maxWear,
    tier: calculateWearTier(newWearPoints, maxWear),
    penalty: calculateWearPenalty(newWearPoints, maxWear),
  };
}

export async function upgradeHardpoint(
  shipId: string,
  targetTier: HardpointTier,
  playerId: string,
): Promise<PlayerShip> {
  const sql = await getSql();
  const ships = await sql<ShipRow>`
    SELECT * FROM player_ships
    WHERE id = ${shipId} AND player_id = ${playerId}
  `;
  if (ships.length === 0) throw new Error("Ship not found");

  const ship = mapShip(ships[0]);
  const nextTier = getNextHardpointTier(ship.hardpointTier);
  if (!nextTier) throw new Error("Ship already at maximum hardpoint tier");
  if (targetTier !== nextTier) {
    throw new Error(`Invalid upgrade path. Next tier is ${nextTier}, not ${targetTier}`);
  }

  const result = await sql<ShipRow>`
    UPDATE player_ships
    SET hardpoint_tier = ${targetTier},
        updated_at = NOW()
    WHERE id = ${shipId} AND player_id = ${playerId}
    RETURNING *
  `;
  return mapShip(result[0]);
}

export async function getHardpointUpgradeCost(
  shipId: string,
  targetTier: HardpointTier,
  playerId: string,
): Promise<number> {
  const sql = await getSql();
  const ships = await sql<ShipRow>`
    SELECT * FROM player_ships
    WHERE id = ${shipId} AND player_id = ${playerId}
  `;
  if (ships.length === 0) throw new Error("Ship not found");
  return getUpgradeCost(mapShip(ships[0]).hardpointTier, targetTier);
}

export async function getPlayerShips(playerId: string): Promise<PlayerShip[]> {
  const sql = await getSql();
  const rows = await sql<ShipRow>`
    SELECT * FROM player_ships
    WHERE player_id = ${playerId}
    ORDER BY ship_type, created_at
  `;
  return rows.map(mapShip);
}

export async function getShipDetails(
  shipId: string,
  playerId: string,
): Promise<{
  ship: PlayerShip;
  wearConfig: {
    points: number;
    maxPoints: number;
    tier: WearTier;
    penalty: number;
    percentage: number;
  };
  definition: (typeof SHIP_DEFINITIONS)[ShipType];
} | null> {
  const sql = await getSql();
  const ships = await sql<ShipRow>`
    SELECT * FROM player_ships
    WHERE id = ${shipId} AND player_id = ${playerId}
  `;
  if (ships.length === 0) return null;

  const ship = mapShip(ships[0]);
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

export async function playerOwnsShipType(
  playerId: string,
  shipType: ShipType,
): Promise<boolean> {
  const sql = await getSql();
  const result = await sql<{ count: number }>`
    SELECT COUNT(*)::int as count
    FROM player_ships
    WHERE player_id = ${playerId} AND ship_type = ${shipType}
  `;
  return Number(result[0].count) > 0;
}
