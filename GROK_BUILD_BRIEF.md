# Grok Build brief — Starwake Sim

**Read this first when opening the project in Grok Build.**

## Product one-liner

A mobile-friendly **intergalactic spaceship simulator**: cruise a parallax starfield, spool an FSD, jump between seeded systems, and fly different ship variants with distinct handling.

## Origin

Playable prototype: `prototype/starwake.html` (vanilla WebGL, single file).  
It already has: thin streak stars, density anti-whiteout, stick + throttle + head-look, gyro, hyperspace rings toggle, continuous depth parallax + lateral parallax + boost collapse, Elite-inspired procedural FSD audio, distance readout.

**Do not keep growing the HTML.** Port proven systems into modules.

## Goals (Tier B)

1. Scaffold TanStack Start app; play route `ssr: false`.
2. Port starfield + input + audio into `src/render` + `src/input` + `src/audio`.
3. Ship catalog + select screen; flight numbers differ per variant.
4. FSD state machine: cruise → charge → tunnel → drop (fuel + cooldown).
5. Seeded galaxy map UI + jump to system.
6. Local star view on drop (simple body + slower field).
7. Status HUD: fuel, hull, cooldown, target system, ship name.

## Non-goals

Economy, missions, combat loops, multiplayer, photoreal planets.

## UX

- **Gate:** title + ship select + Engage (unlock audio).
- **Flight:** left virtual stick (ship), right throttle, drag screen = head look, Boost = FSD.
- **Keyboard:** WASD/arrows stick, Space boost, M mute, H HUD, G gyro, R rings.
- **Map mode:** pick target system, initiate jump (consumes fuel, charge time from ship def).
- HUD must not clutter center reticle; panels edge-anchored; safe-area aware (Android).

## Ship variants (minimum)

| ID | Role | Handling notes |
|----|------|----------------|
| `courier` | Fast light | High turn, small tank, fast FSD charge |
| `hauler` | Slow heavy | Low turn, big tank, long charge |
| `scout` | Explorer | Balanced, best jump range |
| `interceptor` | Agile | Snappy, fuel hungry, short range |
| `liner` | Stable | Medium everything, softer audio/HUD accent |

All behavior driven by `ShipDef` data — one flight model, many tunings.

## Technical constraints

- 60fps target on mid Android; cap DPR (~1.4 mobile / 1.75 desktop).
- Additive stars: density-scaled alpha + soft luminance clamp (see prototype shaders).
- Instanced streaks via `ANGLE_instanced_arrays` when available.
- React only for HUD/shell; engine owns rAF loop.
- Persist: ship id, last system id, invertY, rings, mute, seed.

## Suggested first Build prompts

1. “Scaffold TanStack Start TS app named starwake-sim; add play route with ssr:false; empty canvas host.”
2. “Port prototype/starwake.html starfield + stick/throttle/look into src/render/starfield and src/input; wire Engage gate.”
3. “Add ShipDef catalog and select UI; multiply turn/boost/charge by ship stats.”
4. “Implement FSD state machine and fuel; map screen with seeded systems and jump.”

## Reference files in this repo

- `prototype/starwake.html` — source of truth for feel
- `docs/ARCHITECTURE.md` — folders and ownership
- `docs/SHIP_VARIANTS.md` — TypeScript shapes
- `docs/PROTOTYPE_NOTES.md` — feature checklist from prototype

## Success criteria (MVP)

- [ ] Select Courier vs Hauler; Hauler clearly slower to turn and longer to spool
- [ ] Jump from system A → B via map; starfield tunnel; drop near a local star
- [ ] Fuel decreases on jump; cannot jump if empty
- [ ] Head-look does not change flight path
- [ ] Prototype-level star clarity (no white-out at high density)
