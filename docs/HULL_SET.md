# Hangar set — four hulls

The live Grok Build hangar is no longer two tabs. It is a **ship selector**: avatar, role, short data, then a dossier and the 3D bay.

## Why these two

Courier (packet) and Hauler (bulk) already cover lock-to-lock cargo. The gap was **range vs sprint**.

Research (Elite explorer vs interceptor roles, NASA long-range probes vs crew-transfer vehicles):

| Hull | Role | Real-world analogue | What it is for |
|------|------|---------------------|----------------|
| **Scout** | Pathfinder | New Horizons / Voyager boom + dish; Elite Asp Explorer | Longest FSD, sample drawer, fastest orbital survey |
| **Clipper** | Runner | Crew Dragon / X-37 transfer; Elite Courier/Viper sprint | Fastest cruise and turn, short jump, packets only |

They are not combat ships. Combat stays a later slice.

## Stock numbers

| | Courier | Hauler | Scout | Clipper |
|--|---------|--------|-------|---------|
| Role | Packet | Bulk | Pathfinder | Runner |
| Jump | 12 ly | 18 ly | **22 ly** | 9 ly |
| Hold | 8 u | **48 u** | 6 u | 10 u |
| Cruise | 6.4 | 4.2 | 5.6 | **7.8** |
| Turn | 1.35 | 0.65 | 1.08 | **1.48** |
| Mass | 0.7 | **1.7** | 0.82 | 0.95 |
| Tank | 100 t1 | 120 t1 | 88 t1 | 72 t1 |
| Survey | 4.4 s | 6.4 s | **3.1 s** | 4.6 s |
| Boosts | 5 | 5 | 6 | 4 |

Clipper cannot plot every Helion-component hop in one lock (galaxy was tuned for a 12 ly Courier). Chain jumps. Scout skips hops and logs wild worlds.

## Hangar UI

- Gate: 2×2 cards, thumb, role, blurb, jump / hold / turn
- Hangar rail: four avatars with role + `ly · u`
- Dossier: long copy + Jump / Hold / Turn / Mass / Cruise / Survey
- 3D bay + modules unchanged per hull (stock + two alts per slot)

## Code

- Stats / modules: `app/src/lib/starwake/catalog.ts`
- Ids: `app/src/lib/starwake/types.ts` (`scout` \| `clipper`)
- Selector: `app/src/components/starwake/Hangar.tsx`, `Gate.tsx`
- 3D + hardpoints: `app/src/components/starwake/HullBay.tsx`
- Portraits: `app/public/ships/{scout,clipper}.png` and `-thumb.png`
- Save version **9** (old Courier/Hauler loadouts still load)

Physics recommendations are separate: `PHYSICS_GROK_BUILD.md`. This set does not change the integrator except Scout/Clipper `surveySec`.
