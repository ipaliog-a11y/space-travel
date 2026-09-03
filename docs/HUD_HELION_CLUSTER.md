# Starwake HUD — Helion Cluster

**Chosen:** 2026-09-02  
**Rejected:** A · Dispatch Glass (kept as a reference only)

One HUD for every hull. Skin later with a hull accent, not a second layout.

---

## What it is

Chase-cam instrument plates. Ivory on ink with one teal accent. The ship and sky stay empty. Feels like a cockpit without modeling one.

Not Elite orange. Not Star Citizen cyan glass. Not a debug overlay.

---

## Layout (flight)

| Zone | Contents |
| --- | --- |
| Top left | System name (Helios). Tiny. |
| Top right | Speed, large tabular. Regime under it: Free / Well / Park / Od / Dock. Speed label `spd` (inertial), `rel` (planet), or `orb` (coast-in-well). Dedicated **Park** lamp when capture hold is on. |
| Bottom left plate | **Lock** — target name, distance, ETA. Compact radar disc under it (heading pip + lock pip). No radar sitting on the ship. |
| Bottom right plate | **Own** — hull class, hold line, T1 / T2 / hull / throttle bars. MFD tabs: Ship · Hold · Jump. Tabs swap the plate body, not a second window. |
| Center | Empty. No reticle soup. Planet name tags only when locked, parked on the world, not on the hull. |
| Never on the canopy | Mute, settings, options, debug, FPS, map buttons. Those live in Gate / Hangar / pause. |

Wake / boost / heat are bars on the plates, not a second HUD language.

---

## Palette

- Ink `#07090b`
- Plate `#0c1014` at ~55% over the scene
- Ivory `#d8d0c0` (type, ticks, hull bars)
- Ivory dim `#9a9284` (labels)
- Teal `#2f6f6a` / bright `#6fbfb6` (accent, T1, lock pip)
- Warn `#c47a4a` (heat, heading off, hull < 80%)
- Hairline 1px ivory at 22% opacity. Corner ticks on plates, teal. No glow stacks, no gold, no purple.

Type: condensed sans for labels (Barlow Condensed or equivalent), IBM Plex Mono for numbers. Tabular nums. Letter-spacing on labels ~0.18em, uppercase.

---

## MFD bodies

**Hold (default in flight with cargo)**  
T1, T2, hull, throttle. One line of cargo (`Iron ore · 12u`) or `empty hold`.

**Ship**  
Hull, heat, throttle, boost pips. Wear percent. One boost, not several flavours.

**Jump**  
T2, heading alignment, lock quality. Jump control lives here, not as a floating debug button. Spool then fail-closed if heading is off.

---

## Docked

Same language. Plates become Gate / Hangar / Watch / Board. Still ivory + teal plates. No separate “website UI”. Board and market watch are station screens, not a glass ticker on the canopy.

**Implemented** on the live docked overlays: `helion-dock` ink plates, teal kickers, square ivory CTAs, hairline cards. Charts / File / Log use the same sheet language.

---

## Do not

- Orange / amber Elite clone
- Per-ship unique HUD layouts
- Visible settings / mute on the flight view
- Growing planet radii to make the HUD feel bigger
- Covering the hauler with a center radar
- Emoji, neon, mesh gradients

---

## Grok Build prompt (paste this)

```
Replace the Starwake flight HUD with Helion Cluster. One HUD for all ships.

Language: third-person chase-cam instrument plates, not a cockpit, not a debug overlay. Keep the ship and the sky empty. Bottom-left plate = lock (name, distance, ETA) plus a compact radar that lives inside the plate, never over the hull. Bottom-right plate = own ship with MFD tabs Ship / Hold / Jump that swap the plate body. Top-left = system name only. Top-right = large tabular speed and a regime line: Free / Well / Park / Od / Dock. Speed unit is spd, rel, or orb depending on frame. Add a dedicated Park lamp when capture hold is on.

Palette: ink #07090b, ivory #d8d0c0, teal #6fbfb6. Hairline plates, corner ticks, no Elite orange, no cyan glass, no gold, no glow soup. Condensed labels, mono numbers, tabular-nums.

Remove mute, settings, options, and debug buttons from the canopy. Those stay in Gate / Hangar / pause.

Fuels: show T1 and T2 as bars. One boost, not several. Jump spools from the Jump tab and fails closed if heading is off.

Do not invent a second HUD per hull. Do not put a radar in the center of the frame. Match the Helion Cluster prototype: clustered plates, ivory on teal, chase-cam sky clear.
```
