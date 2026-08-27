import { planetWorld } from "./galaxy";
import { hashu, mulberry32 } from "./math";
import type { Planet, Station, StarSystem } from "./types";

export { STATION_KIND_LABEL, STATION_KIND_SHORT, STATION_KIND_BLURB } from "./station-mesh";

export const GATE_COUNT = 10;

export function stationOf(sys: StarSystem, planet: Planet) {
  if (!planet.stationId) return null;
  return sys.stations.find((s) => s.id === planet.stationId) ?? null;
}

export function stationProximity(st: Station) {
  return st.ringR * 5.4;
}

function axesAt(planet: Planet, t: number) {
  const [px, py, pz] = planetWorld(planet, t);
  const plen = Math.hypot(px, py, pz) || 1;
  const nx = px / plen, ny = py / plen, nz = pz / plen;
  let ex = nz, ey = 0, ez = -nx;
  const el = Math.hypot(ex, ey, ez);
  if (el < 1e-4) { ex = 1; ey = 0; ez = 0; }
  else { ex /= el; ey /= el; ez /= el; }
  const ux = ny * ez - nz * ey;
  const uy = nz * ex - nx * ez;
  const uz = nx * ey - ny * ex;
  return { px, py, pz, nx, ny, nz, ex, ey, ez, ux, uy, uz };
}

export function stationWorld(st: Station, planet: Planet, t: number): [number, number, number] {
  const a = axesAt(planet, t);
  const d = planet.radius * 2.58 + st.ringR;
  const c = Math.cos(st.phase);
  const s = Math.sin(st.phase);
  return [
    a.px + a.ex * c * d + a.ux * s * d,
    a.py + a.ey * c * d + a.uy * s * d,
    a.pz + a.ez * c * d + a.uz * s * d,
  ];
}

export function stationFrame(st: Station, planet: Planet, t: number) {
  const [hx, hy, hz] = stationWorld(st, planet, t);
  const [px, py, pz] = planetWorld(planet, t);
  let ox = hx - px, oy = hy - py, oz = hz - pz;
  const ol = Math.hypot(ox, oy, oz) || 1;
  ox /= ol; oy /= ol; oz /= ol;
  let ux = 0, uy = 1, uz = 0;
  let rx = uy * oz - uz * oy;
  let ry = uz * ox - ux * oz;
  let rz = ux * oy - uy * ox;
  const rl = Math.hypot(rx, ry, rz);
  if (rl < 1e-4) {
    rx = 1; ry = 0; rz = 0;
  } else {
    rx /= rl; ry /= rl; rz /= rl;
  }
  ux = oy * rz - oz * ry;
  uy = oz * rx - ox * rz;
  uz = ox * ry - oy * rx;
  return {
    hub: [hx, hy, hz] as [number, number, number],
    out: [ox, oy, oz] as [number, number, number],
    right: [rx, ry, rz] as [number, number, number],
    up: [ux, uy, uz] as [number, number, number],
  };
}

export function gateFrame(st: Station, planet: Planet, t: number, index: number) {
  const f = stationFrame(st, planet, t);
  const ang = (index / GATE_COUNT) * Math.PI * 2;
  const c = Math.cos(ang);
  const s = Math.sin(ang);
  const gx = f.hub[0] + (f.right[0] * c + f.up[0] * s) * st.ringR;
  const gy = f.hub[1] + (f.right[1] * c + f.up[1] * s) * st.ringR;
  const gz = f.hub[2] + (f.right[2] * c + f.up[2] * s) * st.ringR;
  let ox = gx - f.hub[0], oy = gy - f.hub[1], oz = gz - f.hub[2];
  const ol = Math.hypot(ox, oy, oz) || 1;
  ox /= ol; oy /= ol; oz /= ol;
  return {
    pos: [gx, gy, gz] as [number, number, number],
    out: [ox, oy, oz] as [number, number, number],
    right: f.right,
    up: f.up,
    hub: f.hub,
  };
}

export function occupiedGates(st: Station): boolean[] {
  const rng = mulberry32(hashu(st.id) ^ 0x51a7);
  return Array.from({ length: GATE_COUNT }, (_, i) => i !== 0 && rng() > 0.42);
}

export function pickApproachGate(st: Station, planet: Planet, t: number, sx: number, sy: number, sz: number) {
  const occ = occupiedGates(st);
  let best = 0;
  let bestD = Infinity;
  for (let i = 0; i < GATE_COUNT; i++) {
    if (occ[i]) continue;
    const g = gateFrame(st, planet, t, i);
    const d = Math.hypot(sx - g.pos[0], sy - g.pos[1], sz - g.pos[2]);
    if (d < bestD) {
      bestD = d;
      best = i;
    }
  }
  return best;
}
