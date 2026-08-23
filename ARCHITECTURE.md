# Architecture

## Folder layout (target)

```text
src/
  app/                 # routes, providers, root shell
  ship/
    types.ts           # ShipId, ShipDef, ShipState, FlightMode
    catalog.ts         # variant table
    flight.ts          # integrate throttle, turn, boost spool
    fsd.ts             # charge / tunnel / drop transitions
  galaxy/
    seed.ts            # mulberry32 / hash → system positions & names
    map.ts             # neighbors, distance ly, jump cost
    types.ts
  render/
    starfield/         # WebGL engine ported from prototype
    local/             # star sphere + light when in-system
    cockpit/           # optional frame / vignette accents by ship
  audio/
    fsd.ts             # engage / tunnel / drop
    cruise.ts
  ui/
    Gate.tsx
    Hud.tsx
    MapPanel.tsx
    ShipSelect.tsx
    StatusReadout.tsx
  input/
    stick.ts
    look.ts
    keys.ts
    gyro.ts
  state/
    store.ts           # zustand + persist
```

## Runtime split

```text
┌─────────────┐     reads      ┌──────────────┐
│  React HUD  │ ←───────────── │ Zustand store│
└─────────────┘                └──────┬───────┘
                                      │ writes (input, mode)
┌─────────────┐     tick            │
│  rAF Engine │ ←───────────────────┘
│  WebGL      │ ── uploads positions, draws
└─────────────┘
```

- Engine **never** imports React components.
- Store holds: `shipId`, `shipState`, `mode`, `systemId`, `targetSystemId`, `settings`.
- Input modules write stick/throttle/boost into store or a shared `input` object the engine reads each frame.

## Flight modes

```text
docked | local | charging | hyperspace | dropping
```

| Mode | Starfield | Throttle | Jump |
|------|-----------|----------|------|
| local | parallax on | yes | start charge if target set |
| charging | cruise + charge FX | locked or reduced | cancel? optional |
| hyperspace | tunnel, collapse parallax | locked | auto |
| dropping | transition | locked | → local |

## Render pipeline (from prototype)

1. Nebula sphere (slow bank)
2. Dust points (distant layer base ~0.12–0.2)
3. Instanced star streaks (depth-weighted wrap)
4. DOM tunnel rings (optional)
5. HUD / vignette / flash

### Parallax (keep)

- Continuous depth weight: `0.1 + 0.9 * (14 / (14 + depth))`
- Lateral from stick × `(1 - boost*0.9)`
- `collapse = boostAmt` mixes layer weights toward 1.0

### Anti white-out (keep)

- Density scale on alpha
- Soft luminance clamp in fragment shader
- Thin trails (~0.9–1.6 px)

## State persistence

```ts
{
  shipId: 'scout',
  systemId: 'sol-seed-0',
  settings: { invertY, rings, mute, gyro },
  seed: number
}
```

## Dependencies (expected)

- `three` **or** continue vanilla WebGL (prototype is vanilla — either OK)
- `zustand` + persist
- TanStack Router/Start
- Tailwind for HUD

Prefer **vanilla WebGL port** of the prototype for least regression; introduce Three later only if local meshes need it.
