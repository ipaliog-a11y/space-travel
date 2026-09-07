import { T1_PER_DIST } from "./catalog.ts";

/** Match engine dry cut. */
export const FUEL_DRY = 0.05;
/** Warn under this fraction of the tank. */
export const FUEL_LOW = 0.15;

export type TankBand = "ok" | "low" | "dry";

export function tankBand(fuel: number, cap: number): TankBand {
  const v = Math.max(0, fuel);
  const c = Math.max(0, cap);
  if (v <= FUEL_DRY) return "dry";
  if (c > 0 && v / c < FUEL_LOW) return "low";
  return "ok";
}

export function tankLabel(band: TankBand): string {
  if (band === "dry") return "Dry";
  if (band === "low") return "Low";
  return "Ok";
}

/** In-system hop sip. Floor so a pad next door still costs. */
export function transitT1Cost(dist: number): number {
  return Math.max(0.4, Math.max(0, dist) * T1_PER_DIST);
}

export function canPayT1(fuel: number, cost: number): boolean {
  return fuel > FUEL_DRY && fuel + 1e-4 >= cost;
}

export function canPayT2(fuel2: number, cost: number): boolean {
  return fuel2 > FUEL_DRY && fuel2 + 1e-4 >= cost;
}
