/**
 * Ship Ownership Live Test Script
 * Run this to test the ship ownership system end-to-end
 * 
 * Usage: node --experimental-strip-types test-ship-ownership.ts
 */

// Mock player ID for testing
const TEST_PLAYER_ID = 'test-player-' + Date.now();

console.log('🧪 Ship Ownership Live Test\n');
console.log('Player ID:', TEST_PLAYER_ID);
console.log('---\n');

// Import the server functions
import { acquireShip, sellShip, addWearForActivity, repairShip, upgradeHardpoint, getPlayerShips, getShipDetails } from './src/lib/ship-ownership/server.ts';
import { getMaxWearPool, calculateResaleValue } from './src/lib/ship-ownership/types.ts';

async function runTests() {
  try {
    // Test 1: Acquire a ship
    console.log('📦 Test 1: Acquire Courier');
    const courier = await acquireShip(TEST_PLAYER_ID, 'courier', 100000);
    console.log('✅ Acquired Courier:', courier.id);
    console.log('   Wear Points:', courier.wearPoints);
    console.log('   Hardpoint:', courier.hardpointTier);
    console.log('   Max Wear Pool:', getMaxWearPool('courier', 'stock'));
    console.log('');

    // Test 2: Acquire another ship
    console.log('📦 Test 2: Acquire Hauler');
    const hauler = await acquireShip(TEST_PLAYER_ID, 'hauler', 150000);
    console.log('✅ Acquired Hauler:', hauler.id);
    console.log('   Max Wear Pool:', getMaxWearPool('hauler', 'stock'));
    console.log('');

    // Test 3: Add wear through activities
    console.log('✈️ Test 3: Add Wear Through Activities');
    
    // 10 minutes normal flight
    const flightWear = await addWearForActivity(courier.id, 'normal_flight', 10);
    console.log('After 10 min flight:', flightWear.wearPoints, 'wear points');
    console.log('   Tier:', flightWear.tier);
    console.log('   Penalty:', (flightWear.penalty * 100) + '%');
    
    // 5 minutes boosting
    const boostWear = await addWearForActivity(courier.id, 'boosting', 5);
    console.log('After 5 min boosting:', boostWear.wearPoints, 'wear points');
    console.log('   Tier:', boostWear.tier);
    
    // 1 hyperspace jump
    const jumpWear = await addWearForActivity(courier.id, 'hyperspace');
    console.log('After 1 jump:', jumpWear.wearPoints, 'wear points');
    console.log('   Tier:', jumpWear.tier);
    console.log('');

    // Test 4: Get ship details
    console.log('📋 Test 4: Get Ship Details');
    const details = await getShipDetails(courier.id, TEST_PLAYER_ID);
    if (details) {
      console.log('Ship:', details.definition.name);
      console.log('Wear:', details.wearConfig.points, '/', details.wearConfig.maxPoints);
      console.log('Tier:', details.wearConfig.tier);
      console.log('Penalty:', (details.wearConfig.penalty * 100) + '%');
      console.log('Wear %:', (details.wearConfig.percentage * 100).toFixed(1) + '%');
    }
    console.log('');

    // Test 5: Repair ship
    console.log('🔧 Test 5: Repair Ship');
    const repaired = await repairShip(courier.id, 5); // Repair 5 points
    console.log('After repairing 5 points:', repaired.wearPoints, 'wear points');
    console.log('   New Tier:', repaired.tier);
    console.log('');

    // Test 6: Upgrade hardpoint
    console.log('⬆️ Test 6: Upgrade Hardpoint');
    const upgraded = await upgradeHardpoint(hauler.id, 'mk1', TEST_PLAYER_ID);
    console.log('Upgraded Hauler to Mk1');
    console.log('   New Max Wear Pool:', getMaxWearPool('hauler', 'mk1'));
    console.log('');

    // Test 7: Calculate resale
    console.log('💰 Test 7: Calculate Resale Value');
    const baseValue = 100000;
    const wearPoints = jumpWear.wearPoints;
    const resale = calculateResaleValue(baseValue, wearPoints, 'courier', 'stock');
    console.log('Courier with', wearPoints, 'wear points:');
    console.log('   Original Value:', baseValue, 'credits');
    console.log('   Resale Value:', Math.round(resale), 'credits');
    console.log('   Return:', ((resale / baseValue) * 100).toFixed(1) + '%');
    console.log('');

    // Test 8: Get all player ships
    console.log('📦 Test 8: Get All Player Ships');
    const ships = await getPlayerShips(TEST_PLAYER_ID);
    console.log('Player owns', ships.length, 'ship(s):');
    ships.forEach(ship => {
      console.log('  -', ship.shipType, '(wear:', ship.wearPoints, ', hardpoint:', ship.hardpointTier + ')');
    });
    console.log('');

    // Test 9: Try to acquire duplicate (should fail)
    console.log('🚫 Test 9: Try Duplicate Ship (Should Fail)');
    try {
      await acquireShip(TEST_PLAYER_ID, 'courier', 100000);
      console.log('❌ ERROR: Should have failed!');
    } catch (error: any) {
      console.log('✅ Correctly rejected duplicate:', error.message);
    }
    console.log('');

    console.log('✅ All tests completed successfully!');
    
  } catch (error: any) {
    console.error('❌ Test failed:', error.message);
    console.error(error);
  }
}

// Run the tests
runTests();
