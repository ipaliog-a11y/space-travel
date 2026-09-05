/**
 * Size classes for art, scale copy, and later hulls.
 * Combat (VOID_FRIGATE) is saved, not flyable.
 */
import type { ShipId } from "./types.ts";

export const HULL_CLASSES = [
  { id: "ION_SCOUT", name: "Ion Scout", lengthMin: 12, lengthMax: 18, role: "fast recon", flyable: true },
  { id: "WARP_CUTTER", name: "Warp Cutter", lengthMin: 22, lengthMax: 30, role: "player starter", flyable: true },
  { id: "MINING_BARGE", name: "Mining Barge", lengthMin: 40, lengthMax: 70, role: "industrial", flyable: true },
  { id: "HAULER", name: "Hauler", lengthMin: 50, lengthMax: 90, role: "cargo", flyable: true },
  { id: "VOID_FRIGATE", name: "Void Frigate", lengthMin: 80, lengthMax: 120, role: "combat", flyable: false },
] as const;

export type HullClassId = (typeof HULL_CLASSES)[number]["id"];
export type HullClass = (typeof HULL_CLASSES)[number];

export const HULL_CLASS_OF: Record<ShipId, HullClassId> = {
  scout: "ION_SCOUT",
  clipper: "WARP_CUTTER",
  courier: "WARP_CUTTER",
  tug: "WARP_CUTTER",
  extractor: "MINING_BARGE",
  tender: "MINING_BARGE",
  hauler: "HAULER",
};

export function hullClass(id: HullClassId): HullClass {
  return HULL_CLASSES.find((c) => c.id === id) ?? HULL_CLASSES[0];
}

export function classOfHull(shipId: ShipId): HullClass {
  return hullClass(HULL_CLASS_OF[shipId]);
}

export function lengthLine(c: HullClass) {
  return `${c.lengthMin}–${c.lengthMax} m`;
}

/** Append after the Visual Law: keeps Imagine from drawing city-sized craft. */
export function classPrompt(c: HullClass) {
  return `${c.name} class, ${lengthLine(c)}, ${c.role}, physically plausible scale.`;
}

export const VISUAL_LAW = `STARWAKE VISUAL LAW:
Near-future working spacecraft, not sleek luxury sci-fi.
Blocky modular hull plates, visible seams, rivets, heat-stained metal.
Asymmetric utility: radiators, sensor masts, cargo latches, docking rings.
Warp: thin ring or spine emitter, not a glowing fantasy halo.
Palette: charcoal hull, cold steel, muted amber nav lights, cyan/teal thruster and warp glow.
No chrome, no anime wings, no text logos, no people, no planets filling the frame.
Studio presentation: clean product shot, physically plausible scale.`;

export type BeautyShot = {
  classId: HullClassId;
  name: string;
  silhouette: string;
  feature: string;
};

export const BEAUTY_OF: Record<ShipId, BeautyShot> = {
  scout: {
    classId: "ION_SCOUT",
    name: `Scout "Far Eye"`,
    silhouette: "long spine + forward cockpit blister and a high-gain dish boom",
    feature: "offset sensor mast and a sealed sample drawer",
  },
  courier: {
    classId: "WARP_CUTTER",
    name: `Cutter Mk-II "Ashwake"`,
    silhouette: "long spine + forward cockpit, packet hold amidships",
    feature: "offset warp ring on a thin emitter spine",
  },
  clipper: {
    classId: "WARP_CUTTER",
    name: `Clipper "Hotleg"`,
    silhouette: "delta sprint hull, short FSD, forward cockpit",
    feature: "hot drive bells and a slim packet rack",
  },
  tug: {
    classId: "WARP_CUTTER",
    name: `Tug "Collar"`,
    silhouette: "box hull with folded transfer arms and a docking ring",
    feature: "folded harbor arms and a face-on capture ring",
  },
  extractor: {
    classId: "MINING_BARGE",
    name: `Barge "Wellsip"`,
    silhouette: "fat belly barge with a ventral scoop boom",
    feature: "ventral mining drill and twin ore bins",
  },
  tender: {
    classId: "MINING_BARGE",
    name: `Tender "Cryo"`,
    silhouette: "depot hull with two cryo spheres and a fuel collar",
    feature: "twin cryo tanks and a transfer collar",
  },
  hauler: {
    classId: "HAULER",
    name: `Hauler "Brick"`,
    silhouette: "fat belly cargo brick, lazy stick, blunt nose",
    feature: "boxy cargo rack and a wide docking collar",
  },
};

export const FRIGATE_BEAUTY: BeautyShot = {
  classId: "VOID_FRIGATE",
  name: `Frigate "Voidwake"`,
  silhouette: "twin-boom combat hull, long keel, forward cockpit",
  feature: "offset warp ring and faired hardpoint blisters",
};

export function beautyOf(shipId: ShipId): BeautyShot {
  return BEAUTY_OF[shipId];
}

/** Hangar dossier stills under `public/starwake/hero/`. */
export const HERO_STILL: Record<ShipId, string> = {
  scout: "/starwake/hero/scout-far-eye.jpg",
  courier: "/starwake/hero/courier-ashwake.jpg",
  clipper: "/starwake/hero/clipper-hotleg.jpg",
  tug: "/starwake/hero/tug-collar.jpg",
  extractor: "/starwake/hero/extractor-wellsip.jpg",
  tender: "/starwake/hero/tender-cryo.jpg",
  hauler: "/starwake/hero/hauler-brick.jpg",
};

/** Hangar / hero still. Law first, then the locked beauty shot. */
export function beautyPrompt(shot: BeautyShot) {
  const c = hullClass(shot.classId);
  return `${VISUAL_LAW}

STARWAKE ship hero shot.
Class: ${c.id} (${lengthLine(c)}, ${c.role})
Name / variant: ${shot.name}
Silhouette: ${shot.silhouette}
Unique feature: ${shot.feature}
Full ship in frame, 3/4 front-above view, slight bank.
Dark studio void, faint star pinpricks only, no nebula wallpaper.
Hard rim light + soft fill. Show panel gaps, thermal discoloration, antennae.
Landing gear retracted. Thrusters idle cyan. Nav lights amber.
Photoreal product visualization, sharp, 8k, no text, no watermark.
STARWAKE VISUAL LAW applies.`;
}
