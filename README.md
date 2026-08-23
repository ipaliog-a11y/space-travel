# Starwake Sim (space-travel)

Intergalactic **spaceship flight simulator** — Tier B light sim with ship variants.

Built from the **Starwake** warp-starfield prototype (playable single-file WebGL) and scoped for **Grok Build** (TanStack Start + modular flight/render).

## Quick links

| Path | Purpose |
|------|---------|
| [`prototype/starwake.html`](./prototype/starwake.html) | Playable prototype — open in Chrome |
| [`docs/GROK_BUILD_BRIEF.md`](./docs/GROK_BUILD_BRIEF.md) | **Start here in Grok Build** — full product + tech brief |
| [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) | Module layout, state, render split |
| [`docs/SHIP_VARIANTS.md`](./docs/SHIP_VARIANTS.md) | Ship catalog data model |
| [`docs/PROTOTYPE_NOTES.md`](./docs/PROTOTYPE_NOTES.md) | What the HTML prototype already implements |

## Vision

Feel of flying a small ship through deep space and hyperspace: throttle, stick, head-look, FSD charge/jump/drop, parallax starfield, then expand into **map → jump → local star**, with **multiple ship classes** that handle differently.

## Scope (Tier B)

**In**

- Flight modes: local cruise / FSD charge / hyperspace tunnel / drop
- Seeded system map + jump targeting
- Simple local star on arrival
- 3–5 ship variants (mass, turn, boost, fuel, jump range)
- Ship state: fuel, hull, FSD cooldown, throttle
- HUD: nav, status, target
- Port of prototype feel: starfield, parallax, stick/look, Elite-inspired FSD audio

**Out (for now)**

- Full economy, station interiors, combat AI, multiplayer

## Prototype controls (HTML)

1. Open `prototype/starwake.html` in **Chrome** (not only as a download preview).
2. **Engage**
3. **Left stick** — ship pitch/bank · **Right Thr** — throttle 0–100% (can stop)
4. **Drag empty screen** — head look (does not change flight path)
5. **Boost / Space** — FSD spool → tunnel → release to drop
6. Panel: density, invert look, gyro, **rings on/off**

## Stack (target app)

- **Grok Build** / TanStack Start + React + TypeScript
- Play route: `ssr: false`
- Render/flight engine: vanilla WebGL or Three.js module (not tied to React render loop)
- State: Zustand (selected ship, system, settings, persist)
- Audio: Web Audio API (procedural FSD layers from prototype)

## Repo

- **GitHub:** https://github.com/ipaliog-a11y/space-travel
- Owner: `ipaliog-a11y`

## License

Private project unless otherwise noted.
