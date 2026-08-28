import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "../auth/middleware.ts";
import type { HangarShip, HangarStats } from "./types.ts";
import type { HardpointTier, ShipType } from "../ship-ownership/types.ts";

export const loadHangar = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<{ ships: HangarShip[]; stats: HangarStats }> => {
    const { getHangarShips, getHangarStats } = await import("./server.ts");
    const [ships, stats] = await Promise.all([
      getHangarShips(context.userId),
      getHangarStats(context.userId),
    ]);
    return { ships, stats };
  });

export const claimStarterShip = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((data: { shipType: ShipType }) => data)
  .handler(async ({ context, data }): Promise<HangarShip> => {
    const { ensurePlayerRow } = await import("../player-profile/server.ts");
    const { acquireShip } = await import("../ship-ownership/server.ts");
    const { toHangarShip } = await import("./server.ts");
    await ensurePlayerRow(context.userId);
    const ship = await acquireShip(context.userId, data.shipType);
    return toHangarShip(ship);
  });

export type WearSnapshot = {
  shipId: string;
  shipType: ShipType;
  wearPoints: number;
  maxWearPool: number;
  wearPercentage: number;
  wearTier: HangarShip["wearTier"];
};

export const recordFlightWear = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((data: {
    shipType: ShipType;
    cruiseMinutes: number;
    boostMinutes: number;
    jumps: number;
    docks: number;
  }) => data)
  .handler(async ({ context, data }): Promise<WearSnapshot | null> => {
    const { addWear, getPlayerShips } = await import("../ship-ownership/server.ts");
    const { WEAR_RATES, getMaxWearPool, calculateWearTier } = await import(
      "../ship-ownership/types.ts"
    );

    const ships = await getPlayerShips(context.userId);
    const ship =
      ships.find((s) => s.shipType === data.shipType) ?? ships[0] ?? null;
    if (!ship) return null;

    const amount =
      WEAR_RATES.normal_flight * Math.max(0, data.cruiseMinutes) +
      WEAR_RATES.boosting * Math.max(0, data.boostMinutes) +
      WEAR_RATES.hyperspace * Math.max(0, data.jumps) +
      WEAR_RATES.docking * Math.max(0, data.docks);

    const result =
      amount > 0 ? await addWear(ship.id, amount) : {
        wearPoints: ship.wearPoints,
        maxWear: getMaxWearPool(ship.shipType, ship.hardpointTier),
        tier: calculateWearTier(
          ship.wearPoints,
          getMaxWearPool(ship.shipType, ship.hardpointTier),
        ),
        penalty: 0,
      };

    const maxWearPool = result.maxWear;
    return {
      shipId: ship.id,
      shipType: ship.shipType,
      wearPoints: result.wearPoints,
      maxWearPool,
      wearPercentage: (result.wearPoints / maxWearPool) * 100,
      wearTier: result.tier,
    };
  });

export type RepairStatus = {
  wear: WearSnapshot | null;
  credits: number;
  repairCost: number;
  hardpointTier: HardpointTier;
  nextHardpointTier: HardpointTier | null;
  upgradeCost: number;
};

export const loadRepairStatus = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((data: { shipType: ShipType }) => data)
  .handler(async ({ context, data }): Promise<RepairStatus> => {
    const { getPlayerProfile } = await import("../player-profile/server.ts");
    const { getPlayerShips } = await import("../ship-ownership/server.ts");
    const { getMaxWearPool, calculateWearTier, repairCreditCost } = await import(
      "../ship-ownership/types.ts"
    );

    const profile = await getPlayerProfile(context.userId);
    const credits = profile?.credits ?? 0;
    const ships = await getPlayerShips(context.userId);
    const ship = ships.find((s) => s.shipType === data.shipType) ?? ships[0] ?? null;
    if (!ship) {
      return {
        wear: null,
        credits,
        repairCost: 0,
        hardpointTier: "stock",
        nextHardpointTier: null,
        upgradeCost: 0,
      };
    }

    const { getNextHardpointTier, getUpgradeCost } = await import(
      "../ship-ownership/types.ts"
    );
    const maxWearPool = getMaxWearPool(ship.shipType, ship.hardpointTier);
    const next = getNextHardpointTier(ship.hardpointTier);
    return {
      credits,
      repairCost: repairCreditCost(ship.wearPoints),
      hardpointTier: ship.hardpointTier,
      nextHardpointTier: next,
      upgradeCost: next ? getUpgradeCost(ship.hardpointTier, next) : 0,
      wear: {
        shipId: ship.id,
        shipType: ship.shipType,
        wearPoints: ship.wearPoints,
        maxWearPool,
        wearPercentage: (ship.wearPoints / maxWearPool) * 100,
        wearTier: calculateWearTier(ship.wearPoints, maxWearPool),
      },
    };
  });

