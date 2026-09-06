/** Jump plate: nose vs locked star, lock vs hop. Trader cone, not a pipper. */

export const HEAD_READY = 0.55;

export function wrapPi(d: number) {
  let a = d;
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}

/** Galactic bearing, same sign as in-system headingYaw (atan2(-dx, -dz)). */
export function lockBearing(from: { x: number; y: number }, to: { x: number; y: number }): number {
  return Math.atan2(-(to.x - from.x), -(to.y - from.y));
}

/** 1 = nose on the lock. 0 = opposite. */
export function jumpHead01(yaw: number, from: { x: number; y: number } | null, to: { x: number; y: number } | null): number {
  if (!from || !to) return 0;
  if (from.x === to.x && from.y === to.y) return 0;
  const off = Math.abs(wrapPi(yaw - lockBearing(from, to)));
  return Math.max(0, Math.min(1, 1 - off / Math.PI));
}

export function jumpLock01(opts: { locked: boolean; hop: boolean; t2ok: boolean }): number {
  if (!opts.locked) return 0;
  if (!opts.hop) return 0.18;
  if (!opts.t2ok) return 0.55;
  return 1;
}

export function headReady(head01: number) {
  return head01 >= HEAD_READY;
}
