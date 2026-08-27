# Session 1.1: Kickoff & Setup

**Date:** 2026-08-27  
**Duration:** 2 hours  
**Attendees:** Ioannis (Human Director), AI Agent  
**Focus:** Foundation + Ship Ownership System

---

## Topics Discussed

1. Design document review
2. MVP priorities for Week 1
3. Ship ownership system design
4. Wear system mechanics
5. Database schema

---

## Decisions Made

### **Decision #001: Wear System Scale**
**Status:** ✅ Approved

**Context:** Need to define wear point scale and progression.

**Decision:**
- Base wear pool varies per ship: 90-120 points
- Hardpoint upgrades add +10 points per tier (3 tiers = +30 max)
- Wear tiers calculated as percentage of max pool

**Ship Wear Pools:**
- Courier: 90 (light frame, wears faster)
- Hauler: 120 (sturdy, lasts longer)
- Scout: 95
- Clipper: 90
- Tender: 115
- Tug: 100

**Hardpoint Progression:**
- Stock: +0 points
- Mk1: +10 points
- Mk2: +20 points
- Mk3: +30 points

**Example:** Hauler Mk3 = 120 + 30 = 150 max wear points

---

### **Decision #002: Resale Value Formula**
**Status:** ✅ Approved

**Formula:**
```typescript
baseResale = baseValue * 0.70  // 30% depreciation
wearPenalty = baseResale * wearPercentage * 0.40  // Up to 40% reduction
finalResale = baseResale - wearPenalty
minimum = baseValue * 0.10  // Floor: 10% of original value
```

**Example:**
- 100k ship with 50% wear
- Base resale: 70k
- Wear penalty: 70k × 0.5 × 0.4 = 14k
- Final resale: 56k (56% of original)

---

### **Decision #003: Hangar Slot Progression**
**Status:** ✅ Approved

**Progression:**
- Start: 1 slot
- Rank 3: 2 slots
- Rank 5: 3 slots
- Rank 7: 4 slots
- Rank 9: 5 slots
- Rank 11: 6 slots
- Rank 13: 7 slots
- Rank 15: 8 slots (max rank)

**Duplicates:** ✅ Allowed (can own 2 Couriers, etc.)

**Post-Launch (Week 2+):**
- Slots 9-12 purchasable with credits (50k-500k)

---

### **Decision #004: Database Schema**
**Status:** ✅ Approved

**Tables:**
- `player_ships` - Ship ownership with wear tracking
- `hangar_slots` - Hangar slot management

**Key Features:**
- Wear points column (0 to max_wear_pool)
- Hardpoint tier enum (stock/mk1/mk2/mk3)
- Unique constraint on (player_id, ship_type)
- Helper functions for wear calculations
- Automatic updated_at trigger

---

## Action Items

### AI Tasks:
- ✅ Create database migration (0002_ship_ownership.sql)
- ✅ Create TypeScript types (types.ts)
- ✅ Create server functions (server.ts)
- ✅ Create unit tests (types.test.ts)
- ✅ Document session (this file)
- 🔄 Create changelog v0.1.0
- ⏳ Integration testing support

### Human Tasks:
- ✅ Review and approve design decisions
- ⏳ Live test ship ownership flow
- ⏳ Validate wear accumulation feels balanced
- ⏳ Approve unit test results

---

## Code Created

### Files:
1. `migrations/0002_ship_ownership.sql` - Database schema
2. `src/lib/ship-ownership/types.ts` - TypeScript types
3. `src/lib/ship-ownership/server.ts` - Server functions
4. `src/lib/ship-ownership/types.test.ts` - Unit tests

### Key Functions:
- `acquireShip()` - Purchase ship
- `sellShip()` - Sell with wear calculation
- `addWear()` - Accumulate wear
- `addWearForActivity()` - Activity-based wear
- `repairShip()` - Reduce wear
- `upgradeHardpoint()` - Upgrade reliability
- `getPlayerShips()` - Query ships
- `getShipDetails()` - Full ship info with wear config

---

## Next Session

**When:** After unit tests pass  
**Focus:** Live testing and integration  
**Preparation Needed:**
- Run unit tests
- Deploy migration to test database
- Prepare test scenarios for live playtesting

---

## Notes

- Wear system designed to be meaningful but not punitive
- Hardpoint upgrades provide clear progression path
- Resale formula balances depreciation with fairness
- Database schema supports future expansion (insurance, rescue)
- All calculations use percentages for fair scaling across ship types

---

**Status:** Implementation in progress  
**Next Check-in:** After unit tests complete
