import type { Planet, Station, StationKind } from "./types";

export const STATION_KIND_LABEL: Record<StationKind, string> = {
  wheel: "Stanford wheel",
  cylinder: "O'Neill cylinder",
  sphere: "Bernal habitat",
  truss: "Truss array",
  yard: "Drydock yard",
};

export const STATION_KIND_SHORT: Record<StationKind, string> = {
  wheel: "wheel",
  cylinder: "drum",
  sphere: "hab",
  truss: "truss",
  yard: "yard",
};

export const STATION_KIND_BLURB: Record<StationKind, string> = {
  wheel: "Spin habitat. Bays sit on the rim.",
  cylinder: "Paired drum. Collar lock at the waist.",
  sphere: "Island One shell. Equatorial docks.",
  truss: "Industrial spine. Arrays and nodes.",
  yard: "Open cage. Ships berth in the slots.",
};

const KIND_SUFFIX: Record<StationKind, string[]> = {
  wheel: ["Ring", "Lock"],
  cylinder: ["High", "Drum"],
  sphere: ["Port", "Hab"],
  truss: ["Array", "Truss"],
  yard: ["Yard", "Dock"],
};

const KIND_LOOK: Record<StationKind, { color: [number, number, number]; accent: [number, number, number] }> = {
  wheel: { color: [0.66, 0.70, 0.76], accent: [0.92, 0.78, 0.52] },
  cylinder: { color: [0.70, 0.74, 0.80], accent: [0.55, 0.86, 0.94] },
  sphere: { color: [0.72, 0.78, 0.86], accent: [0.62, 0.90, 0.98] },
  truss: { color: [0.50, 0.52, 0.56], accent: [0.95, 0.82, 0.40] },
  yard: { color: [0.58, 0.54, 0.46], accent: [0.92, 0.46, 0.22] },
};

const SHOWPIECE: StationKind[] = ["wheel", "cylinder", "sphere", "truss", "yard"];

export const HULL = 11;
export const SOLAR = 12;
export const DOCK = 13;
export const RAD = 14;

export type MeshName = "sphere" | "cyl" | "box" | "torus" | "thin" | "cone";

export type StationPart = {
  mesh: MeshName;
  p: [number, number, number];
  ax: [number, number, number];
  along: "y" | "z";
  s: [number, number, number];
  color: [number, number, number];
  emit: number;
  shade: number;
};

export type MeshData = {
  pos: Float32Array;
  nrm: Float32Array;
  count: number;
};

function pushTri(
  pos: number[], nrm: number[],
  ax: number, ay: number, az: number,
  bx: number, by: number, bz: number,
  cx: number, cy: number, cz: number,
  nx: number, ny: number, nz: number,
) {
  pos.push(ax, ay, az, bx, by, bz, cx, cy, cz);
  nrm.push(nx, ny, nz, nx, ny, nz, nx, ny, nz);
}

export function makeUnitSphere(stacks: number, slices: number): MeshData {
  const pos: number[] = [];
  const nrm: number[] = [];
  const vert = (phi: number, th: number) => {
    const x = Math.sin(phi) * Math.cos(th);
    const y = Math.cos(phi);
    const z = Math.sin(phi) * Math.sin(th);
    pos.push(x, y, z);
    nrm.push(x, y, z);
  };
  for (let i = 0; i < stacks; i++) {
    const phi0 = (i / stacks) * Math.PI;
    const phi1 = ((i + 1) / stacks) * Math.PI;
    for (let j = 0; j < slices; j++) {
      const th0 = (j / slices) * Math.PI * 2;
      const th1 = ((j + 1) / slices) * Math.PI * 2;
      vert(phi0, th0);
      vert(phi1, th0);
      vert(phi1, th1);
      vert(phi0, th0);
      vert(phi1, th1);
      vert(phi0, th1);
    }
  }
  return { pos: new Float32Array(pos), nrm: new Float32Array(nrm), count: pos.length / 3 };
}

export function makeCylinder(slices: number): MeshData {
  const pos: number[] = [];
  const nrm: number[] = [];
  for (let i = 0; i < slices; i++) {
    const a0 = (i / slices) * Math.PI * 2;
    const a1 = ((i + 1) / slices) * Math.PI * 2;
    const c0 = Math.cos(a0), s0 = Math.sin(a0);
    const c1 = Math.cos(a1), s1 = Math.sin(a1);
    pos.push(c0, -0.5, s0, c0, 0.5, s0, c1, 0.5, s1);
    nrm.push(c0, 0, s0, c0, 0, s0, c1, 0, s1);
    pos.push(c0, -0.5, s0, c1, 0.5, s1, c1, -0.5, s1);
    nrm.push(c0, 0, s0, c1, 0, s1, c1, 0, s1);
    pushTri(pos, nrm, 0, 0.5, 0, c0, 0.5, s0, c1, 0.5, s1, 0, 1, 0);
    pushTri(pos, nrm, 0, -0.5, 0, c1, -0.5, s1, c0, -0.5, s0, 0, -1, 0);
  }
  return { pos: new Float32Array(pos), nrm: new Float32Array(nrm), count: pos.length / 3 };
}

