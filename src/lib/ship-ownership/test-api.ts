/**
 * Ship Ownership Test API
 * Temporary test endpoint to verify backend functionality
 * 
 * Access via: http://localhost:8080/api/test-ship-ownership
 */

import { createServerFn } from "@tanstack/react-start";
import { createPlayerProfile, getPlayerProfile } from "../player-profile/server";
import {
  acquireShip,
  sellShip,
  addWearForActivity,
  repairShip,
  upgradeHardpoint,
  getPlayerShips,
  getShipDetails,
} from "../ship-ownership/server";
import {
  getMaxWearPool,
  calculateResaleValue,
  getWearConfig,
} from "../ship-ownership/types";

// Test player ID (in real app, this would come from auth)
const TEST_PLAYER_ID = "00000000-0000-0000-0000-000000000001";

// Helper to create test player profile if not exists
async function ensureTestPlayer() {
  let player = await getPlayerProfile(TEST_PLAYER_ID);
  
  if (!player) {
    await createPlayerProfile(TEST_PLAYER_ID, {
      displayName: "Test Pilot",
      callSign: "TEST001",
      iconId: "pilot-01",
    });
    player = await getPlayerProfile(TEST_PLAYER_ID);
  }
  
  return player;
}

export const testShipOwnership = createServerFn().handler(async () => {
  const results: any = {
    timestamp: new Date().toISOString(),
    tests: [],
    summary: {
      passed: 0,
      failed: 0,
      total: 0,
    },
  };

  async function test(name: string, fn: () => Promise<any>) {
    results.total++;
    try {
      const result = await fn();
      results.tests.push({ name, status: "pass", result });
      results.passed++;
      console.log(`✅ ${name}`);
    } catch (error: any) {
      results.tests.push({ name, status: "fail", error: error.message });
      results.failed++;
      console.error(`❌ ${name}: ${error.message}`);
    }
  }

  console.log("\n🧪 Running Ship Ownership Backend Tests...\n");

  // Ensure test player exists
  await ensureTestPlayer();

  // Test 1: Acquire ships
  await test("Acquire Courier ship", async () => {
    const ship = await acquireShip(TEST_PLAYER_ID, "courier", 100000);
    return { id: ship.id, type: ship.shipType, wear: ship.wearPoints };
  });

  await test("Acquire Hauler ship", async () => {
    const ship = await acquireShip(TEST_PLAYER_ID, "hauler", 150000);
    return { id: ship.id, type: ship.shipType, wear: ship.wearPoints };
  });

  await test("Acquire Scout ship", async () => {
    const ship = await acquireShip(TEST_PLAYER_ID, "scout", 120000);
    return { id: ship.id, type: ship.shipType, wear: ship.wearPoints };
  });

  // Test 2: Verify duplicate prevention
  await test("Prevent duplicate ship (should fail)", async () => {
    try {
      await acquireShip(TEST_PLAYER_ID, "courier", 100000);
      throw new Error("Should have failed");
    } catch (error: any) {
      if (error.message.includes("already owns")) {
        return { prevented: true };
      }
      throw error;
    }
  });

  // Test 3: Get all player ships
  await test("Get player ships", async () => {
    const ships = await getPlayerShips(TEST_PLAYER_ID);
    return { count: ships.length, ships: ships.map((s) => s.shipType) };
  });

  // Test 4: Add wear through activities
  const courierShips = await getPlayerShips(TEST_PLAYER_ID);
  const courier = courierShips.find((s) => s.shipType === "courier");

  if (courier) {
    await test("Add wear (10 min flight)", async () => {
      const result = await addWearForActivity(courier.id, "normal_flight", 10);
      return { wearPoints: result.wearPoints, tier: result.tier };
    });

    await test("Add wear (5 min boosting)", async () => {
      const result = await addWearForActivity(courier.id, "boosting", 5);
      return { wearPoints: result.wearPoints, tier: result.tier };
    });

    await test("Add wear (1 hyperspace jump)", async () => {
      const result = await addWearForActivity(courier.id, "hyperspace");
      return { wearPoints: result.wearPoints, tier: result.tier };
    });

    // Test 5: Get detailed ship info
    await test("Get ship details", async () => {
      const details = await getShipDetails(courier.id, TEST_PLAYER_ID);
      if (!details) throw new Error("Ship not found");
      return {
        wear: `${details.wearConfig.points}/${details.wearConfig.maxPoints}`,
        tier: details.wearConfig.tier,
        penalty: `${(details.wearConfig.penalty * 100).toFixed(0)}%`,
      };
    });

    // Test 6: Repair ship
    await test("Repair ship (remove 5 wear)", async () => {
      const result = await repairShip(courier.id, 5);
      return { wearPoints: result.wearPoints, tier: result.tier };
    });

    // Test 7: Upgrade hardpoint
    const hauler = courierShips.find((s) => s.shipType === "hauler");
    if (hauler) {
      await test("Upgrade hardpoint (stock → mk1)", async () => {
        const ship = await upgradeHardpoint(hauler.id, "mk1", TEST_PLAYER_ID);
        const maxWear = getMaxWearPool(ship.shipType, ship.hardpointTier);
        return {
          tier: ship.hardpointTier,
          maxWearPool: maxWear,
        };
      });

      await test("Get upgraded ship details", async () => {
        const details = await getShipDetails(hauler.id, TEST_PLAYER_ID);
        if (!details) throw new Error("Ship not found");
        return {
          hardpoint: details.ship.hardpointTier,
          maxWear: details.wearConfig.maxPoints,
        };
      });
    }

    // Test 8: Calculate resale value
    await test("Calculate resale value", async () => {
      const details = await getShipDetails(courier.id, TEST_PLAYER_ID);
      if (!details) throw new Error("Ship not found");
      const resale = calculateResaleValue(
        100000,
        details.wearConfig.points,
        "courier",
        "stock"
      );
      return {
        originalValue: 100000,
        resaleValue: Math.round(resale),
        returnPct: `${((resale / 100000) * 100).toFixed(1)}%`,
      };
    });
  }

  // Test 9: Wear configuration calculations
  await test("Calculate wear config (45 points, Hauler, mk2)", () => {
    const config = getWearConfig(45, "hauler", "mk2");
    return {
      maxPoints: config.maxPoints,
      tier: config.tier,
      penalty: `${(config.penalty * 100).toFixed(0)}%`,
    };
  });

  console.log(`\n✅ Tests Complete: ${results.passed}/${results.total} passed\n`);

  return {
    success: results.failed === 0,
    ...results,
  };
});
