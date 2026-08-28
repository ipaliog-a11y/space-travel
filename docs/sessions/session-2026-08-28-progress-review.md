# Session notes — 2026-08-28 design chat

**Date:** 2026-08-28  
**Repo:** [ipaliog-a11y/space-travel](https://github.com/ipaliog-a11y/space-travel)  
**Product:** Starwake (Star Wake lives in this repo)  
**Status:** Full extraction of this chat’s decisions. No gameplay code in this session.

First write-up of this file missed most of the conversation (only scale + next-loop). This revision is the whole chat.

---

## 1. Where the project is

- Game name: **Starwake**. Repo: **`ipaliog-a11y/space-travel`**.
- Code: `src/lib/starwake`, `src/components/starwake`.
- Week 1 hangar / haul loop is in play (jobs pay, Rel, Pilot, Market).

**Build order (do not skip):** save slots → T2 jump fuel → paid T1/T2 refuel → then the economy / mining / fleet work below.

---

## 2. Scale, planets, travel

**Player goal:** sitting next to a planet and looking at the system, planets must **not** look big and close. Leaving a planet should feel like a real hop to the next one.

**Why planets were oversized:** close-up, the planet looked like a small ball (FOV / UI / near-plane). Radius was grown to compensate. That breaks the travel illusion.

**Decision — both worlds, no radius bump:**

- Keep current radii (rocky ~22–34, gas giants ~88–140).
- Keep orbital distances (1 AU = 2,800 units; orbits ~2,200–20,000+).
- Fix close-up size with camera, not bigger meshes:
  - FOV ~90–100
  - Near plane ~0.01 / 0.001
  - Optional: pull camera in near the surface; billboard/LOD for distant disks; haze on approach

Written into [`docs/SCALE_ANALYSIS.md`](../SCALE_ANALYSIS.md) (commit `282ef42`).

Still planned, not all shipped: `GAME_DAY_SEC` 120 → 30, ~2× ship speeds, half-size gravity wells. Target: ~15–30 s between in-system POIs, still feels vast.

---

## 3. Economy — transporter AND merchant

**Keep** today’s transport jobs (take a contract, haul someone else’s cargo, get paid).

**Add** a merchant path. Player has their own money, buys cargo, **owns** it, hauls it, sells it. Can store and wait for a better price.

Prices exist so the player can **speculate**, not just as flavour on job cargo.

### Price fluctuation (approved)

- Supply / demand per hub.
- Prices move over time.
- Holding cargo is a real play: wait out a dip, sell a spike.
- Arbitrage between planets is the merchant loop.

### Market watch — stock-market feel (approved)

Not a one-line buy/sell ticker. A **market watch**:

- Live values per commodity / hub
- **History** — charts, prices up and down over time
- Trends / volatility readable at a glance
- Sit and watch the tape; then fly or wait

Jobs stay the safe loop. Merchant is the risky, higher-skill loop.

---

## 4. Fleet — small transport company (approved)

Player can run a **small transport company**: a couple of NPC ships on **contracts only**, not buying/selling materials (that stays the player’s merchant job).

- Steady, lower-rate income (someone else flies, you take a cut).
- Routes + upkeep / maintenance so it is not free money.
- Player can fly jobs, trade, and run the fleet **at the same time**.

Intent: overlapping systems, not one activity at a time.

---

## 5. Risk, events, stations (approved)

Player picked **risk/events** and **stations**. Reputation / faction contracts were deprioritized.

**Risk and events**

- Pirate / interdiction encounters on hauls
- Market shocks (price spikes/crashes that feed the market watch)

**Stations**

- Player can **buy their own station** somewhere
- Station as storage, later as price/storage advantage for the merchant loop
- Upgrades over time

---

## 6. Galaxy scope and background (approved)

**Bug / design mistake:** every solar system has its **own** galactic skybox. Wrong. They all sit in the **same** galaxy, so the background must be **one** shared sky, not a new one per star.

**Scope:** expand **this one galaxy** (more systems, more depth) before adding more galaxies.

---

## 7. Ship visuals (note)

3D hulls generated in Grok Build are **too low-poly**. They do not match the 2D ship art.

Need a better path: higher-detail 3D, or a different pipeline than the current generated meshes. 2D portraits in `public/ships/` stay the quality bar.

---

## 8. Ship variety (note + change)

Current six ([`docs/HULL_SET.md`](../HULL_SET.md)):

| Set | Hull | Role now |
|-----|------|----------|
| Line | Courier | Packet cargo |
| Line | Hauler | Bulk cargo |
| Line | Scout | Pathfinder / range |
| Line | Clipper | Sprint / runner |
| Yard | Tender | Fuel mule |
| Yard | Tug | Harbor / bay-to-bay |

**Review:** six is enough, but the roles are slightly off. Keep Courier / Hauler (cargo) and Scout (range). Consider:

- **Clipper → passenger / VIP** (people, not packets)
- **Tug → salvage** (recovery, not just harbor crates)
- Tender can stay fuel

**Add one hull:** **Extractor** (see mining). Do not grow the roster blindly; swap weak roles, then add the miner.

Combat still later. Not in this pass.

---

## 9. Planet mining + Extractor (approved)

Some planets have **no hub dock**. Those are **resource worlds**, not stations.

Each of those worlds gets a **couple of extractable elements**, split by state:

- **Gas**
- **Liquid**
- **Solid**

Harvest by:

- a dedicated **Extractor** ship that pulls directly from the planet, and/or
- later, a built station / extractor pad on that world

This is a **new ship**, not a Tender reskin. It is the missing role for hub-less planets.

Mined product feeds the **merchant** hold and the **market watch** (local surplus → cheaper there, haul it out).

---

## 10. How the loops stack

| Loop | What you do | Income |
|------|-------------|--------|
| Jobs | Haul someone else’s cargo | Safe, per trip |
| Merchant | Buy, own, store, sell on the watch | Risky, timing |
| Fleet | NPC ships on contracts | Lower, steady |
| Mining | Extractor on hub-less worlds | Raw supply for merchant |
| Station | Own a pad / storage | Leverage on price and hold |
| Risk | Pirates, shocks | Threaten all of the above |

Player should be able to run several at once.

---

## 11. Still first in code (unchanged)

Do not start mining / market / fleet until:

1. Named **save slots** (≥3), per-slot persist
2. **T2 fuel** for jumps
3. **Credits for T1/T2** at the pump

Then Week 2 commodities can absorb merchant, watch, mining, fleet, events, stations.

---

## Pointers

- Scale / camera: [`docs/SCALE_ANALYSIS.md`](../SCALE_ANALYSIS.md)
- Hulls: [`docs/HULL_SET.md`](../HULL_SET.md)
- Older 12-month plan (generic; this chat overrides economy flavour): [`docs/IMPLEMENTATION_PLAN.md`](../IMPLEMENTATION_PLAN.md)
- Decision log (wear / resale / slots / job pay): [`docs/DECISION_LOG.md`](../DECISION_LOG.md)

**Last updated:** 2026-08-28 (full chat extract)  