export function makeBoxMesh(): MeshData {
  const p: [number, number, number][] = [
    [-0.5, -0.5, -0.5], [0.5, -0.5, -0.5], [0.5, 0.5, -0.5], [-0.5, 0.5, -0.5],
    [-0.5, -0.5, 0.5], [0.5, -0.5, 0.5], [0.5, 0.5, 0.5], [-0.5, 0.5, 0.5],
  ];
  const faces: [number, number, number, number, number, number, number][] = [
    [4, 5, 6, 7, 0, 0, 1],
    [1, 0, 3, 2, 0, 0, -1],
    [3, 7, 6, 2, 0, 1, 0],
    [0, 1, 5, 4, 0, -1, 0],
    [5, 1, 2, 6, 1, 0, 0],
    [0, 4, 7, 3, -1, 0, 0],
  ];
  const pos: number[] = [];
  const nrm: number[] = [];
  for (const [a, b, c, d, nx, ny, nz] of faces) {
    const A = p[a], B = p[b], C = p[c], D = p[d];
    pos.push(A[0], A[1], A[2], B[0], B[1], B[2], C[0], C[1], C[2]);
    pos.push(A[0], A[1], A[2], C[0], C[1], C[2], D[0], D[1], D[2]);
    for (let i = 0; i < 6; i++) nrm.push(nx, ny, nz);
  }
  return { pos: new Float32Array(pos), nrm: new Float32Array(nrm), count: pos.length / 3 };
}

export function makeTorus(majorSeg: number, tubeSeg: number, tube: number): MeshData {
  const pos: number[] = [];
  const nrm: number[] = [];
  const R = 1;
  const pt = (u: number, v: number) => {
    const cu = Math.cos(u), su = Math.sin(u);
    const cv = Math.cos(v), sv = Math.sin(v);
    return {
      x: (R + tube * cv) * cu,
      y: (R + tube * cv) * su,
      z: tube * sv,
      nx: cv * cu,
      ny: cv * su,
      nz: sv,
    };
  };
  for (let i = 0; i < majorSeg; i++) {
    const u0 = (i / majorSeg) * Math.PI * 2;
    const u1 = ((i + 1) / majorSeg) * Math.PI * 2;
    for (let j = 0; j < tubeSeg; j++) {
      const v0 = (j / tubeSeg) * Math.PI * 2;
      const v1 = ((j + 1) / tubeSeg) * Math.PI * 2;
      const a = pt(u0, v0), b = pt(u1, v0), c = pt(u1, v1), d = pt(u0, v1);
      pos.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z);
      nrm.push(a.nx, a.ny, a.nz, b.nx, b.ny, b.nz, c.nx, c.ny, c.nz);
      pos.push(a.x, a.y, a.z, c.x, c.y, c.z, d.x, d.y, d.z);
      nrm.push(a.nx, a.ny, a.nz, c.nx, c.ny, c.nz, d.nx, d.ny, d.nz);
    }
  }
  return { pos: new Float32Array(pos), nrm: new Float32Array(nrm), count: pos.length / 3 };
}

export function makeCone(slices: number): MeshData {
  const pos: number[] = [];
  const nrm: number[] = [];
  const sl = Math.hypot(1, 1);
  const ny = 1 / sl;
  const nr = 1 / sl;
  for (let i = 0; i < slices; i++) {
    const a0 = (i / slices) * Math.PI * 2;
    const a1 = ((i + 1) / slices) * Math.PI * 2;
    const c0 = Math.cos(a0), s0 = Math.sin(a0);
    const c1 = Math.cos(a1), s1 = Math.sin(a1);
    const midx = (c0 + c1) * 0.5, midz = (s0 + s1) * 0.5;
    const ml = Math.hypot(midx, midz) || 1;
    pos.push(c0, -0.5, s0, 0, 0.5, 0, c1, -0.5, s1);
    nrm.push(c0 * nr, ny, s0 * nr, midx / ml * nr, ny, midz / ml * nr, c1 * nr, ny, s1 * nr);
    pushTri(pos, nrm, 0, -0.5, 0, c1, -0.5, s1, c0, -0.5, s0, 0, -1, 0);
  }
  return { pos: new Float32Array(pos), nrm: new Float32Array(nrm), count: pos.length / 3 };
}