export const repairCurrentHull = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((data: { shipType: ShipType }) => data)
  .handler(async ({ context, data }): Promise<RepairStatus> => {
    const { getPlayerProfile, modifyCredits } = await import("../player-profile/server.ts");
    const { getPlayerShips, repairShip } = await import("../ship-ownership/server.ts");
    const { getMaxWearPool, calculateWearTier, repairCreditCost } = await import(
      "../ship-ownership/types.ts"
    );

    const ships = await getPlayerShips(context.userId);
    const ship = ships.find((s) => s.shipType === data.shipType) ?? null;
    if (!ship) throw new Error("No hull to repair");

    const { getNextHardpointTier, getUpgradeCost } = await import(
      "../ship-ownership/types.ts"
    );
    const next = getNextHardpointTier(ship.hardpointTier);
    const upgradeCost = next ? getUpgradeCost(ship.hardpointTier, next) : 0;
    const cost = repairCreditCost(ship.wearPoints);
    if (cost <= 0) {
      const profile = await getPlayerProfile(context.userId);
      const maxWearPool = getMaxWearPool(ship.shipType, ship.hardpointTier);
      return {
        credits: profile?.credits ?? 0,
        repairCost: 0,
        hardpointTier: ship.hardpointTier,
        nextHardpointTier: next,
        upgradeCost,
        wear: {
          shipId: ship.id,
          shipType: ship.shipType,
          wearPoints: ship.wearPoints,
          maxWearPool,
          wearPercentage: (ship.wearPoints / maxWearPool) * 100,
          wearTier: calculateWearTier(ship.wearPoints, maxWearPool),
        },
      };
    }

    await modifyCredits(context.userId, -cost);
    const repaired = await repairShip(ship.id);
    const profile = await getPlayerProfile(context.userId);
    return {
      credits: profile?.credits ?? 0,
      repairCost: 0,
      hardpointTier: ship.hardpointTier,
      nextHardpointTier: next,
      upgradeCost,
      wear: {
        shipId: ship.id,
        shipType: ship.shipType,
        wearPoints: repaired.wearPoints,
        maxWearPool: repaired.maxWear,
        wearPercentage: (repaired.wearPoints / repaired.maxWear) * 100,
        wearTier: repaired.tier,
      },
    };
  });

export const upgradeCurrentHardpoint = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((data: { shipType: ShipType }) => data)
  .handler(async ({ context, data }): Promise<RepairStatus> => {
    const { getPlayerProfile, modifyCredits } = await import("../player-profile/server.ts");
    const { getPlayerShips, upgradeHardpoint } = await import("../ship-ownership/server.ts");
    const {
      getMaxWearPool,
      calculateWearTier,
      getNextHardpointTier,
      getUpgradeCost,
      repairCreditCost,
    } = await import("../ship-ownership/types.ts");

    const ships = await getPlayerShips(context.userId);
    const ship = ships.find((s) => s.shipType === data.shipType) ?? null;
    if (!ship) throw new Error("No hull to upgrade");

    const next = getNextHardpointTier(ship.hardpointTier);
    if (!next) throw new Error("Hardpoint already maxed");
    const cost = getUpgradeCost(ship.hardpointTier, next);
    await modifyCredits(context.userId, -cost);
    const upgraded = await upgradeHardpoint(ship.id, next, context.userId);
    const profile = await getPlayerProfile(context.userId);
    const further = getNextHardpointTier(upgraded.hardpointTier);
    const maxWearPool = getMaxWearPool(upgraded.shipType, upgraded.hardpointTier);
    return {
      credits: profile?.credits ?? 0,
      repairCost: repairCreditCost(upgraded.wearPoints),
      hardpointTier: upgraded.hardpointTier,
      nextHardpointTier: further,
      upgradeCost: further ? getUpgradeCost(upgraded.hardpointTier, further) : 0,
      wear: {
        shipId: upgraded.id,
        shipType: upgraded.shipType,
        wearPoints: upgraded.wearPoints,
        maxWearPool,
        wearPercentage: (upgraded.wearPoints / maxWearPool) * 100,
        wearTier: calculateWearTier(upgraded.wearPoints, maxWearPool),
      },
    };
  });

export const payJobDelivery = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((data: {
    job: {
      kind: string;
      qty: number;
      from: { systemId: string; stationId: string };
      to: { systemId: string; stationId: string };
    };
  }) => data)
  .handler(async ({ context, data }): Promise<{ credits: number; paid: number }> => {
    const { jobPayout } = await import("../starwake/jobs.ts");
    const { ensurePlayerRow, modifyCredits } = await import("../player-profile/server.ts");
    const kinds = ["courier", "hauler", "tender", "tug"] as const;
    const kind = kinds.includes(data.job.kind as (typeof kinds)[number])
      ? (data.job.kind as (typeof kinds)[number])
      : "courier";
    const paid = jobPayout({
      id: "pay",
      kind,
      title: "",
      cargo: "",
      qty: data.job.qty,
      from: data.job.from,
      to: data.job.to,
    });
    await ensurePlayerRow(context.userId);
    const profile = await modifyCredits(context.userId, paid);
    return { credits: profile.credits, paid };
  });

