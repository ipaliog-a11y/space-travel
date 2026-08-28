# Phase 2: Hangar Management UI & Integration

## Overview
Build the user interface for ship ownership and hangar management, integrating the backend systems with the flight engine.

## Session 2.1: Hangar UI Foundation

### Tasks
1. **Hangar Overview Page** (`/hangar`)
   - Display all owned ships in a grid
   - Show ship stats (wear, hardpoint tier, resale value)
   - Visual ship cards with 3D models or icons
   - Filter/sort by ship type, wear tier, purchase date

2. **Ship Detail Modal/Page**
   - Detailed wear breakdown
   - Hardpoint upgrade interface
   - Resale value calculator
   - Repair station integration
   - Ship selection for flight

3. **Ship Purchase Interface**
   - Browse available ships (6 types)
   - Compare stats and prices
   - Purchase flow with credit deduction
   - Hangar slot availability check

## Session 2.2: Wear & Repair UI

### Tasks
1. **Wear Point Display**
   - HUD integration (show current ship's wear)
   - Wear tier indicator (Excellent/Good/Fair/Poor/Critical)
   - Efficiency penalty display
   - Visual wear bar/progress

2. **Repair Station UI**
   - Select ship for repair
   - Choose repair amount (full/partial)
   - Cost calculation display
   - Repair confirmation

3. **Hardpoint Upgrade UI**
   - Upgrade progression display (stock → mk1 → mk2 → mk3)
   - Cost and benefit preview
   - Upgrade confirmation
   - Max wear pool increase display

## Session 2.3: Flight Integration

### Tasks
1. **Ship Selection for Flight**
   - Pre-flight hangar selection
   - Quick ship switch interface
   - Last-used ship memory
   - Ship status preview before flight

2. **Wear Accumulation Integration**
   - Connect flight timer to wear system
   - Activity tracking (normal flight, boosting, hyperspace, docking)
   - Real-time wear updates
   - Wear warnings (approaching critical)

3. **Post-Flight Summary**
   - Wear added during flight
   - Credits earned/spent
   - XP gained
   - Ship condition update

## Session 2.4: Credit Economy

### Tasks
1. **Credit Display & Tracking**
   - Persistent credit display in HUD
   - Transaction history
   - Credit balance in profile
   - Earnings breakdown

2. **Market Interface** (basic)
   - Ship pricing display
   - Repair cost tables
   - Upgrade pricing
   - Resale interface

3. **Transaction System**
   - Credit modifications server functions
   - Transaction logging
   - Error handling (insufficient credits)
   - Confirmation dialogs

## Technical Requirements

### Components to Create
- `src/components/hangar/ShipCard.tsx`
- `src/components/hangar/ShipGrid.tsx`
- `src/components/hangar/ShipDetailModal.tsx`
- `src/components/hangar/PurchaseShipModal.tsx`
- `src/components/hud/WearIndicator.tsx`
- `src/components/hud/CreditDisplay.tsx`
- `src/components/repair/RepairStation.tsx`
- `src/components/upgrade/HardpointUpgrade.tsx`

### Routes to Create
- `/hangar` - Main hangar overview
- `/hangar/[shipId]` - Ship detail view
- `/market` - Ship purchase/browse
- `/repair` - Repair station

### Server Functions to Add
- `purchaseShip()` - Buy new ship
- `getMarketPrices()` - Ship pricing
- `getRepairCost()` - Repair calculation
- `getUpgradeCost()` - Upgrade pricing
- `getTransactionHistory()` - Credit history

### Integration Points
- Existing flight engine (wear accumulation)
- Player profile (credits display)
- Ship ownership backend (all operations)
- 3D ship viewer (if exists)

## Deliverables

### UI Components
- ✅ Hangar overview with ship grid
- ✅ Ship detail modal with all actions
- ✅ Purchase interface
- ✅ Repair station UI
- ✅ Hardpoint upgrade UI
- ✅ HUD wear indicator
- ✅ Credit display

### Integration
- ✅ Wear accumulation during flight
- ✅ Credit transactions
- ✅ Ship selection for flight
- ✅ Real-time wear updates

### Documentation
- ✅ Phase 2 session notes
- ✅ UI component documentation
- ✅ Integration guide
- ✅ Updated changelog

## Success Criteria

1. **User can:**
   - View all owned ships in hangar
   - See wear status and hardpoint tier
   - Purchase new ships (if credits allow)
   - Repair ships at stations
   - Upgrade hardpoints
   - Select ship before flight
   - See wear accumulate during flight
   - View credit balance and transactions

2. **System:**
   - Tracks wear in real-time during flight
   - Deducts credits for purchases/repairs
   - Prevents purchases without credits/slots
   - Saves all changes to database
   - Shows appropriate errors/warnings

## Timeline Estimate
- Session 2.1: Hangar UI (4-6 hours)
- Session 2.2: Wear & Repair UI (3-4 hours)
- Session 2.3: Flight Integration (4-5 hours)
- Session 2.4: Credit Economy (2-3 hours)

**Total: 13-18 hours** (2-3 development sessions)

## Next Session Agenda (2.1)
1. Create hangar overview page
2. Build ship card component
3. Implement ship grid with filters
4. Add ship detail modal
5. Test with backend API

---

**Status:** Ready to start Session 2.1
**Priority:** Hangar UI foundation first, then integration
