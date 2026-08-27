# Hangar sets — Line and Yard

The hangar is a **ship selector** grouped by set: avatar, role, short data, then a dossier and the 3D bay.

## Line

Courier (packet) and Hauler (bulk) cover lock-to-lock cargo. Scout and Clipper fill **range vs sprint**.

Research (Elite explorer vs interceptor roles, NASA long-range probes vs crew-transfer vehicles):

| Hull | Role | Real-world analogue | What it is for |
|------|------|---------------------|----------------|
| **Scout** | Pathfinder | New Horizons / Voyager boom + dish; Elite Asp Explorer | Longest FSD, sample drawer, fastest orbital survey |
| **Clipper** | Runner | Crew Dragon / X-37 transfer; Elite Courier/Viper sprint | Fastest cruise and turn, short jump, packets only |

They are not combat ships. Combat stays a later slice.

## Yard (new)

Fuel and harbor. The Line ships still fly; these two keep the locks alive.

Research (NASA cryogenic tanker / depot concepts; orbital transfer vehicles / MEV tugs):

| Hull | Role | Real-world analogue | What it is for |
|------|------|---------------------|----------------|
| **Tender** | Fuel | Cryo depot tanker; propellant mule | Fat T1 (200), lazy stick, mid jump. Depot runs. |
| **Tug** | Harbor | OTV / MEV tug with capture arms | Hardest turn, shortest FSD (8 ly). Bay-to-bay crates. |

## Stock numbers

| | Courier | Hauler | Scout | Clipper | Tender | Tug |
|--|---------|--------|-------|---------|--------|-----|
| Set | Line | Line | Line | Line | Yard | Yard |
| Role | Packet | Bulk | Pathfinder | Runner | Fuel | Harbor |
| Jump | 12 ly | 18 ly | **22 ly** | 9 ly | 14 ly | 8 ly |
| Hold | 8 u | **48 u** | 6 u | 10 u | 20 u | 14 u |
| Cruise | 6.4 | 4.2 | 5.6 | **7.8** | 4.6 | 5.0 |
| Turn | 1.35 | 0.65 | 1.08 | 1.48 | 0.72 | **1.58** |
| Mass | 0.7 | **1.7** | 0.82 | 0.95 | 1.55 | 1.05 |
| Tank | 100 t1 | 120 t1 | 88 t1 | 72 t1 | **200 t1** | 90 t1 |
| Survey | 4.4 s | 6.4 s | **3.1 s** | 4.6 s | 5.8 s | 5.2 s |
| Boosts | 5 | 5 | 6 | 4 | **8** | 7 |

Clipper cannot plot every Helion-component hop in one lock (galaxy was tuned for a 12 ly Courier). Chain jumps. Scout skips hops and logs wild worlds. Tug stays in-system unless you chain with a friend.

## Hangar UI

- Gate: sets with thumbs, role, blurb, jump / hold / turn
- Hangar rail: Line then Yard, avatars with role + `ly · u`
- Dossier: long copy + Jump / Hold / Turn / Mass / Cruise / Survey / Tank
- 3D bay + modules per hull (stock + two alts per slot)

## Code

- Stats / modules / sets: `app/src/lib/starwake/catalog.ts` (`SHIP_SETS`)
- Ids: `app/src/lib/starwake/types.ts`
- Selector: `app/src/components/starwake/Hangar.tsx`, `Gate.tsx`
- 3D + hardpoints: `app/src/components/starwake/HullBay.tsx`
- Portraits: `app/public/ships/{courier,hauler,scout,clipper,tender,tug}.png` and `-thumb.png`
- Save version **10** (older loadouts still load)

Moons stay in the sky as scenery. Look, arrive, and jump no longer target satellites.

Physics recommendations are separate: `PHYSICS_GROK_BUILD.md`. This set does not change the integrator except hull `surveySec`.
