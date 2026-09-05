import { hashu, mulberry32 } from "./math.ts";
import type { Planet, Station, StarSystem } from "./types.ts";
import type { ShipId } from "./types.ts";
import { GATE_COUNT, gateFrame, occupiedGates, stationFrame } from "./stations.ts";
import { HULL_SCALE, TRAFFIC_HULLS } from "./hull-kit.ts";

export type TrafficPose = {
  hull: ShipId;
  pos: [number, number, number];
  forward: [number, number, number];
  up: [number, number, number];
  scale: number;
  glow: number;
  stationId: string;
  role: "berthed" | "approach" | "lane";
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

/** Berthed hulls on occupied gates (not gate 0) plus one approaching ship per hub. */
export function stationTraffic(st: Station, planet: Planet, t: number): TrafficPose[] {
  const occ = occupiedGates(st);
  const rng = mulberry32(hashu(st.id) ^ 0x71c3);
  const poses: TrafficPose[] = [];
  const scale = HULL_SCALE * (0.88 + (hashu(st.id) % 13) * 0.012);
  for (let i = 0; i < GATE_COUNT; i++) {
    if (!occ[i]) continue;
    const g = gateFrame(st, planet, t, i);
    const hull = pickHull(hashu(`${st.id}|g${i}`));
    const ox = g.out[0], oy = g.out[1], oz = g.out[2];
    const px = g.pos[0] - ox * 2.55;
    const py = g.pos[1] - oy * 2.55;
    const pz = g.pos[2] - oz * 2.55;
    poses.push({
      hull,
      pos: [px, py, pz],
      forward: [-ox, -oy, -oz],
      up: g.up,
      scale,
      glow: 0.12,
      stationId: st.id,
      role: "berthed",
    });
  }

  const flyGate = 1 + Math.floor(rng() * (GATE_COUNT - 1));
  const g = gateFrame(st, planet, t, flyGate);
  const f = stationFrame(st, planet, t);
  const period = 48 + rng() * 36;
  const phase = ((t / period) + rng()) % 1;
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
  const pos: [number, number, number] = [
    a[0] + (b[0] - a[0]) * u,
    a[1] + (b[1] - a[1]) * u,
    a[2] + (b[2] - a[2]) * u,
  ];
  const lift = Math.sin(u * Math.PI) * st.ringR * 0.55;
  pos[0] += f.up[0] * lift;
  pos[1] += f.up[1] * lift;
  pos[2] += f.up[2] * lift;
  const fwd = vnorm(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
  poses.push({
    hull: pickHull(hashu(`${st.id}|fly`)),
    pos,
    forward: fwd,
    up: f.up,
    scale: scale * 0.96,
    glow: 0.55 + (inbound ? 0.2 : 0),
    stationId: st.id,
    role: "approach",
  });
  return poses;
}

/** One courier/hauler hopping between the first two hubs when a system has more than one. */
export function laneTraffic(sys: StarSystem, t: number): TrafficPose[] {
  if (sys.stations.length < 2) return [];
  const a = sys.stations[0];
  const b = sys.stations[1];
  const pa = sys.planets.find((p) => p.id === a.planetId);
  const pb = sys.planets.find((p) => p.id === b.planetId);
  if (!pa || !pb) return [];
  const fa = stationFrame(a, pa, t);
  const fb = stationFrame(b, pb, t);
  const period = 72;
  const phase = (t / period + (hashu(sys.id) % 100) / 100) % 1;
  const inbound = phase < 0.5;
  const u = smooth(inbound ? phase * 2 : (phase - 0.5) * 2);
  const from = inbound ? fa.hub : fb.hub;
  const to = inbound ? fb.hub : fa.hub;
  const pos: [number, number, number] = [
    from[0] + (to[0] - from[0]) * u,
    from[1] + (to[1] - from[1]) * u,
    from[2] + (to[2] - from[2]) * u,
  ];
  const lift = Math.sin(u * Math.PI) * Math.max(a.ringR, b.ringR) * 3.4;
  pos[0] += fa.up[0] * lift;
  pos[1] += fa.up[1] * lift;
  pos[2] += fa.up[2] * lift;
  return [
    {
      hull: pickHull(hashu(sys.id) ^ 0x9e37) === "extractor" ? "hauler" : pickHull(hashu(sys.id) ^ 0x9e37),
      pos,
      forward: vnorm(to[0] - from[0], to[1] - from[1], to[2] - from[2]),
      up: fa.up,
      scale: HULL_SCALE * 1.05,
      glow: 0.72,
      stationId: inbound ? b.id : a.id,
      role: "lane",
    },
  ];
}

export function systemTraffic(sys: StarSystem, t: number): TrafficPose[] {
  const out: TrafficPose[] = [];
  for (const st of sys.stations) {
    const planet = sys.planets.find((p) => p.id === st.planetId);
    if (planet) out.push(...stationTraffic(st, planet, t));
  }
  out.push(...laneTraffic(sys, t));
  return out;
}

export function trafficCensus(poses: { role: TrafficPose["role"] }[]) {
  let fly = 0;
  let pad = 0;
  for (const p of poses) {
    if (p.role === "berthed") pad += 1;
    else fly += 1;
  }
  return { fly, pad, all: poses.length };
}