function part(
  mesh: MeshName,
  p: [number, number, number],
  ax: [number, number, number],
  s: [number, number, number],
  color: [number, number, number],
  shade: number,
  emit = 0,
  along: "y" | "z" = "y",
): StationPart {
  return { mesh, p, ax, along, s, color, emit, shade };
}

export function pickStationKind(planet: Planet, rng: () => number, homeIndex: number | null): StationKind {
  if (homeIndex != null) return SHOWPIECE[homeIndex % SHOWPIECE.length];
  const gas = planet.kind === "gas" || planet.kind === "ringed" || planet.kind === "icegiant";
  if (gas) return rng() > 0.42 ? "cylinder" : "wheel";
  if (planet.kind === "ice") return rng() > 0.38 ? "sphere" : "wheel";
  if (planet.kind === "volcanic" || planet.kind === "desert") return rng() > 0.4 ? "truss" : "yard";
  if (planet.kind === "ocean") return rng() > 0.5 ? "cylinder" : "wheel";
  return rng() > 0.5 ? "wheel" : rng() > 0.5 ? "sphere" : "truss";
}

export function stationLook(kind: StationKind) {
  return KIND_LOOK[kind];
}

export function stationSuffix(kind: StationKind, rng: () => number) {
  const list = KIND_SUFFIX[kind];
  return list[Math.floor(rng() * list.length)];
}

export function stationLod(dist: number, ringR: number) {
  if (dist > ringR * 32) return 0;
  if (dist > ringR * 10) return 1;
  return 2;
}

function dark(c: [number, number, number], k: number): [number, number, number] {
  return [c[0] * k, c[1] * k, c[2] * k];
}

function layoutWheel(st: Station, lod: number): StationPart[] {
  const R = st.ringR;
  const hub = st.radius * 0.38;
  const hull = st.color;
  const acc = st.accent ?? [0.85, 0.78, 0.55];
  const dim = dark(hull, 0.72);
  const out: StationPart[] = [
    part("sphere", [0, 0, 0], [0, 1, 0], [hub, hub, hub], hull, HULL, 0.06),
    part("torus", [0, 0, 0], [0, 0, 1], [R, R, R], hull, HULL, 0.04, "z"),
  ];
  if (lod < 1) return out;
  out.push(part("cyl", [0, 0, 0], [0, 0, 1], [hub * 1.35, hub * 0.55, hub * 1.35], dim, HULL, 0.04));
  out.push(part("thin", [0, 0, 0], [0, 0, 1], [R * 0.58, R * 0.58, R * 0.58], dim, HULL, 0.02, "z"));
  const spokes = lod > 1 ? 6 : 4;
  for (let i = 0; i < spokes; i++) {
    const a = (i / spokes) * Math.PI * 2 + 0.12;
    const c = Math.cos(a), s = Math.sin(a);
    out.push(part("cyl", [c * R * 0.46, s * R * 0.46, 0], [c, s, 0], [0.28, R * 0.92, 0.28], dim, HULL));
  }
  if (lod < 2) return out;
  out.push(part("box", [0, 0, R * 0.62], [0, 0, 1], [R * 0.82, 0.07, R * 0.28], acc, SOLAR, 0.02));
  out.push(part("box", [0, 0, -R * 0.62], [0, 0, 1], [R * 0.82, 0.07, R * 0.28], acc, SOLAR, 0.02));
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + 0.4;
    out.push(part("box", [Math.cos(a) * R * 0.22, Math.sin(a) * R * 0.22, 0], [0, 0, 1], [0.16, R * 0.55, 0.05], dim, RAD, 0.08));
  }
  out.push(part("cone", [0, 0, hub * 1.15], [0, 0, 1], [0.22, hub * 0.9, 0.22], acc, HULL, 0.12));
  out.push(part("cyl", [0, 0, -hub * 0.85], [0, 0, 1], [0.16, hub * 0.7, 0.16], dim, HULL));
  out.push(part("sphere", [0, 0, hub * 1.55], [0, 1, 0], [0.18, 0.18, 0.18], acc, DOCK, 0.45));
  return out;
}

