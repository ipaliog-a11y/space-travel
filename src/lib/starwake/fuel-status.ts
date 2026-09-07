import { T1_PER_DIST } from "./catalog.ts";

/** Match engine dry cut. */
export const FUEL_DRY = 0.05;
/** Warn under this fraction of the tank. */
export const FUEL_LOW = 0.15;

/** FSD bill: 20% T1 / 80% T2 of the hop. */
export const FSD_T1_SHARE = 0.2;
export const FSD_T2_SHARE = 0.8;

/** Star sip. 1% of T1 cap per second in the scoop band. */
export const SCOOP_T1_PER_SEC = 0.01;
export const SCOOP_INNER = 1.35;
export const SCOOP_OUTER = 2.9;

export type TankBand = "ok" | "low" | "dry";

export type FsdMix = { t1: number; t2: number };

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

/** Map a T2 hop bill onto both tanks. T1 scaled by tank sizes so the 20% is felt. */
export function fsdMix(hopT2: number, t1Cap: number, t2Cap: number): FsdMix {
  const bill = Math.max(0, hopT2);
  const scale = t2Cap > 0 ? t1Cap / t2Cap : 1;
  return {
    t1: +(bill * FSD_T1_SHARE * scale).toFixed(2),
    t2: +(bill * FSD_T2_SHARE).toFixed(2),
  };
}

export function canPayFsd(t1: number, t2: number, mix: FsdMix): boolean {
  return canPayT1(t1, mix.t1) && canPayT2(t2, mix.t2);
}

export function scoopBand(dist: number, starRadius: number): "in" | "near" | "out" {
  const r = Math.max(1, starRadius);
  const d = Math.max(0, dist);
  if (d > r * SCOOP_INNER && d < r * SCOOP_OUTER) return "in";
  if (d > r * 1.15 && d < r * 3.8) return "near";
  return "out";
}
