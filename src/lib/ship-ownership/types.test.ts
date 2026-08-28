/**
 * Ship Ownership System - Unit Tests
 * Version: 0.1.0
 * Date: 2026-08-27
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  getMaxWearPool,
  calculateWearTier,
  calculateWearPenalty,
  calculateResaleValue,
  getWearConfig,
  getNextHardpointTier,
  getUpgradeCost,
  hangarSlotsFromRank,
  hangarSlotCapacity,
  repairCreditCost,
  SHIP_WEAR_POOLS,
  HARDPOINT_BONUSES,
  WEAR_PENALTIES,
  WEAR_RATES,
} from './types.ts';

describe('Ship Ownership System', () => {
  describe('Wear Pool Calculations', () => {
    it('should return correct base wear pools', () => {
      assert.strictEqual(SHIP_WEAR_POOLS.courier, 90);
      assert.strictEqual(SHIP_WEAR_POOLS.hauler, 120);
      assert.strictEqual(SHIP_WEAR_POOLS.scout, 95);
      assert.strictEqual(SHIP_WEAR_POOLS.clipper, 90);
      assert.strictEqual(SHIP_WEAR_POOLS.tender, 115);
      assert.strictEqual(SHIP_WEAR_POOLS.tug, 100);
    });

    it('should return correct hardpoint bonuses', () => {
      assert.strictEqual(HARDPOINT_BONUSES.stock, 0);
      assert.strictEqual(HARDPOINT_BONUSES.mk1, 10);
      assert.strictEqual(HARDPOINT_BONUSES.mk2, 20);
      assert.strictEqual(HARDPOINT_BONUSES.mk3, 30);
    });

    it('should calculate max wear pool correctly', () => {
      // Stock courier
      assert.strictEqual(getMaxWearPool('courier', 'stock'), 90);
      
      // Mk3 hauler
      assert.strictEqual(getMaxWearPool('hauler', 'mk3'), 150);
      
      // Mk1 scout
      assert.strictEqual(getMaxWearPool('scout', 'mk1'), 105);
    });
  });

  describe('Hangar slot capacity', () => {
    it('unlocks bays by rank (Decision #003)', () => {
      assert.strictEqual(hangarSlotsFromRank(1), 1);
      assert.strictEqual(hangarSlotsFromRank(3), 2);
      assert.strictEqual(hangarSlotsFromRank(15), 8);
    });

    it('adds purchased bonus slots', () => {
      assert.strictEqual(hangarSlotCapacity(1, 0), 1);
      assert.strictEqual(hangarSlotCapacity(15, 2), 10);
    });
  });

  describe('Repair cost', () => {
    it('charges nothing when hull is clean', () => {
      assert.strictEqual(repairCreditCost(0), 0);
    });

    it('rounds up and floors at 1 credit', () => {
      assert.strictEqual(repairCreditCost(0.01), 1);
      assert.strictEqual(repairCreditCost(1.2), 18);
    });
  });

  describe('Wear Tier Calculations', () => {
    it('should calculate wear tiers correctly', () => {
      const maxWear = 100;
      
      assert.strictEqual(calculateWearTier(15, maxWear), 'excellent');
      assert.strictEqual(calculateWearTier(35, maxWear), 'good');
      assert.strictEqual(calculateWearTier(55, maxWear), 'fair');
      assert.strictEqual(calculateWearTier(75, maxWear), 'poor');
      assert.strictEqual(calculateWearTier(95, maxWear), 'critical');
    });

    it('should handle edge cases', () => {
      const maxWear = 100;
      
      // Exactly at threshold
      assert.strictEqual(calculateWearTier(20, maxWear), 'excellent');
      assert.strictEqual(calculateWearTier(40, maxWear), 'good');
      assert.strictEqual(calculateWearTier(60, maxWear), 'fair');
      assert.strictEqual(calculateWearTier(80, maxWear), 'poor');
      
      // Zero wear
      assert.strictEqual(calculateWearTier(0, maxWear), 'excellent');
      
      // Max wear
      assert.strictEqual(calculateWearTier(100, maxWear), 'critical');
    });

    it('should work with different max wear pools', () => {
      // Courier (90 max)
      assert.strictEqual(calculateWearTier(18, 90), 'excellent');  // 20%
      assert.strictEqual(calculateWearTier(72, 90), 'poor');       // 80%
      
      // Hauler (120 max)
      assert.strictEqual(calculateWearTier(24, 120), 'excellent'); // 20%
      assert.strictEqual(calculateWearTier(96, 120), 'poor');      // 80%
    });
  });

  describe('Wear Penalty Calculations', () => {
    it('should return correct penalties for each tier', () => {
      const maxWear = 100;
      
      assert.strictEqual(calculateWearPenalty(10, maxWear), 0.00);  // Excellent
      assert.strictEqual(calculateWearPenalty(30, maxWear), 0.05);  // Good
      assert.strictEqual(calculateWearPenalty(50, maxWear), 0.10);  // Fair
      assert.strictEqual(calculateWearPenalty(70, maxWear), 0.15);  // Poor
      assert.strictEqual(calculateWearPenalty(90, maxWear), 0.25);  // Critical
    });
  });

  describe('Resale Value Calculations', () => {
    it('should calculate resale with base depreciation', () => {
      const baseValue = 100000;
      const wearPoints = 0;
      const shipType = 'courier';
      const hardpointTier = 'stock';
      
      const resale = calculateResaleValue(baseValue, wearPoints, shipType, hardpointTier);
      
      // Base resale is 70% = 70k, no wear penalty
      assert.ok(Math.abs(resale - 70000) < 0.01);
    });

    it('should apply wear penalty to resale', () => {
      const baseValue = 100000;
      const wearPoints = 45;  // 50% wear of 90 max (courier base)
      const shipType = 'courier';
      const hardpointTier = 'stock';
      
      const resale = calculateResaleValue(baseValue, wearPoints, shipType, hardpointTier);
      
      // Base resale: 70k
      // Wear percentage: 45/90 = 0.5
      // Wear penalty: 70k * 0.5 * 0.4 = 14k
      // Final: 70k - 14k = 56k
      assert.ok(Math.abs(resale - 56000) < 100);
    });

    it('should enforce minimum resale value', () => {
      const baseValue = 100000;
      const wearPoints = 100;  // Max wear
      const shipType = 'courier';
      const hardpointTier = 'stock';
      
      const resale = calculateResaleValue(baseValue, wearPoints, shipType, hardpointTier);
      
      // Minimum is 10% of base value = 10k
      assert.ok(resale >= 10000);
    });
  });

  describe('Wear Config', () => {
    it('should return complete wear configuration', () => {
      const config = getWearConfig(45, 'hauler', 'mk2');
      
      assert.strictEqual(config.maxPoints, 140);  // 120 + 20
      assert.strictEqual(config.points, 45);
      assert.strictEqual(config.percentage, 45 / 140);
      assert.strictEqual(config.tier, 'good');  // 45/140 = 32% = good tier
      assert.strictEqual(config.penalty, 0.05);  // good tier penalty
    });
  });

  describe('Hardpoint Progression', () => {
    it('should return next tier correctly', () => {
      assert.strictEqual(getNextHardpointTier('stock'), 'mk1');
      assert.strictEqual(getNextHardpointTier('mk1'), 'mk2');
      assert.strictEqual(getNextHardpointTier('mk2'), 'mk3');
      assert.strictEqual(getNextHardpointTier('mk3'), null);
    });

    it('should calculate upgrade costs', () => {
      // Stock to mk1
      assert.strictEqual(getUpgradeCost('stock', 'mk1'), 5000);
      
      // Stock to mk2 (mk1 + mk2)
      assert.strictEqual(getUpgradeCost('stock', 'mk2'), 20000);
      
      // Stock to mk3 (mk1 + mk2 + mk3)
      assert.strictEqual(getUpgradeCost('stock', 'mk3'), 50000);
      
      // Mk1 to mk3 (mk2 + mk3)
      assert.strictEqual(getUpgradeCost('mk1', 'mk3'), 45000);
    });

    it('should return 0 for invalid upgrades', () => {
      assert.strictEqual(getUpgradeCost('mk2', 'mk1'), 0);  // Downgrade
      assert.strictEqual(getUpgradeCost('mk3', 'mk3'), 0);  // Same tier
    });
  });

  describe('Wear Rates', () => {
    it('should have correct wear rates', () => {
      assert.strictEqual(WEAR_RATES.normal_flight, 0.1);
      assert.strictEqual(WEAR_RATES.boosting, 0.3);
      assert.strictEqual(WEAR_RATES.hyperspace, 0.5);
      assert.strictEqual(WEAR_RATES.docking, 1.0);
      assert.strictEqual(WEAR_RATES.emergency_landing, 5.0);
    });

    it('should calculate wear for activities', () => {
      // 10 minutes normal flight
      assert.strictEqual(WEAR_RATES.normal_flight * 10, 1.0);
      
      // 5 minutes boosting
      assert.strictEqual(WEAR_RATES.boosting * 5, 1.5);
      
      // 3 hyperspace jumps
      assert.strictEqual(WEAR_RATES.hyperspace * 3, 1.5);
    });
  });

  describe('Ship Definitions', () => {
    it('should have all ship types defined', () => {
      const shipTypes = Object.keys(SHIP_WEAR_POOLS) as Array<keyof typeof SHIP_WEAR_POOLS>;
      
      shipTypes.forEach(shipType => {
        assert.ok(SHIP_WEAR_POOLS[shipType] >= 90);
        assert.ok(SHIP_WEAR_POOLS[shipType] <= 120);
      });
    });
  });
});
