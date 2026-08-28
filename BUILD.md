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

## Build order

Do not start merchant, mining, or fleet until **1–6** land in Play.

### 1. Save state slots — in play
Three named slots on Gate / Options: Continue, New (wipes the active slot), copy, delete. Each slot keeps ship, fuel, board, diary, and local hangar fits. Credits and owned hulls stay on the account. Active slot is the one Play writes. Old `starwake-v2` blobs migrate into slot 1.

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

### 7. Merchant + market watch
Keep contract jobs (safe loop). Add a merchant path: buy cargo, **own** it, haul it, store it, sell it. Prices move with supply / demand per hub over time. Holding is play.

**Market watch** (not a one-line ticker): live values per commodity / hub, history charts, trends / volatility. Sit and watch the tape, then fly or wait. Jobs stay safe; merchant is risky and higher-skill.

### 8. Hull roles
Keep Courier / Hauler (cargo) and Scout (range). Tender stays fuel.

- **Clipper → passenger / VIP** (people, not packets)
- **Tug → salvage** (recovery, not just harbor crates)
- **Add Extractor** (mining hull). Do not grow the roster blindly; swap weak roles, then add the miner.

3D Grok hulls are too low-poly vs `public/ships/` 2D art. Higher-detail 3D or a different pipeline; 2D portraits stay the quality bar. Combat still later.

### 9. Planet mining
Hub-less worlds are **resource planets**, not stations. Each gets a couple of extractable elements (gas / liquid / solid). Harvest with the Extractor (direct pull) and later a pad on that world. Mined product feeds the merchant hold and the watch (local surplus → cheaper there, haul it out).

### 10. Fleet
Small transport company: a couple of NPC ships on **contracts only** (not merchant trading). Steady, lower-rate income; routes + upkeep so it is not free money. Player can fly jobs, trade, and run the fleet at the same time.

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
| — | Intergalactic map (after this galaxy is deep enough) |
| — | Combat |
| — | Android wrap (Capacitor / Play) — keep WebGL1 + touch-first |

## Non-goals (until named)

Station interiors as walkable spaces, planet landings, 6DOF, multiplayer, faction reputation contracts.
