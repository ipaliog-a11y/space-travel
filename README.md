# Starwake

Helion trader. Kepler systems, jobs, a galaxy tape, crew, mining, and one lock you can own.

TanStack Start + raw WebGL. Node 22.

## Fly

```bash
npm install
npm run dev
```

Open [http://localhost:8080](http://localhost:8080). Auth and the database stay off in a clone; credits and hulls live in the browser.

```bash
npm run build
npm run preview
```

## Loops

| Loop | What you do |
|------|-------------|
| Jobs | Haul someone else’s cargo. Safe ₡. |
| Merchant | Buy, store, sell on the Watch. One galaxy tape. |
| Mining | Extractor on hub-less worlds. Ore dumps to the pad. |
| Fleet | Bond Courier / Hauler / Extractor crews. Packets pay a cut; pulls dump ore. |
| Station | Found an annex (₡36k). Public sell −6%. Annex is full tape. |
| Risk | Interdiction (pay / dump / boost). Tape shocks. |

Build order and leftovers: [BUILD.md](BUILD.md).

## Hulls

| Set | Hull | Role | Jump | Hold |
|-----|------|------|------|------|
| Line | **Courier** | Packet | 12 ly | 8 u |
| Line | **Hauler** | Bulk | 18 ly | 48 u |
| Line | **Scout** | Pathfinder | 22 ly | 6 u |
| Line | **Clipper** | Runner | 9 ly | 10 u |
| Yard | **Tender** | Fuel | 14 ly | 20 u |
| Yard | **Tug** | Harbor | 8 ly | 14 u |
| Yard | **Extractor** | Miner | 11 ly | 28 u |

Starter pick: Courier, Hauler, or Scout. Home system is **Helios**.

## Stick

| Key | Action |
|-----|--------|
| `W` `S` | Pitch |
| `←` `→` | Yaw |
| `Q` `E` | Roll |
| `A` `Z` | Throttle (Z below 0 is reverse) |
| `Space` | Boost |
| `X` `J` | Jump (lock a star first) |
| `D` | Dock / undock |
| `C` `N` | Charts |
| `Tab` | System / galaxy (charts open) |
| `Esc` | Close charts, then Gate |

Drag to look. T1 is cruise / boost. T2 is FSD charge + the hop. Refuel costs ₡.

## Docs

- [Build list](BUILD.md)
- [Hangar sets](docs/HULL_SET.md)
- [Station models](docs/STATION_MODELS.md)
- [Decisions](docs/DECISION_LOG.md)

Flight canvas: [`src/lib/starwake/engine.ts`](src/lib/starwake/engine.ts).
