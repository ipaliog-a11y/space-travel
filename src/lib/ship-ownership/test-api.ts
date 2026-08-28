/**
 * Ship ownership backend smoke test.
 * Access via /test-ship-ownership
 */

import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "../auth/middleware.ts";
import { calculateResaleValue, getMaxWearPool, getWearConfig } from "./types.ts";

export type OwnershipTestCase = {
  name: string;
  status: "pass" | "fail";
  result?: string;
  error?: string;
};

export type OwnershipTestReport = {
  timestamp: string;
  tests: OwnershipTestCase[];
  summary: { passed: number; failed: number; total: number };
  success: boolean;
};

export const testShipOwnership = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<OwnershipTestReport> => {
    const {
      addWearForActivity,
      acquireShip,
      getPlayerShips,
      getShipDetails,
      repairShip,
      upgradeHardpoint,
    } = await import("./server.ts");
    const { createPlayerProfile, getPlayerProfile } = await import(
      "../player-profile/server.ts"
    );

    const playerId = context.userId;
    const tests: OwnershipTestCase[] = [];
    const summary = { passed: 0, failed: 0, total: 0 };

    async function test(name: string, fn: () => Promise<unknown> | unknown) {
      summary.total++;
      try {
        const result = await fn();
        tests.push({
          name,
          status: "pass",
          result: result === undefined ? undefined : JSON.stringify(result),
        });
        summary.passed++;
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        tests.push({ name, status: "fail", error: message });
        summary.failed++;
      }
    }

    const player = await getPlayerProfile(playerId);
    if (!player) {
      await createPlayerProfile(playerId, {
        displayName: "Test Pilot",
        callSign: "TEST001",
        iconId: "pilot-01",
      });
    }

    await test("Acquire Courier ship", async () => {
      try {
        const ship = await acquireShip(playerId, "courier");
        return { id: ship.id, type: ship.shipType, wear: ship.wearPoints };
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "";
        if (message.includes("Hangar full")) {
          const ships = await getPlayerShips(playerId);
          const courier = ships.find((s) => s.shipType === "courier");
          if (courier) return { id: courier.id, type: courier.shipType, reused: true };
        }
        throw error;
      }
    });

    await test("Acquire second hull (may skip if hangar is 1 bay)", async () => {
      try {
        const ship = await acquireShip(playerId, "hauler");
        return { id: ship.id, type: ship.shipType };
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "";
        if (message.includes("Hangar full")) {
          return { skipped: true, reason: message };
        }
        throw error;
      }
    });

    await test("Get player ships", async () => {
      const ships = await getPlayerShips(playerId);
      return { count: ships.length, ships: ships.map((s) => s.shipType) };
    });

    const courierShips = await getPlayerShips(playerId);
    const courier = courierShips.find((s) => s.shipType === "courier");

    if (courier) {
      await test("Add wear (10 min flight)", async () => {
        const result = await addWearForActivity(courier.id, "normal_flight", 10);
        return { wearPoints: result.wearPoints, tier: result.tier };
      });

      await test("Repair ship (remove 5 wear)", async () => {
        const result = await repairShip(courier.id, 5);
        return { wearPoints: result.wearPoints, tier: result.tier };
      });

      await test("Get ship details", async () => {
        const details = await getShipDetails(courier.id, playerId);
        if (!details) throw new Error("Ship not found");
        return {
          wear: `${details.wearConfig.points}/${details.wearConfig.maxPoints}`,
          tier: details.wearConfig.tier,
        };
      });

      const hauler = courierShips.find((s) => s.shipType === "hauler");
      if (hauler && hauler.hardpointTier === "stock") {
        await test("Upgrade hardpoint (stock → mk1)", async () => {
          const ship = await upgradeHardpoint(hauler.id, "mk1", playerId);
          return {
            tier: ship.hardpointTier,
            maxWearPool: getMaxWearPool(ship.shipType, ship.hardpointTier),
          };
        });
      }

      await test("Calculate resale value", async () => {
        const details = await getShipDetails(courier.id, playerId);
        if (!details) throw new Error("Ship not found");
        const resale = calculateResaleValue(
          100000,
          details.wearConfig.points,
          "courier",
          details.ship.hardpointTier,
        );
        return { originalValue: 100000, resaleValue: Math.round(resale) };
      });
    }

    await test("Calculate wear config (45 points, Hauler, mk2)", () => {
      const config = getWearConfig(45, "hauler", "mk2");
      return { maxPoints: config.maxPoints, tier: config.tier };
    });

    return {
      timestamp: new Date().toISOString(),
      tests,
      summary,
      success: summary.failed === 0,
    };
  });
