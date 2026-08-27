/**
 * Ship Ownership - Pure Function Tests
 * Tests that don't require database - just pure TypeScript functions
 * 
 * Usage: node --experimental-strip-types test-ship-ownership-simple.ts
 */

import {
  getMaxWearPool,
  calculateWearTier,
  calculateWearPenalty,
  calculateResaleValue,
  getWearConfig,
  getNextHardpointTier,
  getUpgradeCost,
  WEAR_RATES,
  SHIP_WEAR_POOLS,
  HARDPOINT_BONUSES,
  HARDPOINT_COSTS,
} from './src/lib/ship-ownership/types.ts';

console.log('🧪 Ship Ownership - Pure Function Tests\n');
console.log('Testing calculation functions (no database required)\n');
console.log('---\n');

let passed = 0;
let failed = 0;

function test(name: string, fn: () => void) {
  try {
    fn();
    console.log(`✅ ${name}`);
    passed++;
  } catch (error: any) {
    console.log(`❌ ${name}`);
    console.log(`   Error: ${error.message}`);
    failed++;
  }
}

// Test 1: Base wear pools
console.log('📊 Base Wear Pools:');
Object.entries(SHIP_WEAR_POOLS).forEach(([ship, pool]) => {
  console.log(`   ${ship}: ${pool} points`);
});
console.log('');

// Test 2: Hardpoint bonuses
console.log('⬆️ Hardpoint Bonuses:');
Object.entries(HARDPOINT_BONUSES).forEach(([tier, bonus]) => {
  console.log(`   ${tier}: +${bonus} points`);
});
console.log('');

// Test 3: Max wear pool calculations
test('Calculate max wear pool for Courier stock', () => {
  const max = getMaxWearPool('courier', 'stock');
  if (max !== 90) throw new Error(`Expected 90, got ${max}`);
  console.log(`   Courier (stock): ${max} points ✅`);
});

test('Calculate max wear pool for Hauler mk3', () => {
  const max = getMaxWearPool('hauler', 'mk3');
  if (max !== 150) throw new Error(`Expected 150, got ${max}`);
  console.log(`   Hauler (mk3): ${max} points ✅`);
});

test('Calculate max wear pool for Scout mk1', () => {
  const max = getMaxWearPool('scout', 'mk1');
  if (max !== 105) throw new Error(`Expected 105, got ${max}`);
  console.log(`   Scout (mk1): ${max} points ✅`);
});

console.log('');

// Test 4: Wear tier calculations
console.log('📈 Wear Tier Calculations (Courier, 90 max):');
const courierMax = 90;
[0, 18, 36, 54, 72, 90].forEach(points => {
  const tier = calculateWearTier(points, courierMax);
  const penalty = calculateWearPenalty(points, courierMax);
  const pct = ((points / courierMax) * 100).toFixed(0);
  console.log(`   ${points} points (${pct}%): ${tier} (${(penalty * 100).toFixed(0)}% penalty)`);
});
console.log('');

// Test 5: Wear accumulation scenarios
console.log('✈️ Wear Accumulation Scenarios:');

const scenarios = [
  { activity: '10 min normal flight', wear: WEAR_RATES.normal_flight * 10 },
  { activity: '10 min boosting', wear: WEAR_RATES.boosting * 10 },
  { activity: '3 hyperspace jumps', wear: WEAR_RATES.hyperspace * 3 },
  { activity: '5 dockings', wear: WEAR_RATES.docking * 5 },
  { activity: '1 emergency landing', wear: WEAR_RATES.emergency_landing * 1 },
];

scenarios.forEach(({ activity, wear }) => {
  console.log(`   ${activity}: +${wear.toFixed(1)} wear points`);
});
console.log('');

// Test 6: Resale value calculations
console.log('💰 Resale Value Calculations (100k base):');
const baseValue = 100000;
const wearScenarios = [0, 25, 50, 75, 100];

wearScenarios.forEach(wearPct => {
  const wearPoints = (wearPct / 100) * 90; // 90 is courier max
  const resale = calculateResaleValue(baseValue, wearPoints, 'courier', 'stock');
  const returnPct = ((resale / baseValue) * 100).toFixed(1);
  console.log(`   ${wearPct}% wear: ${Math.round(resale)} credits (${returnPct}% return)`);
});
console.log('');

// Test 7: Hardpoint progression
console.log('⬆️ Hardpoint Upgrade Progression:');
const progression = ['stock', 'mk1', 'mk2', 'mk3'];
progression.forEach((tier, index) => {
  const next = getNextHardpointTier(tier as any);
  const cost = index < 3 ? HARDPOINT_COSTS[progression[index + 1] as keyof typeof HARDPOINT_COSTS] : 0;
  console.log(`   ${tier} → ${next || 'MAX'} (cost: ${cost.toLocaleString()} credits)`);
});
console.log('');

// Test 8: Upgrade cost calculations
test('Calculate upgrade cost stock → mk1', () => {
  const cost = getUpgradeCost('stock', 'mk1');
  if (cost !== 5000) throw new Error(`Expected 5000, got ${cost}`);
  console.log(`   Cost: ${cost.toLocaleString()} credits ✅`);
});

test('Calculate upgrade cost stock → mk3', () => {
  const cost = getUpgradeCost('stock', 'mk3');
  if (cost !== 50000) throw new Error(`Expected 50000, got ${cost}`);
  console.log(`   Cost: ${cost.toLocaleString()} credits ✅`);
});

test('Calculate upgrade cost mk1 → mk3', () => {
  const cost = getUpgradeCost('mk1', 'mk3');
  if (cost !== 45000) throw new Error(`Expected 45000, got ${cost}`);
  console.log(`   Cost: ${cost.toLocaleString()} credits ✅`);
});

console.log('');

// Test 9: Complete wear configuration
console.log('📋 Complete Wear Configuration Example:');
const config = getWearConfig(45, 'hauler', 'mk2');
console.log(`   Hauler with 45 wear points (mk2 hardpoint):`);
console.log(`   - Max pool: ${config.maxPoints} (120 + 20)`);
console.log(`   - Current: ${config.points} points`);
console.log(`   - Percentage: ${(config.percentage * 100).toFixed(1)}%`);
console.log(`   - Tier: ${config.tier}`);
console.log(`   - Penalty: ${(config.penalty * 100).toFixed(0)}%`);
console.log('');

// Summary
console.log('---');
console.log(`\n✅ Passed: ${passed}`);
console.log(`❌ Failed: ${failed}`);
console.log(`📊 Total: ${passed + failed} tests\n`);

if (failed === 0) {
  console.log('🎉 All tests passed! The calculation functions are working correctly.\n');
  console.log('Next step: Integrate with database for full end-to-end testing.\n');
} else {
  console.log('⚠️ Some tests failed. Review the errors above.\n');
}
