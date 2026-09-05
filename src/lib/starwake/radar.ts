/**
 * Heading-up radar — Elite scanner, not a cosmetic sweep.
 * Forward is up. Log range so inner planets aren't glued to the hub.
 */
export type RadarKind = "star" | "planet" | "station";

export type RadarSource = {
  id: string;
  kind: RadarKind;
  x: number;
  y: number;
  z: number;
};

export type RadarBlip = {
  id: string;
  kind: RadarKind;
  /** -1..1, right is +x */
  u: number;
  /** -1..1, forward is +v (draw as up) */
  v: number;
  /** -1..1, above disc is + */
  h: number;
  dist: number;
  lock: boolean;
};

export function projectRadar(
  sources: RadarSource[],
  ship: { x: number; y: number; z: number },
  headingYaw: number,
  range: number,
  lockId: string | null,
): RadarBlip[] {
  const R = Math.max(8, range);
  const fx = -Math.sin(headingYaw);
  const fz = -Math.cos(headingYaw);
  const rx = Math.cos(headingYaw);
  const rz = -Math.sin(headingYaw);
  const logR = Math.log(1 + R);
  const out: RadarBlip[] = [];
  for (const s of sources) {
    const dx = s.x - ship.x;
    const dy = s.y - ship.y;
    const dz = s.z - ship.z;
    const dist = Math.hypot(dx, dy, dz);
    if (dist < 0.08) continue;
    const ahead = dx * fx + dz * fz;
    const right = dx * rx + dz * rz;
    const t = Math.log(1 + dist) / logR;
    const k = t / dist;
    let u = right * k;
    let v = ahead * k;
    const mag = Math.hypot(u, v);
    if (mag > 1) {
      u /= mag;
      v /= mag;
    }
    out.push({
      id: s.id,
      kind: s.kind,
      u,
      v,
      h: Math.max(-1, Math.min(1, dy / R)),
      dist,
      lock: lockId === s.id,
    });
    if (out.length >= 16) break;
  }
  return out;
}