export const buyModuleFit = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((data: { moduleId: string }) => data)
  .handler(async ({ context, data }): Promise<{ credits: number; cost: number }> => {
    const { MODULES, moduleFitCost } = await import("../starwake/catalog.ts");
    const { ensurePlayerRow, modifyCredits } = await import("../player-profile/server.ts");
    const mod = MODULES[data.moduleId];
    if (!mod) throw new Error("Unknown fit");
    const cost = moduleFitCost(mod);
    if (cost <= 0) {
      const { getPlayerProfile } = await import("../player-profile/server.ts");
      await ensurePlayerRow(context.userId);
      const profile = await getPlayerProfile(context.userId);
      return { credits: profile?.credits ?? 0, cost: 0 };
    }
    await ensurePlayerRow(context.userId);
    const profile = await modifyCredits(context.userId, -cost);
    return { credits: profile.credits, cost };
  });

export type MarketListing = {
  shipType: ShipType;
  price: number;
  ownedCount: number;
};

export type MarketView = {
  credits: number;
  rank: number;
  slotsUsed: number;
  slotCap: number;
  listings: MarketListing[];
  ships: HangarShip[];
};

export const loadShipMarket = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<MarketView> => {
    const { ensurePlayerRow } = await import("../player-profile/server.ts");
    const { getHangarShips } = await import("./server.ts");
    const { hangarSlotCapacity, SHIP_BASE_PRICES } = await import("../ship-ownership/types.ts");
    const { SHIP_ORDER } = await import("../starwake/catalog.ts");
    const profile = await ensurePlayerRow(context.userId);
    const ships = await getHangarShips(context.userId);
    const ownedCount: Record<string, number> = {};
    for (const ship of ships) {
      ownedCount[ship.shipType] = (ownedCount[ship.shipType] ?? 0) + 1;
    }
    return {
      credits: profile.credits,
      rank: profile.currentRank,
      slotsUsed: ships.length,
      slotCap: hangarSlotCapacity(profile.currentRank, profile.hangarBonusSlots),
      ships,
      listings: SHIP_ORDER.map((shipType) => ({
        shipType,
        price: SHIP_BASE_PRICES[shipType],
        ownedCount: ownedCount[shipType] ?? 0,
      })),
    };
  });

export const buyMarketShip = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((data: { shipType: ShipType; tradeInId?: string }) => data)
  .handler(async ({ context, data }): Promise<MarketView> => {
    const { ensurePlayerRow, modifyCredits, getPlayerProfile } = await import(
      "../player-profile/server.ts"
    );
    const { acquireShip, sellShip } = await import("../ship-ownership/server.ts");
    const { getHangarShips } = await import("./server.ts");
    const { hangarSlotCapacity, SHIP_BASE_PRICES, calculateResaleValue } = await import(
      "../ship-ownership/types.ts"
    );
    const { SHIP_ORDER } = await import("../starwake/catalog.ts");

    await ensurePlayerRow(context.userId);
    const price = SHIP_BASE_PRICES[data.shipType];
    if (price == null) throw new Error("Unknown hull");

    let ships = await getHangarShips(context.userId);
    let profile = await getPlayerProfile(context.userId);
    if (!profile) throw new Error("Create a pilot profile first");

    const cap = hangarSlotCapacity(profile.currentRank, profile.hangarBonusSlots);

    if (data.tradeInId) {
      const outgoing = ships.find((s) => s.id === data.tradeInId);
      if (!outgoing) throw new Error("Trade-in hull not in this bay");
      const tradeInCredit = Math.round(
        calculateResaleValue(
          SHIP_BASE_PRICES[outgoing.shipType],
          outgoing.wearPoints,
          outgoing.shipType,
          outgoing.hardpointTier,
        ),
      );
      const due = price - tradeInCredit;
      if (due > profile.credits) {
        throw new Error(`Need ₡${due.toLocaleString()} after trade-in`);
      }
      await sellShip(context.userId, outgoing.id, SHIP_BASE_PRICES[outgoing.shipType]);
      if (due !== 0) {
        profile = await modifyCredits(context.userId, -due);
      }
    } else {
      if (ships.length >= cap) {
        throw new Error(`Hangar full (${cap} bay${cap === 1 ? "" : "s"}). Trade in a hull or rank up.`);
      }
      if (profile.credits < price) throw new Error(`Need ₡${price.toLocaleString()}`);
      profile = await modifyCredits(context.userId, -price);
    }

    await acquireShip(context.userId, data.shipType);
    ships = await getHangarShips(context.userId);
    profile = (await getPlayerProfile(context.userId)) ?? profile;
    const ownedCount: Record<string, number> = {};
    for (const ship of ships) {
      ownedCount[ship.shipType] = (ownedCount[ship.shipType] ?? 0) + 1;
    }
    return {
      credits: profile.credits,
      rank: profile.currentRank,
      slotsUsed: ships.length,
      slotCap: hangarSlotCapacity(profile.currentRank, profile.hangarBonusSlots),
      ships,
      listings: SHIP_ORDER.map((shipType) => ({
        shipType,
        price: SHIP_BASE_PRICES[shipType],
        ownedCount: ownedCount[shipType] ?? 0,
      })),
    };
  });
