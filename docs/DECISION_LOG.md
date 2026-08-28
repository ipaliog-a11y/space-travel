# Decision Log

All major design decisions for Starwake.

---

## Decision #001: Wear System Scale

**Date:** 2026-08-27  
**Status:** ✅ Implemented  
**Session:** 1.1

### Context
Need to define wear point scale, accumulation rates, and progression system for ship degradation.

### Options Considered

**Option A: Fixed 0-100 Scale**
- All ships have 100 wear points
- Simple to understand
- ❌ Doesn't reflect ship durability differences

**Option B: Variable Scale (90-120) + Hardpoints**
- Base wear pool varies by ship type (90-120 points)
- Hardpoint upgrades add +10/+20/+30 points
- ✅ Reflects ship durability
- ✅ Provides upgrade progression
- ✅ Max 150 points allows meaningful growth

**Option C: 0-1000 Scale**
- Larger numbers feel more granular
- ❌ More complex math
- ❌ No gameplay benefit over Option B

### Decision
**Option B** selected because:
- Different ships have different durability (hauler is tank, courier is fragile)
- Hardpoint upgrades provide clear progression
- Percentage-based tiers keep penalties fair across all ships
- Max 150 points gives room for growth without complexity

### Implementation
```typescript
SHIP_WEAR_POOLS = {
  courier: 90,
  hauler: 120,
  scout: 95,
  clipper: 90,
  tender: 115,
  tug: 100,
};

HARDPOINT_BONUSES = {
  stock: 0,
  mk1: 10,
  mk2: 20,
  mk3: 30,
};

// Example: Hauler Mk3 = 120 + 30 = 150 max wear points
```

### Wear Tiers (Percentage-Based)
- Excellent: 0-20% (0% penalty)
- Good: 21-40% (-5% penalty)
- Fair: 41-60% (-10% penalty)
- Poor: 61-80% (-15% penalty)
- Critical: 81-100% (-25% penalty)

### Review Date
2026-09-03 (after Week 1 playtesting)

---

## Decision #002: Resale Value Formula

**Date:** 2026-08-27  
**Status:** ✅ Implemented  
**Session:** 1.1

### Context
Need fair resale value calculation that accounts for wear without being punitive.

### Options Considered

**Option A: Simple Percentage**
- Resale = baseValue × (1 - wearPercentage)
- ❌ Too punishing at high wear
- ❌ No base depreciation

**Option B: Base Depreciation + Wear Penalty**
- 30% base depreciation
- Additional 0-40% based on wear
- Minimum 10% floor
- ✅ Balanced approach
- ✅ Encourages maintenance
- ✅ Prevents total loss

### Decision
**Option B** selected because:
- Base depreciation reflects real-world vehicle value loss
- Wear penalty encourages repairs before selling
- Minimum floor prevents bankruptcy from worn ships
- Math is transparent and predictable

### Implementation
```typescript
baseResale = baseValue × 0.70  // 30% depreciation
wearPenalty = baseResale × wearPercentage × 0.40
finalResale = baseResale - wearPenalty
minimum = baseValue × 0.10  // Floor
```

### Example
100k ship with 50% wear:
- Base resale: 70k
- Wear penalty: 70k × 0.5 × 0.4 = 14k
- Final resale: 56k (56% of original)

### Review Date
2026-09-03 (after economic testing)

---

## Decision #003: Hangar Slot Progression

**Date:** 2026-08-27  
**Status:** ✅ Implemented (slot cap in acquireShip; hangar_bonus_slots on players)  
**Session:** 1.1 / Week 1 fix

### Context
Define how players expand ship collection capacity.

### Options Considered

**Option A: All Purchasable**
- Start with 3 slots
- Buy additional slots with credits
- ❌ Pay-to-win concerns
- ❌ No progression reward

**Option B: Rank-Unlocked Only**
- All slots from rank progression
- ❌ Limits player choice
- ❌ No credit sink

**Option C: Hybrid (Rank + Purchase)**
- Start with 1 slot
- Unlock to 8 slots through ranks
- Purchase slots 9-12 (late game)
- ✅ Rewards progression
- ✅ Provides credit sink
- ✅ Player choice

### Decision
**Option C** selected because:
- Ranks feel meaningful (unlock slots)
- Late-game credit sink for wealthy players
- Duplicates allowed for strategic variety
- Clear progression path

### Implementation
```
Rank 1-2:  1 slot (starter)
Rank 3:    2 slots
Rank 5:    3 slots
Rank 7:    4 slots
Rank 9:    5 slots
Rank 11:   6 slots
Rank 13:   7 slots
Rank 15:   8 slots (max)

Post-Launch:
Slots 9-12: 50k, 100k, 200k, 500k credits
```

### Duplicates
✅ Allowed - Players can own multiple ships of same type
- Strategic depth (specialization vs variety)
- Max 8 ships total (limited by slots)

### Review Date
2026-09-10 (after rank system implementation)

---