function layoutCylinder(st: Station, lod: number): StationPart[] {
  const R = st.ringR;
  const hull = st.color;
  const acc = st.accent ?? [0.85, 0.78, 0.55];
  const dim = dark(hull, 0.7);
  const rad = R * 0.36;
  const len = R * 2.45;
  const out: StationPart[] = [
    part("cyl", [0, 0, 0], [0, 0, 1], [rad, len, rad], hull, HULL, 0.05),
    part("torus", [0, 0, 0], [0, 0, 1], [R, R, R], dim, HULL, 0.05, "z"),
  ];
  if (lod < 1) return out;
  out.push(part("cyl", [0, 0, len * 0.48], [0, 0, 1], [rad * 1.12, rad * 0.22, rad * 1.12], dim, HULL, 0.04));
  out.push(part("cyl", [0, 0, -len * 0.48], [0, 0, 1], [rad * 1.12, rad * 0.22, rad * 1.12], dim, HULL, 0.04));
  out.push(part("cyl", [0, 0, 0], [0, 0, 1], [rad * 1.04, len * 0.22, rad * 1.04], acc, HULL, 0.16));
  if (lod < 2) return out;
  out.push(part("box", [0, rad * 1.35, 0], [0, 1, 0], [rad * 0.55, 0.06, len * 0.72], acc, SOLAR, 0.02));
  out.push(part("box", [0, -rad * 1.35, 0], [0, 1, 0], [rad * 0.55, 0.06, len * 0.72], acc, SOLAR, 0.02));
  out.push(part("box", [rad * 1.2, 0, 0], [1, 0, 0], [0.05, rad * 0.7, len * 0.5], dim, RAD, 0.1));
  out.push(part("box", [-rad * 1.2, 0, 0], [1, 0, 0], [0.05, rad * 0.7, len * 0.5], dim, RAD, 0.1));
  out.push(part("cone", [0, 0, len * 0.62], [0, 0, 1], [0.28, rad * 0.7, 0.28], acc, HULL, 0.1));
  out.push(part("sphere", [0, 0, -len * 0.58], [0, 1, 0], [rad * 0.28, rad * 0.28, rad * 0.28], dim, HULL, 0.04));
  out.push(part("cyl", [0, 0, 0], [1, 0, 0], [0.22, R * 1.85, 0.22], dim, HULL));
  out.push(part("cyl", [0, 0, 0], [0, 1, 0], [0.22, R * 1.85, 0.22], dim, HULL));
  return out;
}

function layoutSphere(st: Station, lod: number): StationPart[] {
  const R = st.ringR;
  const hull = st.color;
  const acc = st.accent ?? [0.85, 0.78, 0.55];
  const dim = dark(hull, 0.74);
  const hab = R * 0.62;
  const out: StationPart[] = [
    part("sphere", [0, 0, 0], [0, 1, 0], [hab, hab, hab], hull, HULL, 0.08),
    part("torus", [0, 0, 0], [0, 0, 1], [R, R, R], dim, HULL, 0.04, "z"),
  ];
  if (lod < 1) return out;
  out.push(part("cyl", [0, 0, hab * 0.72], [0, 0, 1], [hab * 0.55, hab * 0.18, hab * 0.55], dim, HULL, 0.05));
  out.push(part("cyl", [0, 0, -hab * 0.72], [0, 0, 1], [hab * 0.55, hab * 0.18, hab * 0.55], dim, HULL, 0.05));
  out.push(part("thin", [0, 0, 0], [0, 0, 1], [R * 0.78, R * 0.78, R * 0.78], acc, HULL, 0.08, "z"));
  if (lod < 2) return out;
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    out.push(part("box", [Math.cos(a) * hab * 0.85, Math.sin(a) * hab * 0.85, 0], [Math.cos(a), Math.sin(a), 0], [0.08, hab * 0.7, hab * 0.22], dim, RAD, 0.1));
  }
  out.push(part("cone", [0, 0, hab * 1.15], [0, 0, 1], [0.2, hab * 0.55, 0.2], acc, HULL, 0.14));
  out.push(part("box", [0, 0, hab * 0.15], [0, 0, 1], [hab * 1.55, 0.06, hab * 0.45], acc, SOLAR, 0.03));
  out.push(part("sphere", [0, 0, -hab * 1.05], [0, 1, 0], [0.22, 0.22, 0.22], acc, DOCK, 0.3));
  return out;
}

