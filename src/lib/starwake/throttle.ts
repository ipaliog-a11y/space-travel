/**
 * Throttle lever: reverse below 0, idle halt near a pad, forward / overdrive above.
 * Visual: reverse is the bottom 22% of the track; 0 sits on a detent.
 */
export const THR_MIN = -1;
export const THR_MAX = 1;
export const THR_DEAD = 0.04;
export const THR_DOCK_CAP = 0.26;
export const THR_DOCK_REV = -0.55;
export const THR_REV_FRAC = 0.62;
export const THR_ZERO_VIS = 0.22;
/** Relative speed (engine units) under which idle throttle kills residual drift near a pad. */
export const HALT_REL = 7;

export function clampThrottle(t: number, overheated: boolean, odGate: number, docking: boolean): number {
  const hi = docking ? Math.min(overheated ? odGate : THR_MAX, THR_DOCK_CAP) : overheated ? odGate : THR_MAX;
  const lo = docking ? THR_DOCK_REV : THR_MIN;
  if (!Number.isFinite(t)) return 0;
  return Math.max(lo, Math.min(hi, t));
}

export function driveFromThrottle(t: number, cruise: number, odSpeed: number, odGate: number): number {
  if (t >= 0) {
    if (t <= odGate) return (t / Math.max(0.05, odGate)) * cruise;
    const k = (t - odGate) / 0.25;
    return cruise + k * (odSpeed - cruise);
  }
  return t * cruise * THR_REV_FRAC;
}

export function throttleToVisual(t: number): number {
  const x = Math.max(THR_MIN, Math.min(THR_MAX, t));
  if (x >= 0) return THR_ZERO_VIS + x * (1 - THR_ZERO_VIS);
  return THR_ZERO_VIS * (x + 1);
}

export function visualToThrottle(v: number): number {
  const u = Math.max(0, Math.min(1, v));
  if (u >= THR_ZERO_VIS) return (u - THR_ZERO_VIS) / (1 - THR_ZERO_VIS);
  return u / THR_ZERO_VIS - 1;
}

export function idleHalt(
  throttle: number,
  docking: boolean,
  nearStation: boolean,
  relSpeed: number,
): boolean {
  if (Math.abs(throttle) > THR_DEAD) return false;
  if (docking) return true;
  return nearStation && relSpeed < HALT_REL;
}

/** Closing speed along heading while on the pad approach. Negative = reverse. */
export function dockClose(throttle: number, drive: number): number {
  if (throttle > THR_DEAD) return 1.4 + Math.max(0, drive) * 1.6;
  if (throttle < -THR_DEAD) return drive * 1.35;
  return 0;
}
