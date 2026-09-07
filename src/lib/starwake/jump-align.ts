/** Jump plate: nose vs locked star on the sky. Trader cone, not a pipper. */

export const HEAD_READY = 0.55;

export function wrapPi(d: number) {
  let a = d;
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}

/** Galactic XY laid on the flight XZ plane. */
export function lockSky(
  from: { x: number; y: number } | null,
  to: { x: number; y: number } | null,
): [number, number, number] | null {
  if (!from || !to) return null;
  const dx = to.x - from.x;
  const dz = to.y - from.y;
  const len = Math.hypot(dx, dz);
  if (len < 1e-6) return null;
  return [dx / len, 0, dz / len];
}

/** 1 = nose on the lock sky. 0 = opposite. Uses the real forward, not a yaw sidecar. */
export function jumpHead01(
  fwd: [number, number, number] | null,
  from: { x: number; y: number } | null,
  to: { x: number; y: number } | null,
): number {
  const sky = lockSky(from, to);
  if (!sky || !fwd) return 0;
  const fl = Math.hypot(fwd[0], fwd[1], fwd[2]) || 1;
  const dot = (fwd[0] * sky[0] + fwd[1] * sky[1] + fwd[2] * sky[2]) / fl;
  return Math.max(0, Math.min(1, 0.5 + 0.5 * dot));
}

export function jumpLock01(opts: { locked: boolean; hop: boolean; t2ok: boolean; head01: number }): number {
  if (!opts.locked) return 0;
  if (!opts.hop) return 0.18;
  if (!opts.t2ok) return Math.min(0.55, 0.2 + opts.head01 * 0.35);
  return opts.head01;
}

export function headReady(head01: number) {
  return head01 >= HEAD_READY;
}
