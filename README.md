# Starwake

Kepler-system flight sim. Hangar, jobs, orbital locks, FSD jumps.

This repository **is** the live app (TanStack Start + raw WebGL). The old single-file prototype (`starwake.html`, Interceptor / Liner, vanilla Pages game) has been removed.

## Fly

```bash
npm install
npm run dev
```

Node 22. Open the printed local URL. Auth and the database stay off.

## Hulls

Two hangar sets. Selector uses avatars, roles, and a short dossier.

| Set | Hull | Role | Jump | Hold | Turn |
|-----|------|------|------|------|------|
| Line | **Courier** | Packet | 12 ly | 8 u | 1.35 |
| Line | **Hauler** | Bulk | 18 ly | 48 u | 0.65 |
| Line | **Scout** | Pathfinder | 22 ly | 6 u | 1.08 |
| Line | **Clipper** | Runner | 9 ly | 10 u | 1.48 |
| Yard | **Tender** | Fuel | 14 ly | 20 u | 0.72 |
| Yard | **Tug** | Harbor | 8 ly | 14 u | 1.58 |

## In the sky

- Kepler galaxy, planet types, belts, comets, nebulae
- Moons as scenery (no look / arrive / jump onto satellites)
- Five station architectures, 10-bay docking ring
- System map + galaxy map, lock then Jump
- T1 fuel, boost pips, surveys, jobs

## Stick

| Key | Action |
|-----|--------|
| `W` `S` | Pitch |
| `←` `→` | Yaw |
| `Q` `E` | Roll |
| `A` `Z` | Throttle |
| `Space` | Boost |
| `J` | Jump (after a lock) |
| `N` | Map |
| `Esc` | Gate / hangar |

Drag the view to look. Look aims the drive.

## Docs

- [Hangar sets](docs/HULL_SET.md)
- [Station models](docs/STATION_MODELS.md)
- [Flight physics (recommendations, not coded)](docs/PHYSICS_GROK_BUILD.md)
- [Build list](BUILD.md)

Flight canvas: [`src/lib/starwake/engine.ts`](src/lib/starwake/engine.ts).
