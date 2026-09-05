/**
 * BUILD 12 — player station, storage first.
 * Helion trader: one lock you own. Not a citadel, not a walkable interior.
 */
import type { Station, StarSystem } from "./types.ts";

export const OUTPOST_COST = 36_000;
export const OUTPOST_CAP = 120;

export type Outpost = {
  id: string;
  systemId: string;
  planetId: string;
  name: string;
  tier: number;
  cap: number;
};

export function sanitizeOutpost(raw: unknown): Outpost | null {
  if (!raw || typeof raw !== "object") return null;
  const p = raw as Partial<Outpost>;
  if (typeof p.id !== "string" || !p.id.startsWith("st-own-")) return null;
  if (typeof p.systemId !== "string" || !p.systemId) return null;
  if (typeof p.planetId !== "string" || !p.planetId) return null;
  const name = typeof p.name === "string" && p.name.trim() ? p.name.trim().slice(0, 32) : "Annex";
  const cap = typeof p.cap === "number" && p.cap > 0 ? Math.round(p.cap) : OUTPOST_CAP;
  return {
    id: p.id.slice(0, 48),
    systemId: p.systemId.slice(0, 48),
    planetId: p.planetId.slice(0, 48),
    name,
    tier: 0,
    cap: Math.max(24, Math.min(240, cap)),
  };
}

export function outpostStation(o: Outpost): Station {
  return {
    id: o.id,
    name: o.name,
    planetId: o.planetId,
    kind: "truss",
    radius: 6.4,
    ringR: 12.2,
    phase: 1.72,
    color: [0.74, 0.8, 0.78],
    accent: [0.44, 0.75, 0.71],
  };
}

export function withOutpost(sys: StarSystem, o: Outpost | null): StarSystem {
  if (!o || o.systemId !== sys.id) return sys;
  if (sys.stations.some((s) => s.id === o.id)) return sys;
  const st = outpostStation(o);
  const planets = sys.planets.map((p) =>
    p.id === o.planetId && !p.stationId ? { ...p, interest: "port" as const, stationId: o.id, prospect: null } : p,
  );
  return { ...sys, stations: [...sys.stations, st], planets };
}

export function pickOutpostPlanet(sys: StarSystem) {
  return sys.planets.find((p) => !p.stationId) ?? sys.planets[0] ?? null;
}

export function foundOutpost(sys: StarSystem, callSign: string): Outpost | null {
  const planet = pickOutpostPlanet(sys);
  if (!planet) return null;
  const tag = (callSign || "Line").trim().slice(0, 16);
  return {
    id: `st-own-${sys.id}`,
    systemId: sys.id,
    planetId: planet.id,
    name: `${tag} Annex`,
    tier: 0,
    cap: OUTPOST_CAP,
  };
}

export function isOwnLock(stationId: string, o: Outpost | null) {
  return Boolean(o && o.id === stationId);
}

export function padCap(hub: string, o: Outpost | null): number | null {
  if (!o) return null;
  if (hub === `${o.systemId}:${o.id}`) return o.cap;
  return null;
}
