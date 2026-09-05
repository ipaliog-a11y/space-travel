/**
 * BUILD 11 — risk. Helion trader, not a combat sim.
 * Interdiction is pay / dump / boost. No hull loss.
 */

export const INTERDICT_OD_SEC = 9;
export const INTERDICT_COOL_MS = 90_000;

export function haulAtRisk(loadedJob: boolean, cargoUnits: number): boolean {
  return Boolean(loadedJob) || Math.max(0, cargoUnits) > 0;
}

/** Call while in OD with a haul. rng is 0–1. */
export function rollInterdict(odSec: number, rng: number, loaded: boolean): boolean {
  if (!loaded || odSec < INTERDICT_OD_SEC) return false;
  return rng < 0.11;
}

export function interdictRansom(jobPay: number, cargoMark: number): number {
  const stake = Math.max(0, jobPay) + Math.max(0, cargoMark);
  return Math.max(40, Math.round(stake * 0.35));
}

export function boostEscapes(rng: number): boolean {
  return rng < 0.55;
}