function layoutTruss(st: Station, lod: number): StationPart[] {
  const R = st.ringR;
  const hull = st.color;
  const acc = st.accent ?? [0.85, 0.78, 0.55];
  const dim = dark(hull, 0.78);
  const out: StationPart[] = [
    part("sphere", [0, 0, 0], [0, 1, 0], [st.radius * 0.42, st.radius * 0.42, st.radius * 0.42], hull, HULL, 0.06),
    part("cyl", [0, 0, 0], [1, 0, 0], [0.32, R * 3.1, 0.32], dim, HULL),
    part("torus", [0, 0, 0], [0, 0, 1], [R, R, R], dark(hull, 0.65), HULL, 0.03, "z"),
  ];
  if (lod < 1) return out;
  for (let i = -2; i <= 2; i++) {
    if (i === 0) continue;
    const x = (i / 2) * R * 1.35;
    out.push(part("box", [x, 0, 0], [0, 1, 0], [R * 0.22, R * 0.18, R * 0.18], hull, HULL, 0.04));
  }
  out.push(part("box", [0, R * 0.85, 0], [0, 1, 0], [R * 1.35, 0.06, R * 0.42], acc, SOLAR, 0.02));
  out.push(part("box", [0, -R * 0.85, 0], [0, 1, 0], [R * 1.35, 0.06, R * 0.42], acc, SOLAR, 0.02));
  if (lod < 2) return out;
  out.push(part("box", [R * 1.15, 0, 0], [0, 1, 0], [R * 0.08, R * 0.55, 0.05], dim, RAD, 0.12));
  out.push(part("box", [-R * 1.15, 0, 0], [0, 1, 0], [R * 0.08, R * 0.55, 0.05], dim, RAD, 0.12));
  out.push(part("cyl", [0, 0, 0], [0, 0, 1], [0.18, R * 1.1, 0.18], dim, HULL));
  out.push(part("cone", [0, 0, R * 0.62], [0, 0, 1], [0.16, R * 0.35, 0.16], acc, HULL, 0.1));
  out.push(part("cyl", [0, 0, 0], [0, 1, 0], [0.16, R * 1.55, 0.16], dim, HULL));
  out.push(part("sphere", [R * 1.52, 0, 0], [0, 1, 0], [0.45, 0.45, 0.45], hull, HULL, 0.05));
  out.push(part("sphere", [-R * 1.52, 0, 0], [0, 1, 0], [0.45, 0.45, 0.45], hull, HULL, 0.05));
  return out;
}

function layoutYard(st: Station, lod: number): StationPart[] {
  const R = st.ringR;
  const hull = st.color;
  const acc = st.accent ?? [0.85, 0.78, 0.55];
  const dim = dark(hull, 0.75);
  const out: StationPart[] = [
    part("box", [0, 0, 0], [0, 1, 0], [R * 0.55, R * 0.32, R * 0.4], hull, HULL, 0.04),
    part("torus", [0, 0, 0], [0, 0, 1], [R, R, R], dim, HULL, 0.03, "z"),
  ];
  if (lod < 1) return out;
  out.push(part("cyl", [0, R * 0.42, 0], [1, 0, 0], [0.2, R * 2.6, 0.2], dim, HULL));
  out.push(part("cyl", [0, -R * 0.42, 0], [1, 0, 0], [0.2, R * 2.6, 0.2], dim, HULL));
  for (let i = -1; i <= 1; i++) {
    out.push(part("cyl", [i * R * 0.7, 0, 0], [0, 1, 0], [0.16, R * 0.9, 0.16], dim, HULL));
  }
  if (lod < 2) return out;
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + 0.2;
    const c = Math.cos(a), s = Math.sin(a);
    out.push(part("box", [c * R * 0.72, s * R * 0.72, 0], [c, s, 0], [R * 0.28, R * 0.22, R * 0.22], hull, HULL, 0.03));
  }
  out.push(part("cyl", [R * 0.9, R * 0.55, 0], [0, 0, 1], [0.12, R * 0.9, 0.12], dim, HULL));
  out.push(part("cyl", [-R * 0.9, -R * 0.4, 0], [0, 0, 1], [0.12, R * 0.7, 0.12], dim, HULL));
  out.push(part("box", [0, R * 0.95, 0], [0, 1, 0], [R * 0.9, 0.05, R * 0.28], acc, SOLAR, 0.02));
  out.push(part("cone", [R * 0.9, R * 0.55, R * 0.5], [0, 0, 1], [0.18, R * 0.28, 0.18], acc, HULL, 0.08));
  out.push(part("box", [0, 0, R * 0.38], [0, 0, 1], [R * 0.12, R * 0.55, 0.04], dim, RAD, 0.1));
  return out;
}

export function layoutStation(st: Station, lod: number): StationPart[] {
  switch (st.kind ?? "wheel") {
    case "cylinder": return layoutCylinder(st, lod);
    case "sphere": return layoutSphere(st, lod);
    case "truss": return layoutTruss(st, lod);
    case "yard": return layoutYard(st, lod);
    default: return layoutWheel(st, lod);
  }
}
