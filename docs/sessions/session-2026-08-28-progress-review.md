# Session notes — 2026-08-28 progress review

**Date:** 2026-08-28  
**Repo:** [ipaliog-a11y/space-travel](https://github.com/ipaliog-a11y/space-travel)  
**Product:** Starwake (space-flight / space-travel; Star Wake lives inside this repo)  
**Status:** Notes captured from this chat. No new gameplay code in this session.

This file is the write-up asked for in chat: collect project decisions from this conversation and store them in the repo.

---

## What this chat decided

### Location of the project

- The game is **Starwake**, not a separate “Star Wake” repo.
- It lives in **`ipaliog-a11y/space-travel`** (`src/lib/starwake`, `src/components/starwake`).
- Canonical long-range plan already on `main`: [`docs/IMPLEMENTATION_PLAN.md`](../IMPLEMENTATION_PLAN.md).
- Canonical design decisions already on `main`: [`docs/DECISION_LOG.md`](../DECISION_LOG.md).
- Canonical scale / planets / travel notes: [`docs/SCALE_ANALYSIS.md`](../SCALE_ANALYSIS.md).

### Next work order (do not skip ahead)

Week 1 hangar / haul loop is in play. **Do not start Week 2 commodities until these three land:**

1. **Save state slots** — at least 3 named slots on Gate / Options. New, Continue into a slot, copy, delete. Persist ship, fuel, board, diary, hangar, credits per slot. One active slot for Play.
2. **T2 fuel for jumps** — second tank. T1 stays in-system (cruise / boost). T2 burns on FSD charge and each hop. HUD shows both. Jump lock gated by T2.
3. **Resource fuel prices** — station Refuel costs credits per T1 / T2 unit, paid from job earnings. Scoop later.

**Then (Week 2 commodities):**

1. Materials / station market (hold cargo beyond jobs).
2. Insurance design (still pending).
3. Wear-rate balance after the debug HUD has been play-tested.

### Scale, planets, travel

Reviewed from [`docs/SCALE_ANALYSIS.md`](../SCALE_ANALYSIS.md) in this chat:

| Topic | Current values |
|-------|----------------|
| 1 AU | 2,800 game units |
| Planet orbital radii | ~2,200–20,000+ units (~0.8–7+ AU) |
| Rocky / desert / ocean radii | ~18–36 units |
| Gas giants | ~88–140 units |
| Star radius | 88 units |
| Game day | still 120 s in code; plan is 30 s |

**Close-up planets feel small.** That is a camera issue (FOV / near-plane), not a too-small radius.

**Decision:** do **not** grow planet radii to fake size. Fix perceived scale with camera:

- FOV ~90–100
- Near plane ~0.01 (or 0.001)
- Optional: pull camera in near the surface; billboard/LOD for distant disks; haze/glow close-up

This keeps orbital scale (planets distant from each other) while making flybys fill the view.

**Scale direction still planned (not all shipped):**

- Faster days (`GAME_DAY_SEC` 120 → 30)
- ~2× cruise / overdrive speeds
- Gravity wells ~half radius
- Later: tighter orbits, speed-compression zones, optional warp

Target feel: vast, but ~15–30 s between points of interest in-system.

---

## Decisions already on the log (restated, not reopened)

These were already approved in [`docs/DECISION_LOG.md`](../DECISION_LOG.md). This chat did not reverse them.

| # | Topic | Call |
|---|--------|------|
| 001 | Wear scale | Variable pool 90–120 + hardpoint +10/+20/+30; percentage tiers |
| 002 | Resale | 30% base depreciation + wear penalty; 10% floor |
| 003 | Hangar slots | Rank unlocks 1–8; buy 9–12 later; duplicate hull types allowed |
| 004 schema | Ships table | Single `player_ships` table; no unique-per-type |
| 004 jobs | Job pay | Pay on Deliver; cargo × distance; courier ~₱220 / u / AU; Week 2 market replaces this |
| 005 | Rel / repair | Rel is a hangar tab; repair ₱15/point |
| 006 | Fit prices | Rel ₱5k/₱15k/₱30k; other slots ₱4k–₱12k; Pilot + Market live on Gate/Hangar |

---

## Still open

From the decision log, still pending:

- Wear accumulation rates after playtest (0.1/min cruise, 0.3/min boost).
- Insurance premiums and coverage.
- How many save slots, and whether each slot owns hangar / credits / diary (lean: **yes, per-slot persist**; at least 3).
- T2 burn: per ly vs per hop; courier vs hauler tank sizes.
- Hub fuel prices: credits per T1 / T2 unit, and whether they vary by station.

---

## What this session did *not* do

- Did not implement save slots, T2 fuel, or fuel prices.
- Did not start commodities.
- Did not change planet radii.
- Earlier 12-month plan files were already on `main` (Aug 27). This file is the missing session write-up for the 28 Aug progress / scale / next-loop chat.

---

## Pointers

- Plan: [`docs/IMPLEMENTATION_PLAN.md`](../IMPLEMENTATION_PLAN.md) — especially **Immediate Next Steps**
- Status: [`IMPLEMENTATION_STATUS.md`](../../IMPLEMENTATION_STATUS.md)
- Scale: [`docs/SCALE_ANALYSIS.md`](../SCALE_ANALYSIS.md) — camera workaround section (commit `282ef42`, 2026-08-28)
- Decisions: [`docs/DECISION_LOG.md`](../DECISION_LOG.md)

**Last updated:** 2026-08-28  
**Next review:** after save-slot / T2 / fuel-price pass
