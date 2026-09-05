import type { MapLayer } from "./types.ts";

export function cycleMapLayer(layer: MapLayer): MapLayer {
  return layer === "system" ? "galaxy" : "system";
}
