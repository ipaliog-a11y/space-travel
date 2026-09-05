# Starwake — build list

Intergalactic flight sim. **Week 1 hangar / haul loop is in play.** Later work stays listed here so it is not lost.

Source for economy / mining / fleet flavour: [`docs/sessions/session-2026-08-28-progress-review.md`](docs/sessions/session-2026-08-28-progress-review.md). Do not skip the numbered order.

## Slice 1 (shipped)

- Port prototype starfield, stick / throttle / look, procedural audio
- Hangar sets: Line (Courier, Hauler, Scout, Clipper) and Yard (Tender, Tug)
- Local **boost** = in-system hops (no tunnel)
- Compact system: sun in frame + seeded planet spheres (no landings)
- **Jump** = lock a star first, then charge → tunnel → drop
- Maps: **System** (planets) and **Galaxy** (stars). Intergalactic held
- Hub-local jobs, diary, Rel, Pilot, Market, wear HUD
- New game: create a pilot, pick Courier / Hauler / Scout, start in **Helios**

## Build order

Do not start mining or fleet until **1–7** land in Play.

### 1. Save state slots — in play
Three named slots on Gate / Options. Creating a profile occupies a slot and stores the pilot with that slot’s progress. Continue loads the active career. Create / delete live on Pilot (confirm before wipe). Copy still on the slot rail. Credits and owned hulls stay on the account. Old `starwake-v2` blobs migrate into slot 1.

### 2. T2 fuel for jumps — in play
T1 stays in-system (cruise / boost). T2 is spent on FSD charge + the hop (floor + ly). Jump lock is gated by T2 remaining. HUD shows T1 and T2. Courier: small T2, sips T1. Hauler: fat T2, hungrier T1.

### 3. Resource fuel prices — in play
Station / Hangar Refuel costs credits per unit (T1 ₡2, T2 ₡8), same at every hub. Hub boards already pay; fuel spend comes out of those earnings. Scoop / orbital refill can wait.

### 4. Shared galaxy sky — in play
One galactic backdrop (`GALAXY_SKY`, Helion arm) for every system. Tiny parallax from map `(x, y)`. Local `nebula` stays on the 2D map only. Expand **this** galaxy (more systems, more depth) before adding more galaxies.

### 5. Close-up scale (camera, not radius) — in play
Planet radii and AU spacing unchanged. Flight camera is FOV 95, near 0.01; pull-in near a disk; distant-disk LOD; approach haze. Do **not** grow radii. See [`docs/SCALE_ANALYSIS.md`](docs/SCALE_ANALYSIS.md).

### 6. Travel feel — in play
`GAME_DAY_SEC` 30, ~2× cruise / overdrive, gravity wells half radius (`planetSOI` ×8, reach `max(SOI×2, r×8)`). Target ~15–30 s between in-system POIs on OD, still feels vast.

### 7. Merchant + market watch — in play
Keep contract jobs (safe loop). Buy cargo on a hub **Watch**, own it in the hold, store it on that pad, haul it, sell it. Forty goods in four kinds. Each lock lists eight, seeded per hub. One galaxy tape — same ₡ at every lock. Ticks every 15 s on a hashed random walk. Holding is play.

**Market watch:** Gate / Hangar **Watch** follows all forty (click to focus a bigger chart and the locks that list it). Docked board shows that hub’s eight. Live ₡ / unit, 24-tick spark, signed trend. Same buy and sell quote for v1. Jobs stay safe; merchant is the risky loop. Pad storage is per-slot, not a player station yet. Hull **Market** is still ships.

### 8. Hull roles — Extractor in play
Keep Courier / Hauler (cargo) and Scout (range). Tender stays fuel. **Extractor** is the Yard mining hull (scoop boom, ore bins, fast pull). Clipper → passenger / VIP and Tug → salvage stay later. Do not grow the roster blindly.

Hangar hulls are spline-lathed / extruded from the 2D portraits. In-flight traffic uses the lightweight kit. Combat still later.

### 9. Planet mining — in play
Hub-less worlds are **resource planets**, not stations. Each yields a couple of harvest goods (gas / liquid / solid) from its kind. Scan, survey, then **Extract** from the well (gas / ice giants **Scoop** from the bands). Mined lots enter the hold at ₡0 and sell on the watch. Extractor drinks fast; other hulls sip so the loop is discoverable. Pads on those worlds and local surplus pricing stay later.

### 10. Fleet — in play
**Cosmetic traffic** still berths on occupied gates. **Crew office:** hire up to two NPC Courier / Hauler crews on **contracts only** (not merchant). Bond ₡6k / ₡9k. They loop packets while you fly; you take 42% minus upkeep (₡110 / ₡190). Dismiss spends the bond. Player can fly jobs, trade, and run the fleet at the same time.

### 11. Risk and events
Pirate / interdiction on hauls. Market shocks (spikes / crashes that feed the watch). Reputation / faction contracts stay deprioritized.

### 12. Player station
Buy a station somewhere. Storage first, then price / hold leverage for the merchant loop. Upgrades over time. Extractor pads on resource worlds can share this track.

## Loops (run together)

| Loop | What you do | Income |
|------|-------------|--------|
| Jobs | Haul someone else’s cargo | Safe, per trip |
| Merchant | Buy, own, store, sell on the watch | Risky, timing |
| Fleet | NPC ships on contracts | Lower, steady |
| Mining | Extractor on hub-less worlds | Raw supply for merchant |
| Station | Own a pad / storage | Leverage on price and hold |
| Risk | Pirates, shocks | Threaten all of the above |

## Later

| Slice | What |
|-------|------|
| — | Ship HUD (instrument cluster). Include a **Park** lamp, not only the lock-line word. On when capture hold is active (`regime === "park"`); off when Well / Free / Od / Dock. Do not require look-at-planet. |
| — | Intergalactic map (after this galaxy is deep enough) |
| — | Combat |
| — | Android wrap (Capacitor / Play) — keep WebGL1 + touch-first |

## Non-goals (until named)

Station interiors as walkable spaces, planet landings, 6DOF, multiplayer, faction reputation contracts.
