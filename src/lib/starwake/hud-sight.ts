/** Look-sights. Trader HUD, not a gun pipper. */

export const SIGHT_IDS = ["pip", "ladder", "ring"] as const;
export type SightId = (typeof SIGHT_IDS)[number];

export const SIGHTS: { id: SightId; name: string; note: string }[] = [
  { id: "pip", name: "Pip", note: "Minimal cross" },
  { id: "ladder", name: "Ladder", note: "Flight bars" },
  { id: "ring", name: "Ring", note: "Lock brackets" },
];

export function coerceSight(v: unknown): SightId {
  return v === "ladder" || v === "ring" || v === "pip" ? v : "pip";
}

export const HEAT_RING = 2 * Math.PI * 34;
