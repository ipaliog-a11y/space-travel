# Starwake Visual Law

Paste this **first** in every image prompt that shows a ship. Grok skill: `.grok/skills/starwake-ships/SKILL.md`.

```
STARWAKE VISUAL LAW:
Near-future working spacecraft, not sleek luxury sci-fi.
Blocky modular hull plates, visible seams, rivets, heat-stained metal.
Asymmetric utility: radiators, sensor masts, cargo latches, docking rings.
Warp: thin ring or spine emitter, not a glowing fantasy halo.
Palette: charcoal hull, cold steel, muted amber nav lights, cyan/teal thruster and warp glow.
No chrome, no anime wings, no text logos, no people, no planets filling the frame.
Studio presentation: clean product shot, physically plausible scale.
```

Then name the hull and the shot (hangar product / thumb / in-flight / sprite). Do not paraphrase the block.

## Classes

Source: [`src/lib/starwake/hull-class.ts`](../src/lib/starwake/hull-class.ts). State the length in the prompt.

| Class | Length | Role | Live hulls |
| ----- | ------ | ---- | ---------- |
| Ion Scout | 12–18 m | fast recon | Scout |
| Warp Cutter | 22–30 m | player starter | Courier, Clipper, Tug |
| Mining Barge | 40–70 m | industrial | Extractor, Tender |
| Hauler | 50–90 m | cargo | Hauler |
| Void Frigate | 80–120 m | combat | — (saved, not flyable) |

