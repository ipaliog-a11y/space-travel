import type { KeplerOrbit, Planet, StarSystem } from "./types";

/** Play seconds that equal one labeled day. Kepler periods use this so the dossier clock matches motion. */
export const GAME_DAY_SEC = 120;
const SOL_R = 88;
const AU0 = 2800;

export function starMu(starRadius: number) {
  const mass = Math.pow(Math.max(0.28, starRadius / SOL_R), 3);
  const t0 = 365 * GAME_DAY_SEC;
  const muSol = (4 * Math.PI * Math.PI * AU0 * AU0 * AU0) / (t0 * t0);
  return muSol * mass;
}

export function periodDays(meanN: number) {
  if (!(meanN > 1e-12)) return 365;
  return (Math.PI * 2) / meanN / GAME_DAY_SEC;
}

export function planetMu(p: Planet) {
  const k = p.kind === "gas" || p.kind === "ringed" || p.kind === "icegiant" ? 2.6 : 1;
  return 0.042 * p.radius * p.radius * p.radius * k;
}

export function wrapTau(a: number) {
  const t = Math.PI * 2;
  a = a % t;
  if (a < 0) a += t;
  return a;
}

function eccentricAnomaly(M: number, e: number) {
  const m = Math.atan2(Math.sin(M), Math.cos(M));
  let E = e < 0.8 ? m : Math.PI;
  for (let i = 0; i < 10; i++) {
    const dE = (E - e * Math.sin(E) - m) / (1 - e * Math.cos(E));
    E -= dE;
    if (Math.abs(dE) < 1e-7) break;
  }
  return E;
}

function pqwToXz(
  x: number, y: number,
  vx: number, vy: number,
  argp: number, inc: number, lan: number,
) {
  const cw = Math.cos(argp), sw = Math.sin(argp);
  const ci = Math.cos(inc), si = Math.sin(inc);
  const cO = Math.cos(lan), sO = Math.sin(lan);
  const x1 = x * cw - y * sw;
  const y1 = x * sw + y * cw;
  const vx1 = vx * cw - vy * sw;
  const vy1 = vx * sw + vy * cw;
  const x2 = x1;
  const y2 = y1 * ci;
  const z2 = y1 * si;
  const vx2 = vx1;
  const vy2 = vy1 * ci;
  const vz2 = vy1 * si;
  const X = x2 * cO - y2 * sO;
  const Y = x2 * sO + y2 * cO;
  const Z = z2;
  const vX = vx2 * cO - vy2 * sO;
  const vY = vx2 * sO + vy2 * cO;
  const vZ = vz2;
  return {
    pos: [X, Z, Y] as [number, number, number],
    vel: [vX, vZ, vY] as [number, number, number],
  };
}

export function keplerState(p: KeplerOrbit, t: number) {
  const a = p.orbit;
  const e = Math.min(0.92, Math.max(0, p.ecc));
  const n = p.meanN;
  const M = p.m0 + n * t;
  const E = eccentricAnomaly(M, e);
  const cosE = Math.cos(E);
  const sinE = Math.sin(E);
  const s1e = Math.sqrt(Math.max(0, 1 - e * e));
  const x = a * (cosE - e);
  const y = a * s1e * sinE;
  const nden = 1 - e * cosE;
  const vx = -a * n * sinE / nden;
  const vy = a * n * s1e * cosE / nden;
  return pqwToXz(x, y, vx, vy, p.argp, p.inc, p.lan);
}

export function keplerPosition(p: KeplerOrbit, t: number): [number, number, number] {
  return keplerState(p, t).pos;
}

/** Face-on orbital-plane position (periapsis along argp+lan). Period is independent of e; shape is not. */
export function keplerPlane(p: KeplerOrbit, t: number): [number, number] {
  const a = p.orbit;
  const e = Math.min(0.92, Math.max(0, p.ecc));
  const n = p.meanN;
  const M = p.m0 + n * t;
  const E = eccentricAnomaly(M, e);
  const x = a * (Math.cos(E) - e);
  const y = a * Math.sqrt(Math.max(0, 1 - e * e)) * Math.sin(E);
  const w = p.argp + p.lan;
  const cw = Math.cos(w), sw = Math.sin(w);
  return [x * cw - y * sw, x * sw + y * cw];
}

export function planetSOI(p: Planet) {
  return p.radius * 16;
}

export function orbitPolyline(p: KeplerOrbit, samples = 96) {
  const pos = new Float32Array(samples * 3);
  const n = p.meanN || 1e-4;
  for (let i = 0; i < samples; i++) {
    const t = ((Math.PI * 2 * i) / samples - p.m0) / n;
    const [x, y, z] = keplerPosition(p, t);
    pos[i * 3] = x;
    pos[i * 3 + 1] = y;
    pos[i * 3 + 2] = z;
  }
  return pos;
}

export function circularVelocity(
  x: number, y: number, z: number, mu: number,
): [number, number, number] {
  const r = Math.hypot(x, y, z);
  if (r < 1e-4) return [0, 0, 0];
  const n = Math.sqrt(mu / (r * r * r));
  return [-z * n, 0, x * n];
}

export function gravityAt(
  sys: StarSystem,
  t: number,
  x: number, y: number, z: number,
  planetPos: (p: Planet) => [number, number, number],
): [number, number, number] {
  const mu = starMu(sys.starRadius);
  let ax = 0, ay = 0, az = 0;
  const r2 = x * x + y * y + z * z;
  const r = Math.sqrt(r2);
  if (r > 0.35) {
    const s = -mu / (r2 * r);
    ax += x * s;
    ay += y * s;
    az += z * s;
  }
  for (const p of sys.planets) {
    const [px, py, pz] = planetPos(p);
    const dx = x - px, dy = y - py, dz = z - pz;
    const d2 = dx * dx + dy * dy + dz * dz;
    const d = Math.sqrt(d2);
    const reach = Math.max(planetSOI(p) * 4.2, p.radius * 16);
    if (d < 0.25 || d > reach) continue;
    const s = -planetMu(p) / (d2 * d);
    ax += dx * s;
    ay += dy * s;
    az += dz * s;
  }
  return [ax, ay, az];
}
