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
