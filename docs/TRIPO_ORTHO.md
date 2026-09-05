# Tripo AI Studio — generic hull from an ortho sheet

Image is the mesh. Prompt is hardware + materials. Do **not** paste the Visual Law novel into Tripo.

## Feed the image

1. Open `public/starwake/ortho/<hull>.jpg`.
2. Crop the four cells (TL front, TR starboard, BL top, BR rear).
3. Upload as **multi-view** (2–4 images). Best set: **starboard + rear + front**. Top if it takes a fourth.
4. If the UI only takes **one** image: use the **starboard** cell, not the full 2×2. A contact sheet often becomes four ships.

Even lighting, dark void, subject filling the cell — already true of these stills.

## Prompt (paste)

```
STARWAKE working spacecraft, single complete hull, one solid piece, watertight, game-ready hard-surface.

Form: industrial packet/cargo/tool ship, blocky modular plates, sparse seams, physically plausible scale, not a fighter, not luxury sci-fi.

Materials: charcoal hull, cold steel, matte ceramic plates, heat stain only at the stern bells, muted amber nav lights, idle cyan/teal thruster glow. PBR, high roughness plates, metal radiator fins, dark cockpit slit.

Hardware: main drive bells exit the stern on the long axis, facing aft. Side RCS are tiny flush nozzles, clearly smaller than the mains. Sensor dishes faired and low. Flat radiator or heat-exchanger panels on the hull. Flush FSD spine strip. Landing gear retracted.

Style: near-future NASA-industrial, Expanse working craft, clean topology, real-time game asset, original_image texture alignment.

Follow the reference silhouette and panel layout. Reconstruct only this one ship.
```

## Negative (if the field exists)

```
no second ship, no 2x2 collage, no four copies, no people, no stand, no ground, no planet, no text, no watermark, no chrome, no anime wings, no offset warp ring, no hoop, no torus, no floating parts, no side engines larger than the stern bells, no landing gear down, no base, no extra limbs
```

## Toggles

- Texture: on  
- PBR: on  
- Texture alignment: `original_image`  
- Add **game ready** / **clean topology** if there is a quality chip (Tripo P1)

## Per-hull one-liner (append after the generic prompt)

| Hull | Append |
|------|--------|
| Courier | long rectangular packet spine, blunt nose, pair of stern bells |
| Scout | needle hull, faired chin dish, dorsal radiator panels |
| Clipper | long flat dart, one oversized stern bell, radiator vanes as heat sinks not wings |
| Tug | cube-forward hull, docking collar is the entire bow, aft bells |
| Extractor | wide flat ore skip, one faired side scoop, roof radiator grids |
| Tender | two cryo spheres in a line, bow collar, HX between tanks, stern bells |
| Hauler | long cargo box, flush bow collar, stern bell bank under HX vanes |
