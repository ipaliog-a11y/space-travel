/**
 * BUILD 11 — risk. Helion trader, not a combat sim.
 * Interdiction is pay / dump / boost / slip. No hull loss.
 */
import { hashu, mulberry32 } from "./math.ts";

export const INTERDICT_OD_SEC = 9;
export const INTERDICT_COOL_MS = 90_000;
export const HOME_KITE_ID = "helion";

export function haulAtRisk(loadedJob: boolean, cargoUnits: number): boolean {
  return Boolean(loadedJob) || Math.max(0, cargoUnits) > 0;
}

export type KiteFlavor = { wild?: boolean; pads?: number; home?: boolean };

/** 0.04–0.20. Helion stays quiet. Wild pads sit higher. Never a pirate nest. */
export function systemPresence(systemId: string, flavor: KiteFlavor = {}): number {
  const home = flavor.home ?? systemId === HOME_KITE_ID;
  const roll = mulberry32(hashu(`kite|${systemId}`) >>> 0)();
  let p = 0.05 + roll * 0.1;
  if (home) p = Math.min(p, 0.055);
  if (flavor.wild) p += 0.04;
  if ((flavor.pads ?? 2) <= 1) p += 0.02;
  return Math.min(0.2, Math.max(0.04, p));
}

/** Rank 1 ~8%, rank 15 ~72%. Matches crew: they still get stopped, they slip more. */
export function playerEvade(rank: number): number {
  const r = Math.min(15, Math.max(1, Math.round(rank) || 1));
  return Math.round((0.08 + ((r - 1) / 14) * 0.64) * 100) / 100;
}

export function kiteOdds(systemId: string, rank: number, flavor: KiteFlavor = {}): { presence: number; evade: number; evadePct: number } {
  const evade = playerEvade(rank);
  const presence = systemPresence(systemId, flavor) * (1 - evade * 0.2);
  return { presence, evade, evadePct: Math.round(evade * 100) };
}

export function rollJumpKite(presence: number, rng: number, loaded: boolean): boolean {
  if (!loaded) return false;
  return rng < presence;
}

/** Call while in OD with a haul. rng is 0–1. */
export function rollInterdict(odSec: number, rng: number, loaded: boolean, presence = 0.11): boolean {
  if (!loaded || odSec < INTERDICT_OD_SEC) return false;
  return rng < presence * 0.85;
}

export function slipKite(evade: number, rng: number): boolean {
  return rng < evade;
}

export function interdictRansom(jobPay: number, cargoMark: number): number {
  const stake = Math.max(0, jobPay) + Math.max(0, cargoMark);
  return Math.max(40, Math.round(stake * 0.35));
}

export function boostEscapes(rng: number): boolean {
  return rng < 0.55;
}
