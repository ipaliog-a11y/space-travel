import { hashu, mulberry32 } from "./math.ts";
import { keplerPosition } from "./orbit.ts";
import type { Planet, Station, StarSystem } from "./types.ts";
import type { ShipId } from "./types.ts";
import { GATE_COUNT, gateFrame, occupiedGates, stationFrame } from "./stations.ts";
import { HULL_SCALE, TRAFFIC_HULLS } from "./hull-kit.ts";
import {
  FLY_HULL_SCALE,
  FLY_MAX,
  cruiseWanted,
  type TrafficRole,
} from "./traffic-scale.ts";

export type { TrafficRole } from "./traffic-scale.ts";
export {
  FLY_DRAW,
  FLY_HULL_SCALE,
  FLY_MAX,
  cruiseWanted,
  flyDrawScale,
  flyVisible,
} from "./traffic-scale.ts";

export type TrafficPose = {
  hull: ShipId;
  pos: [number, number, number];
  forward: [number, number, number];
  up: [number, number, number];
  scale: number;
  glow: number;
  stationId: string;
  role: TrafficRole;
};

function pickHull(seed: number): ShipId {
  return TRAFFIC_HULLS[Math.abs(seed) % TRAFFIC_HULLS.length];
}

function smooth(u: number) {
  const t = Math.max(0, Math.min(1, u));
  return t * t * (3 - 2 * t);
}

function vlen(x: number, y: number, z: number) {
  return Math.hypot(x, y, z) || 1;
}

function vnorm(x: number, y: number, z: number): [number, number, number] {
  const l = vlen(x, y, z);
  return [x / l, y / l, z / l];
}

function lerp3(a: [number, number, number], b: [number, number, number], u: number): [number, number, number] {
  return [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, a[2] + (b[2] - a[2]) * u];
}

function approachPose(st: Station, planet: Planet, t: number, seed: string, scale: number): TrafficPose {
  const rng = mulberry32(hashu(seed) >>> 0);
  const flyGate = 1 + Math.floor(rng() * (GATE_COUNT - 1));
  const g = gateFrame(st, planet, t, flyGate);
  const f = stationFrame(st, planet, t);
  const period = 48 + rng() * 36;
  const phase = (t / period + rng()) % 1;
  const u = phase < 0.46 ? smooth(phase / 0.46) : smooth(1 - (phase - 0.46) / 0.54);
  const inbound = phase < 0.46;
  const far = st.ringR * 7.2;
  const from: [number, number, number] = [
    g.pos[0] + f.right[0] * far + f.up[0] * st.ringR * 1.4 + g.out[0] * far * 0.35,
    g.pos[1] + f.right[1] * far + f.up[1] * st.ringR * 1.4 + g.out[1] * far * 0.35,
    g.pos[2] + f.right[2] * far + f.up[2] * st.ringR * 1.4 + g.out[2] * far * 0.35,
  ];
  const dock: [number, number, number] = [
    g.pos[0] - g.out[0] * 2.55,
    g.pos[1] - g.out[1] * 2.55,
    g.pos[2] - g.out[2] * 2.55,
  ];
  const a = inbound ? from : dock;
  const b = inbound ? dock : from;
  const pos = lerp3(a, b, u);
  const lift = Math.sin(u * Math.PI) * st.ringR * 0.55;
  pos[0] += f.up[0] * lift;
  pos[1] += f.up[1] * lift;
  pos[2] += f.up[2] * lift;
  return {
    hull: pickHull(hashu(seed)),
    pos,
    forward: vnorm(b[0] - a[0], b[1] - a[1], b[2] - a[2]),
    up: f.up,
    scale: scale * 0.96,
    glow: 0.55 + (inbound ? 0.2 : 0),
    stationId: st.id,
    role: "approach",
  };
}

/** Berthed hulls on occupied gates (not gate 0) plus two approaching ships per hub. */
export function stationTraffic(st: Station, planet: Planet, t: number): TrafficPose[] {
  const occ = occupiedGates(st);
  const poses: TrafficPose[] = [];
  const scale = HULL_SCALE * (0.88 + (hashu(st.id) % 13) * 0.012);
  for (let i = 0; i < GATE_COUNT; i++) {
    if (!occ[i]) continue;
    const g = gateFrame(st, planet, t, i);
    const hull = pickHull(hashu(`${st.id}|g${i}`));
    const ox = g.out[0], oy = g.out[1], oz = g.out[2];
    poses.push({
      hull,
      pos: [g.pos[0] - ox * 2.55, g.pos[1] - oy * 2.55, g.pos[2] - oz * 2.55],
      forward: [-ox, -oy, -oz],
      up: g.up,
      scale,
      glow: 0.12,
      stationId: st.id,
      role: "berthed",
    });
  }
  poses.push(approachPose(st, planet, t, `${st.id}|fly|0`, scale));
  poses.push(approachPose(st, planet, t, `${st.id}|fly|1`, scale));
  return poses;
}

