export type TrafficRole = "berthed" | "approach" | "lane" | "cruise";

/** How far a flying hull still draws. 280 was pad-local and left the system empty. */
export const FLY_DRAW = 14000;
export const FLY_MAX = 14;
export const FLY_HULL_SCALE = 2.4;

export function cruiseWanted(sys: { stations: { length: number }; planets: { length: number } }): number {
  const hubs = sys.stations.length;
  if (hubs >= 3) return 10;
  if (hubs >= 1) return 8;
  return Math.min(6, Math.max(4, sys.planets.length + 2));
}

export function flyVisible(role: TrafficRole, dist: number) {
  if (role === "berthed") return dist <= 280;
  return dist <= FLY_DRAW;
}

export function flyDrawScale(role: TrafficRole, dist: number, scale: number) {
  if (role === "berthed") return scale;
  return Math.max(scale, Math.min(16, dist * 0.002));
}
