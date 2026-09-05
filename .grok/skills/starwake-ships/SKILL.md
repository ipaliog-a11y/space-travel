---
name: starwake-ships
description: >
  Starwake Visual Law for every ship / hull / spacecraft image or video.
  Load before Imagine, generate2dsprite, hangar portraits, traffic art, OG
  cards, or 3D reference boards of Courier, Hauler, Scout, Clipper, Tender,
  Tug, Extractor, annex locks, or NPC traffic. Near-future working craft,
  not sleek luxury sci-fi. Prepend the law block to every ship prompt.
metadata:
  short-description: "Starwake ship look: working hulls, not luxury sci-fi"
user-invocable: true
---

# Starwake ships

Helion trader. Hulls are **tools that fly**, not concept-car spaceships.

Open this skill **before** any `imagine_*` / sprite prompt that shows a Starwake ship. If the prompt does not contain the Visual Law block, it is wrong.

Also load **`game-asset-core`**. Hangar cards stay studio shots. Engine sprites still follow **`generate2dsprite`** (magenta key).

## 1. Paste this first — every ship prompt

Copy the block verbatim as the **first paragraph** of the Imagine prompt. Then add hull + shot. Do not paraphrase. Do not drop lines.

```
STARWAKE VISUAL LAW:
Near-future working spacecraft, not sleek luxury sci-fi.
Blocky modular hull plates, visible seams, rivets, heat-stained metal.
Asymmetric utility: radiators, sensor masts, cargo latches, docking rings.
Warp: flush spine emitter along the hull, not a hoop hanging off the side, not a glowing fantasy halo.
Palette: charcoal hull, cold steel, muted amber nav lights, cyan/teal thruster and warp glow.
No chrome, no anime wings, no text logos, no people, no planets filling the frame.
Studio presentation: clean product shot, physically plausible scale.
```

Then one class line from `src/lib/starwake/hull-class.ts` (`classPrompt`):

| Class | Length | Role | Live hulls |
|-------|--------|------|------------|
| Ion Scout | 12–18 m | fast recon | Scout |
| Warp Cutter | 22–30 m | player starter | Courier, Clipper, Tug |
| Mining Barge | 40–70 m | industrial | Extractor, Tender |
| Hauler | 50–90 m | cargo | Hauler |
| Void Frigate | 80–120 m | combat | none — not flyable |

A Courier is a **22–30 m cutter**, not a cruiser. A Hauler is **50–90 m**. Never fill the frame with a planet to fake scale.

Edits (`imagine_image_to_image`) keep the same block, then the one change.

## 2. Then name the hull

One sentence after the law: role + the bits that make *this* hull, not a generic wedge.

| Hull | Must read as |
|------|----------------|
| Courier | Slim packet runner. Thin hold. Short legs. |
| Hauler | Brick. Fat hold. Lazy stick. |
| Scout | High-gain boom / dish. Sample drawer. Long legs. |
| Clipper | Delta sprint. Hot drive. Short FSD. |
| Tender | Cryo spheres. Collar. Fuel mule. |
| Tug | Box hull, folded arms, docking ring. Harbor shove. |
| Extractor | Scoop boom, twin ore bins. Parked in a well, not racing. |

NPC traffic uses the same law, cheaper weathering, no unique livery text.

## 3. Beauty shot (default still)

Use `beautyPrompt(beautyOf(shipId))` from `hull-class.ts` — do not rewrite the camera. Fill only class / name / silhouette / unique feature.

```
STARWAKE ship hero shot.
Class: {{ION_SCOUT | WARP_CUTTER | MINING_BARGE | HAULER | VOID_FRIGATE}}
Name / variant: {{e.g. Cutter Mk-II "Ashwake"}}
Silhouette: {{one sentence: long spine + forward cockpit / fat belly barge / twin-boom fighter}}
Unique feature: {{one tool — packet hold, collar, scoop, tanks — never an offset warp ring}}
Full ship in frame, 3/4 front-above view, slight bank.
Dark studio void, faint star pinpricks only, no nebula wallpaper.
Hard rim light + soft fill. Sparse panel gaps.
Landing gear retracted. Thrusters idle cyan. Nav lights amber.
Main drive bells exit the stern, on the long axis. RCS if any is smaller and flush. Dishes faired low. Every hull shows radiator / HX panels. No hoop off the beam.
Photoreal product visualization, sharp, 8k, no text, no watermark.
STARWAKE VISUAL LAW applies.
```

Ratio `3:2` hangar / `16:9` hero. Warp and thrusters: **thin cyan/teal**, idle. Never a full-frame bloom.

Thumbs crop the same still. Engine sprites still use **`generate2dsprite`** (`#FF00FF`), not this studio shot.

Cleaner set (less plumbing): `public/starwake/hero-clean/` via `cleanBeautyPrompt`. Same law and camera. Conscious deviation: larger plates, fewer pipes. Not luxury chrome.

## 4. Refuse / retry

Fail the image and retry once if any of these show:

- Chrome mirror finish, sports-car curves, glass luxury canopy
- Anime wings, fins-for-style, sword-ship silhouettes
- Readable text, flags, manufacturer logos
- Crew, faces, hands, EVA suits
- A planet, nebula, or station eating more than a corner of the frame
- Fantasy warp: thick halo, rainbow tunnel, energy wings
- Offset / hip-mounted warp ring or hoop wider than the hull
- Main thrusters on the sides or nose; side RCS larger than the stern bells
- Radar dishes as towers or long booms
- Missing radiators / heat exchangers

Second failure: keep the closest pass, flag the defect, do not invent a third style.

## 5. Consistency

One **base** per hull. Variants (boost, dock, extract) are `imagine_image_to_image` from that path. Do not re-roll text-to-image for the same hull.

Ortho sheets: `imagine_image_to_image` from the hero still → 2×2 front / starboard / top / rear, true ortho, dump in `public/starwake/ortho/`. Keep identity. No labels. Tripo 3D: [`docs/TRIPO_ORTHO.md`](../../../docs/TRIPO_ORTHO.md) — crop cells, generic prompt, do not feed the contact sheet as one ship.

3D meshes (lathe / kit) **follow this law in silhouette and paint** — charcoal plates, teal glow, amber nav — even when the image tools are not used.