function hopPose(
  sys: StarSystem,
  from: [number, number, number],
  to: [number, number, number],
  t: number,
  period: number,
  phase0: number,
  hullSeed: number,
  stationId: string,
  role: TrafficRole,
  lift: number,
): TrafficPose {
  const phase = (t / period + phase0) % 1;
  const inbound = phase < 0.5;
  const u = smooth(inbound ? phase * 2 : (phase - 0.5) * 2);
  const a = inbound ? from : to;
  const b = inbound ? to : from;
  const pos = lerp3(a, b, u);
  pos[1] += Math.sin(u * Math.PI) * lift;
  let hull = pickHull(hullSeed);
  if (hull === "extractor") hull = "hauler";
  return {
    hull,
    pos,
    forward: vnorm(b[0] - a[0], b[1] - a[1], b[2] - a[2]),
    up: [0, 1, 0],
    scale: FLY_HULL_SCALE,
    glow: 0.7,
    stationId,
    role,
  };
}

/** Two packet runners between the first hubs when a system has more than one. */
export function laneTraffic(sys: StarSystem, t: number): TrafficPose[] {
  if (sys.stations.length < 2) return [];
  const a = sys.stations[0];
  const b = sys.stations[1];
  const pa = sys.planets.find((p) => p.id === a.planetId);
  const pb = sys.planets.find((p) => p.id === b.planetId);
  if (!pa || !pb) return [];
  const fa = stationFrame(a, pa, t);
  const fb = stationFrame(b, pb, t);
  const lift = Math.max(a.ringR, b.ringR) * 3.4;
  return [
    hopPose(sys, fa.hub, fb.hub, t, 72, (hashu(sys.id) % 100) / 100, hashu(sys.id) ^ 0x9e37, inboundStation(a.id, b.id, t, 72, 0), "lane", lift),
    hopPose(sys, fa.hub, fb.hub, t, 96, 0.37, hashu(sys.id) ^ 0x51c2, inboundStation(a.id, b.id, t, 96, 0.37), "lane", lift * 1.15),
  ];
}

function inboundStation(a: string, b: string, t: number, period: number, phase0: number) {
  const phase = (t / period + phase0) % 1;
  return phase < 0.5 ? b : a;
}

export function cruiseTraffic(sys: StarSystem, t: number): TrafficPose[] {
  const worlds = sys.planets;
  if (!worlds.length) return [];
  const n = cruiseWanted(sys);
  const poses: TrafficPose[] = [];
  for (let i = 0; i < n; i++) {
    const rng = mulberry32(hashu(`${sys.id}|cruise|${i}`) >>> 0);
    const period = 70 + rng() * 90;
    if (i % 2 === 0 || worlds.length < 2) {
      const a = 1100 + rng() * 6400;
      const w = (Math.PI * 2) / period;
      const ang = rng() * Math.PI * 2 + t * w;
      const y = (rng() - 0.5) * a * 0.07;
      const pos: [number, number, number] = [Math.cos(ang) * a, y, Math.sin(ang) * a];
      let hull = pickHull(hashu(`${sys.id}|h|${i}`));
      if (hull === "extractor" && rng() > 0.3) hull = "courier";
      poses.push({
        hull,
        pos,
        forward: vnorm(-Math.sin(ang), 0, Math.cos(ang)),
        up: [0, 1, 0],
        scale: FLY_HULL_SCALE,
        glow: 0.64,
        stationId: sys.stations[i % Math.max(1, sys.stations.length)]?.id ?? sys.id,
        role: "cruise",
      });
    } else {
      const ia = i % worlds.length;
      const ib = (ia + 1) % worlds.length;
      const pa = keplerPosition(worlds[ia], t);
      const pb = keplerPosition(worlds[ib], t);
      const lift = 160 + rng() * 220;
      poses.push(
        hopPose(
          sys,
          pa,
          pb,
          t,
          period,
          rng(),
          hashu(`${sys.id}|hop|${i}`),
          sys.stations[i % Math.max(1, sys.stations.length)]?.id ?? sys.id,
          "cruise",
          lift,
        ),
      );
    }
  }
  return poses;
}

export function systemTraffic(sys: StarSystem, t: number): TrafficPose[] {
  const out: TrafficPose[] = [];
  for (const st of sys.stations) {
    const planet = sys.planets.find((p) => p.id === st.planetId);
    if (planet) out.push(...stationTraffic(st, planet, t));
  }
  out.push(...laneTraffic(sys, t));
  out.push(...cruiseTraffic(sys, t));
  const pad = out.filter((p) => p.role === "berthed");
  const fly = out.filter((p) => p.role !== "berthed");
  return [...pad, ...fly.slice(0, FLY_MAX)];
}

export function trafficCensus(poses: { role: TrafficRole }[]) {
  let fly = 0;
  let pad = 0;
  for (const p of poses) {
    if (p.role === "berthed") pad += 1;
    else fly += 1;
  }
  return { fly, pad, all: poses.length };
}