## Decision #004: Database Schema Design

**Date:** 2026-08-27  
**Status:** ✅ Implemented  
**Session:** 1.1

### Context
Design database schema for ship ownership with wear tracking and upgrade support.

### Options Considered

**Option A: Simple Table**
- Single player_ships table
- Basic columns (id, type, wear)
- ❌ No upgrade tracking
- ❌ Hard to extend

**Option B: Normalized Tables**
- Separate tables for ships, wear, upgrades
- ❌ Overly complex for MVP
- ❌ Performance concerns

**Option C: Extended Single Table**
- player_ships with all core fields
- Helper functions for calculations
- Enums for type safety
- ✅ Simple queries
- ✅ Easy to extend
- ✅ Database-level constraints

### Decision
**Option C** selected because:
- Single table is simple and fast
- Enums provide type safety
- Helper functions encapsulate logic
- Triggers automate timestamps
- Well-documented with comments

### Implementation
```sql
CREATE TABLE player_ships (
  id UUID PRIMARY KEY,
  player_id UUID REFERENCES players(id),
  ship_type ship_type ENUM,
  wear_points INT CHECK (wear_points >= 0),
  hardpoint_tier hardpoint_tier ENUM,
  purchased_at TIMESTAMPTZ,
  last_repaired_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  -- No UNIQUE(player_id, ship_type): Decision #003 allows duplicate hull types.
  -- Capacity is hangarSlotsFromRank(rank) + hangar_bonus_slots.
);
```

### Helper Functions
- `get_base_wear_pool()` - Base wear by ship type
- `get_hardpoint_bonus()` - Bonus by tier
- `get_max_wear_pool()` - Calculate max for specific ship
- `calculate_wear_tier()` - Determine tier from points
- `get_wear_penalty()` - Efficiency penalty
- `calculate_resale_value()` - Resale calculation

### Review Date
2026-09-03 (after performance testing)

---

## Decision #004: Week 1 Job Payouts

**Date:** 2026-08-28  
**Status:** ✅ Implemented (placeholder until Week 2 market)  
**Session:** Week 1 close / playtest

### Context
Mk I hardpoints cost ₡5,000. Players start with ₡1,000. Jobs completed but paid nothing, so the upgrade UI was dead. The first formula used a ₡1,000 floor and ₡4,000 cap, which flattened local lock-to-lock runs.

### Decision
Pay on Deliver in the live station bay. Earnings scale with cargo units × haul distance: local AU (planet orbit gap) plus jump ly, at a kind rate (courier ₡220 / u / AU). Same-planet docks use 0.25 AU. Soft bounds ₡1–₡50,000 so listed jobs stay linear. Replace with a real market in Week 2.

---

## Decision #005: Hangar Fits Cost Credits; Repair vs Earnings

**Date:** 2026-08-28  
**Status:** ✅ Implemented  
**Session:** Week 1 playtest

### Context
Reliability lived on the station next to Repair. Hangar modules were free. Repair at ₡80/point ate a job's pay (one dock is 1.0 wear = ₡80; a worn hull could cost more than a ₡1,000 courier run).

