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

/** 1 = nose on a world-space aim vector. */
export function aimHead01(
  fwd: [number, number, number] | null,
  to: [number, number, number] | null,
): number {
  if (!fwd || !to) return 0;
  const tl = Math.hypot(to[0], to[1], to[2]);
  if (tl < 1e-6) return 0;
  const fl = Math.hypot(fwd[0], fwd[1], fwd[2]) || 1;
  const dot = (fwd[0] * to[0] + fwd[1] * to[1] + fwd[2] * to[2]) / (fl * tl);
  return Math.max(0, Math.min(1, 0.5 + 0.5 * dot));
}

/** 1 = nose on the lock sky. 0 = opposite. Uses the real forward, not a yaw sidecar. */
export function jumpHead01(
  fwd: [number, number, number] | null,
  from: { x: number; y: number } | null,
  to: { x: number; y: number } | null,
): number {
  return aimHead01(fwd, lockSky(from, to));
}

export function jumpLock01(opts: { hop: boolean; fuelOk: boolean; cone: boolean }): number {
  if (!opts.hop) return 0;
  if (!opts.fuelOk) return 0.34;
  if (!opts.cone) return 0.67;
  return 1;
}

export function headReady(head01: number) {
  return head01 >= HEAD_READY;
}