### Decision
- Reliability is a hangar Rel tab, same column as RCS/Drive/FSD/Hold/Tank/HX. Tier costs stay ₡5k / ₡15k / ₡30k.
- Other hangar alts cost by slot (now Rel-scale; see #006). Stock is free.
- Repair is ₡15/point so a typical lock-to-lock (cruise + two docks) is well under one job payout.

---

## Decision #006: Slot Fits vs Rel; Live Pilot and Market

**Date:** 2026-08-28  
**Status:** ✅ Implemented  
**Session:** Week 1 playtest

### Context
Hangar alts were ₡450–₡1,200 while Rel was ₡5k / ₡15k / ₡30k. The live loop had no Pilot or ship Market screen (`/profile` was an orphan dashboard; hulls were claim-only).

### Decision
- Keep Rel at ₡5k / ₡15k / ₡30k (Mk I still ~four courier jobs from a ₡1,000 start).
- Raise slot alts into the same band: RCS ₡4k, HX ₡4.5k, Tank ₡6k, Hold ₡7k, Drive ₡8k, FSD ₡12k (between Mk I and Mk II).
- Pilot and Market live on the Gate/Hangar chrome. Rank 1 is one bay: Market buys into a free slot or trades in at resale. Hull catalog prices stay ₡100k–₡200k.

---

## Decision #007: Economy, Mining, Fleet, Galaxy (28 Aug chat)

**Date:** 2026-08-28  
**Status:** ✅ Approved (merchant + watch in play; mining / fleet / risk / station later)  
**Session:** [session-2026-08-28-progress-review](sessions/session-2026-08-28-progress-review.md)

### Context
Week 1 hangar / haul loop is in play. Need a build order for the next economy flavour without skipping fuel / saves.

### Decision
- **Keep** contract jobs. **Add** a merchant loop: own cargo, store, speculate. Market watch with history charts, not a one-line ticker.
- **Fleet:** NPC ships on contracts only (not merchant trading). Overlapping loops, not one activity at a time.
- **Mining:** hub-less worlds are resource planets (gas / liquid / solid). New **Extractor** hull, then pads. Feeds merchant + watch.
- **Hulls:** Clipper → passenger / VIP; Tug → salvage; Tender stays fuel. Do not grow the roster blindly. Combat later. 3D Grok hulls are too low-poly vs 2D art.
- **Risk:** pirates / interdiction and market shocks. Reputation / factions deprioritized.
- **Stations:** player can buy a station (storage first, then price leverage).
- **Galaxy:** one shared skybox; expand this galaxy before adding more.
- **Scale:** keep radii; fix close-up with camera (FOV / near-plane). Then 30 s day, ~2× speeds, half wells.
- **Code first:** save slots → T2 jump fuel → paid T1/T2 refuel. Then 7–12 in [`BUILD.md`](../BUILD.md).

---

## Decision #008: Save Slots, T2, Fuel Prices (28 Aug live loop)

**Date:** 2026-08-28  
**Status:** ✅ Implemented  
**Session:** live-loop 1–3

### Context
BUILD items 1–3 were still pending: one persist blob, one T1 tank, free Refuel. Credits and owned hulls already live on the server player, not in Zustand.

### Decision
- **Three named slots** on Gate / Options. New wipes the active slot. Copy / delete per slot. Each slot keeps ship, fuel (T1+T2), board, diary, local fits. **Credits and owned hulls stay account-wide.** A v13 `starwake-v2` blob migrates into slot 1.
- **T2** is FSD fuel. Burn = charge sip (`0.6`) + hop (`max(1.4, ly × 0.22)`). Jump lock gated by remaining T2. Stock tanks: Courier 24, Hauler 48, Scout 32, Clipper 16, Tender 56, Tug 12. Tank alts scale T2 with T1. HUD shows both.
- **Pump prices** are flat at every hub: T1 ₡2 / unit, T2 ₡8 / unit. Station and Hangar Refuel debit via `buyFuel`. In-flight F / HUD fill is no longer a free cheat. Scoop later.

---

## Decision #009: Shared Sky, Camera Scale, Travel Feel (28 Aug live loop)

**Date:** 2026-08-28  
**Status:** ✅ Implemented  
**Session:** live-loop 4–6

### Context
Every jump rolled a new nebula. Close-up planets felt small so radii had been grown in the past. In-system hops were minutes on cruise. BUILD 4–6: one galaxy sky, camera not radii, then day / speed / wells.

### Decision
- **Sky:** Helion arm (`kind: arm`, seed `0.17`) for every system. Tiny yaw from galactic `(x, y)`. Per-system `nebula` stays a map label.
- **Camera:** FOV 95 (boost / jump / transit add a little), near 0.01, pull-in inside ~3.2 radii, distant-disk scale past 2200, rim haze on approach. **Do not grow planet radii or compress AU spacing.**
- **Travel:** `GAME_DAY_SEC` 30. Hull cruise / OD and drive-module deltas ~2×. `planetSOI` `r×8`. Gravity reach `max(SOI×2, r×8)`. Park / keep-out unchanged.

---

## Decision #010: Merchant + Market Watch (28 Aug live loop)

**Date:** 2026-08-28  
**Status:** ✅ Implemented  
**Session:** live-loop 7

### Context
BUILD 1–6 in play. Decision #007 asked for a merchant path beside contract jobs, with a watch (history, not a ticker).

### Decision
- Forty goods in four kinds (harvest / bulk / life / parts). Bases climb that ladder (common dirt ₡6–28, bulk ₡22–78, life ₡12–120, parts ₡48–240). Processing beats feedstock (ice < water < food, ore < steel < alloys, hydrogen < LH2). Rare harvest (He-3, rare earths) may sit above cheap bulk, not above cores. Each hub lists **eight**, seeded from the lock — not the same eight everywhere. **One galaxy price** per good. Tick every `15 s` on a hashed random walk (not a sine, not per-hub). Same buy and sell for v1.
- Own cargo in the ship hold. Store / retrieve on that hub’s pad (per save slot). Hold space is shared with a loaded job. Repeat buys merge into one lot at a **weighted average** cost. Sell / liquidation is always the live tape, not that average.
- Credits stay account-wide via `tradeCargo`. Docked Watch is that hub’s eight. Gate / Hangar **Watch** is the full tape (focus chart + locks that list it). Hull Market stays ships.
- Player station, mining supply, and market shocks stay later (BUILD 9–12).

---

## Pending Decisions

### Wear Accumulation Balance
**When:** Week 1 playtesting  
**Question:** Are wear rates (0.1/min normal, 0.3/min boost) balanced?

### Insurance System Design
**When:** Week 2 implementation  
**Question:** Premium rates and coverage levels?

---

**Last Updated:** 2026-08-28  
**Total Decisions:** 11 approved, 2 pending
