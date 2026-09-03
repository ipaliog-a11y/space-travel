import {
  BufferGeometry,
  CatmullRomCurve3,
  CylinderGeometry,
  ExtrudeGeometry,
  LatheGeometry,
  Shape,
  SphereGeometry,
  SplineCurve,
  TorusGeometry,
  TubeGeometry,
  Vector2,
  Vector3,
} from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { HULL_PAINT, type HullPaint } from "./hull-kit.ts";
import type { ShipId } from "./types.ts";

export type SolidKind = "skin" | "dark" | "glass" | "accent" | "glow" | "solar";

export type ProcSolid = {
  geometry: BufferGeometry;
  kind: SolidKind;
};

function densify(pairs: [number, number][], samples = 36, grooves: number[] = []): Vector2[] {
  const curve = new SplineCurve(pairs.map(([r, y]) => new Vector2(Math.max(0.006, r), y)));
  const pts = curve.getPoints(samples);
  if (!grooves.length) return pts;
  for (const p of pts) {
    let k = 1;
    for (const g of grooves) {
      const d = p.y - g;
      k *= 1 - 0.1 * Math.exp(-(d * d) / 0.0022);
    }
    p.x = Math.max(0.006, p.x * k);
  }
  return pts;
}

/** Lathe around Y, then spin so +Y becomes +X (nose). */
function latheX(pairs: [number, number][], segments: number, grooves?: number[], samples = 40): BufferGeometry {
  const geo = new LatheGeometry(densify(pairs, samples, grooves), segments);
  geo.rotateZ(-Math.PI / 2);
  geo.computeVertexNormals();
  return geo;
}

function tube(pts: [number, number, number][], radius: number, tubular = 18, radial = 8): BufferGeometry {
  const path = new CatmullRomCurve3(pts.map((p) => new Vector3(...p)));
  const geo = new TubeGeometry(path, tubular, radius, radial, false);
  geo.computeVertexNormals();
  return geo;
}

function roundedRect(w: number, h: number, r: number): Shape {
  const hw = w * 0.5;
  const hh = h * 0.5;
  const rr = Math.min(r, hw, hh);
  const s = new Shape();
  s.moveTo(-hw + rr, -hh);
  s.lineTo(hw - rr, -hh);
  s.quadraticCurveTo(hw, -hh, hw, -hh + rr);
  s.lineTo(hw, hh - rr);
  s.quadraticCurveTo(hw, hh, hw - rr, hh);
  s.lineTo(-hw + rr, hh);
  s.quadraticCurveTo(-hw, hh, -hw, hh - rr);
  s.lineTo(-hw, -hh + rr);
  s.quadraticCurveTo(-hw, -hh, -hw + rr, -hh);
  return s;
}

function extrudeAlongX(shape: Shape, length: number, bevel = 0.04): BufferGeometry {
  const geo = new ExtrudeGeometry(shape, {
    depth: length,
    bevelEnabled: bevel > 0,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 2,
    curveSegments: 10,
  });
  geo.translate(0, 0, -length * 0.5);
  geo.rotateY(-Math.PI / 2);
  geo.computeVertexNormals();
  return geo;
}

function xf(geo: BufferGeometry, px: number, py: number, pz: number, rx = 0, ry = 0, rz = 0): BufferGeometry {
  if (rx) geo.rotateX(rx);
  if (ry) geo.rotateY(ry);
  if (rz) geo.rotateZ(rz);
  geo.translate(px, py, pz);
  return geo;
}

function nozzle(r0: number, r1: number, len: number, segs = 20): BufferGeometry {
  return latheX(
    [
      [r1 * 0.55, -len * 0.5],
      [r1, -len * 0.22],
      [r0, len * 0.15],
      [r0 * 0.72, len * 0.5],
    ],
    segs,
    [],
    12,
  );
}

function canopy(rx: number, ry: number, rz: number): BufferGeometry {
  const geo = new SphereGeometry(1, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.58);
  geo.scale(rx, ry, rz);
  geo.computeVertexNormals();
  return geo;
}

function dish(radius: number): BufferGeometry {
  return latheX(
    [
      [0.01, -0.01],
      [radius * 0.55, 0.01],
      [radius, 0.03],
      [radius * 0.96, 0.05],
      [radius * 0.2, 0.04],
    ],
    28,
    [],
    16,
  );
}

function merge(kind: SolidKind, geos: BufferGeometry[]): ProcSolid[] {
  const live = geos.filter((g) => g.getAttribute("position")?.count);
  if (!live.length) return [];
  const uniform = live.map((g) => {
    if (!g.index) return g;
    const n = g.toNonIndexed();
    g.dispose();
    return n;
  });
  if (uniform.length === 1) return [{ geometry: uniform[0], kind }];
  const merged = mergeGeometries(uniform, false);
  if (!merged) return uniform.map((geometry) => ({ geometry, kind }));
  for (const g of uniform) g.dispose();
  merged.computeVertexNormals();
  return [{ geometry: merged, kind }];
}

function courier(c: HullPaint): ProcSolid[] {
  const body = latheX(
    [
      [0.07, -2.35],
      [0.11, -2.05],
      [0.1, -1.45],
      [0.12, -0.7],
      [0.165, 0.05],
      [0.15, 0.7],
      [0.11, 1.35],
      [0.08, 1.85],
      [0.045, 2.15],
      [0.018, 2.42],
      [0.01, 2.58],
    ],
    48,
    [-1.55, -0.55, 0.35, 1.15],
  );
  const glass = xf(canopy(0.52, 0.14, 0.2), 0.62, 0.1, 0);
  const boom = tube(
    [
      [-0.85, 0.12, 0],
      [-1.15, 0.28, 0],
      [-1.48, 0.4, 0],
    ],
    0.028,
    10,
    7,
  );
  const disc = xf(dish(0.42), -1.52, 0.4, 0, 0, 0, Math.PI / 2);
  const mast = xf(new CylinderGeometry(0.012, 0.012, 0.55, 8), -1.52, 0.72, 0);
  const panels: BufferGeometry[] = [-0.14, 0, 0.14].map((z) =>
    xf(extrudeAlongX(roundedRect(0.62, 0.2, 0.02), 0.02, 0), -1.52, 0.42, z),
  );
  const solar = [
    xf(extrudeAlongX(roundedRect(1.15, 0.055, 0.01), 0.012, 0), -0.35, -0.02, 0.2, 0.42),
    xf(extrudeAlongX(roundedRect(1.15, 0.055, 0.01), 0.012, 0), -0.35, -0.02, -0.2, -0.42),
  ];
  const n1 = xf(nozzle(0.055, 0.085, 0.42), -2.18, 0, 0.13);
  const n2 = xf(nozzle(0.055, 0.085, 0.42), -2.18, 0, -0.13);
  const g1 = xf(new CylinderGeometry(0.05, 0.05, 0.04, 14), -2.4, 0, 0.13, 0, 0, Math.PI / 2);
  const g2 = xf(new CylinderGeometry(0.05, 0.05, 0.04, 14), -2.4, 0, -0.13, 0, 0, Math.PI / 2);
  const ring = xf(new TorusGeometry(0.12, 0.008, 8, 24), 1.05, 0, 0, 0, Math.PI / 2, 0);
  return [
    ...merge("skin", [body, disc, ...panels]),
    ...merge("dark", [boom, mast, n1, n2]),
    ...merge("solar", solar),
    { geometry: glass, kind: "glass" },
    { geometry: ring, kind: "accent" },
    ...merge("glow", [g1, g2]),
  ];
}

function scout(c: HullPaint): ProcSolid[] {
  const body = latheX(
    [
      [0.055, -2.4],
      [0.09, -2.1],
      [0.085, -1.3],
      [0.11, -0.2],
      [0.14, 0.2],
      [0.11, 1.0],
      [0.075, 1.7],
      [0.04, 2.2],
      [0.014, 2.65],
      [0.008, 2.85],
    ],
    44,
    [-0.85, 0.25, 1.15],
  );
  const glass = xf(canopy(0.46, 0.12, 0.17), 0.55, 0.1, 0);
  const mast = xf(new CylinderGeometry(0.022, 0.022, 0.7, 8), 0.12, 0.48, 0);
  const disc = xf(dish(0.32), 0.12, 0.78, 0);
  const antenna = xf(new CylinderGeometry(0.01, 0.01, 0.45, 6), 0.12, 1.05, 0);
  const wings = [
    xf(extrudeAlongX(roundedRect(1.1, 0.4, 0.04), 0.012, 0), -0.4, 0.02, 0.52),
    xf(extrudeAlongX(roundedRect(1.1, 0.4, 0.04), 0.012, 0), -0.4, 0.02, -0.52),
  ];
  const n1 = xf(nozzle(0.04, 0.065, 0.34), -2.22, 0, 0.11);
  const n2 = xf(nozzle(0.04, 0.065, 0.34), -2.22, 0, -0.11);
  const g1 = xf(new CylinderGeometry(0.038, 0.038, 0.03, 12), -2.4, 0, 0.11, 0, 0, Math.PI / 2);
  const g2 = xf(new CylinderGeometry(0.038, 0.038, 0.03, 12), -2.4, 0, -0.11, 0, 0, Math.PI / 2);
  return [
    ...merge("skin", [body]),
    ...merge("solar", [...wings, disc]),
    ...merge("dark", [mast, antenna, n1, n2]),
    { geometry: glass, kind: "glass" },
    ...merge("glow", [g1, g2]),
  ];
}

function clipper(c: HullPaint): ProcSolid[] {
  const body = latheX(
    [
      [0.12, -1.55],
      [0.2, -1.1],
      [0.22, -0.3],
      [0.18, 0.4],
      [0.12, 1.0],
      [0.05, 1.45],
      [0.012, 1.72],
    ],
    8,
    [0.35],
    18,
  );
  const glass = xf(canopy(0.4, 0.13, 0.22), 0.5, 0.14, 0);
  const wingShape = new Shape();
  wingShape.moveTo(-0.9, 0);
  wingShape.lineTo(0.7, 0.08);
  wingShape.lineTo(0.85, 0.02);
  wingShape.lineTo(-0.55, 0.42);
  wingShape.closePath();
  const wing = (z: number) => {
    const g = new ExtrudeGeometry(wingShape, { depth: 0.045, bevelEnabled: false, curveSegments: 1 });
    g.translate(0, 0, -0.0225);
    if (z < 0) g.scale(1, 1, -1);
    g.translate(0, 0, z);
    g.computeVertexNormals();
    return g;
  };
  const w1 = wing(0.3);
  const w2 = wing(-0.3);
  const n1 = xf(nozzle(0.07, 0.11, 0.45), -1.55, 0, 0.32);
  const n2 = xf(nozzle(0.07, 0.11, 0.45), -1.55, 0, -0.32);
  const g1 = xf(new CylinderGeometry(0.065, 0.065, 0.04, 10), -1.78, 0, 0.32, 0, 0, Math.PI / 2);
  const g2 = xf(new CylinderGeometry(0.065, 0.065, 0.04, 10), -1.78, 0, -0.32, 0, 0, Math.PI / 2);
  const chin = xf(extrudeAlongX(roundedRect(0.6, 0.14, 0.03), 0.24, 0.02), 0.28, -0.14, 0);
  return [
    ...merge("skin", [body, w1, w2]),
    { geometry: chin, kind: "dark" },
    ...merge("dark", [n1, n2]),
    { geometry: glass, kind: "glass" },
    ...merge("glow", [g1, g2]),
  ];
}

function hauler(c: HullPaint): ProcSolid[] {
  const hull = extrudeAlongX(roundedRect(0.95, 1.42, 0.1), 3.35, 0.05);
  const well = xf(extrudeAlongX(roundedRect(0.7, 1.12, 0.06), 1.85, 0.02), 0.08, 0.08, 0);
  const cab = xf(extrudeAlongX(roundedRect(0.68, 1.02, 0.08), 0.78, 0.03), 1.72, 0.1, 0);
  const glass = xf(canopy(0.4, 0.18, 0.34), 1.78, 0.36, 0);
  const stripe1 = xf(extrudeAlongX(roundedRect(0.16, 0.04, 0.01), 2.6, 0), 0.12, 0.04, 0.72);
  const stripe2 = xf(extrudeAlongX(roundedRect(0.16, 0.04, 0.01), 2.6, 0), 0.12, 0.04, -0.72);
  const tank = latheX(
    [
      [0.02, -1.0],
      [0.28, -0.85],
      [0.3, 0],
      [0.28, 0.85],
      [0.02, 1.0],
    ],
    22,
    [],
    14,
  );
  xf(tank, 0.05, -0.62, 0);
  const ribs: BufferGeometry[] = [];
  for (let i = 0; i < 7; i++) {
    ribs.push(xf(extrudeAlongX(roundedRect(0.1, 1.38, 0.01), 0.045, 0), -0.9 + i * 0.28, 0.5, 0));
  }
  const n1 = xf(nozzle(0.2, 0.3, 0.78), -2.2, 0.02, 0.34);
  const n2 = xf(nozzle(0.2, 0.3, 0.78), -2.2, 0.02, -0.34);
  const g1 = xf(new CylinderGeometry(0.18, 0.18, 0.08, 16), -2.6, 0.02, 0.34, 0, 0, Math.PI / 2);
  const g2 = xf(new CylinderGeometry(0.18, 0.18, 0.08, 16), -2.6, 0.02, -0.34, 0, 0, Math.PI / 2);
  const stern = xf(extrudeAlongX(roundedRect(0.82, 1.18, 0.06), 0.62, 0.03), -1.88, 0, 0);
  return [
    ...merge("skin", [hull, cab, stern]),
    ...merge("dark", [well, tank, n1, n2, ...ribs]),
    ...merge("accent", [stripe1, stripe2]),
    { geometry: glass, kind: "glass" },
    ...merge("glow", [g1, g2]),
  ];
}

function tender(c: HullPaint): ProcSolid[] {
  const spine = latheX(
    [
      [0.12, -1.85],
      [0.16, -1.2],
      [0.15, 0],
      [0.16, 1.2],
      [0.18, 1.7],
      [0.14, 2.0],
    ],
    28,
    [],
    20,
  );
  const tank = (x: number) =>
    latheX(
      [
        [0.05, -0.52],
        [0.48, -0.35],
        [0.54, 0],
        [0.48, 0.35],
        [0.05, 0.52],
      ],
      28,
      [],
      16,
    ).translate(x, -0.02, 0);
  const t1 = tank(-0.55);
  const t2 = tank(0.72);
  const deck = xf(extrudeAlongX(roundedRect(0.42, 0.68, 0.05), 1.12, 0.03), 0.1, 0.2, 0);
  const boom = latheX(
    [
      [0.16, -0.35],
      [0.22, -0.1],
      [0.2, 0.2],
      [0.18, 0.38],
    ],
    18,
    [],
    10,
  );
  xf(boom, 1.85, 0.08, 0);
  const ring = xf(new TorusGeometry(0.2, 0.028, 8, 20), 2.16, 0.08, 0, 0, Math.PI / 2, 0);
  const n1 = xf(nozzle(0.14, 0.22, 0.52), -2.15, 0, 0.26);
  const n2 = xf(nozzle(0.14, 0.22, 0.52), -2.15, 0, -0.26);
  const g1 = xf(new CylinderGeometry(0.12, 0.12, 0.05, 14), -2.42, 0, 0.26, 0, 0, Math.PI / 2);
  const g2 = xf(new CylinderGeometry(0.12, 0.12, 0.05, 14), -2.42, 0, -0.26, 0, 0, Math.PI / 2);
  const solar = [
    xf(extrudeAlongX(roundedRect(1.28, 0.38, 0.02), 0.018, 0), -0.12, 0.48, 0.1),
    xf(extrudeAlongX(roundedRect(1.28, 0.38, 0.02), 0.018, 0), -0.12, 0.48, -0.1),
  ];
  return [
    ...merge("skin", [spine, deck, boom]),
    ...merge("dark", [t1, t2, n1, n2]),
    ...merge("solar", solar),
    { geometry: ring, kind: "accent" },
    ...merge("glow", [g1, g2]),
  ];
}

function tug(c: HullPaint): ProcSolid[] {
  const hull = extrudeAlongX(roundedRect(0.62, 0.92, 0.08), 1.9, 0.045);
  const cap = xf(extrudeAlongX(roundedRect(0.42, 0.7, 0.06), 1.12, 0.03), 0.08, 0.08, 0);
  const glass = xf(canopy(0.3, 0.13, 0.24), 0.28, 0.28, 0);
  const collar = latheX(
    [
      [0.16, -0.22],
      [0.22, -0.08],
      [0.2, 0.12],
      [0.18, 0.22],
    ],
    16,
    [],
    10,
  );
  xf(collar, 1.2, 0.12, 0);
  const ring = xf(new TorusGeometry(0.2, 0.028, 8, 18), 1.42, 0.12, 0, 0, Math.PI / 2, 0);
  const strut = (z: number) => tube(
    [
      [0.4, -0.02, z * 0.2],
      [0.2, -0.08, z * 0.55],
      [0.7, -0.1, z * 0.78],
    ],
    0.045,
    8,
    6,
  );
  const n1 = xf(nozzle(0.1, 0.16, 0.46), -1.18, 0, 0.26);
  const n2 = xf(nozzle(0.1, 0.16, 0.46), -1.18, 0, -0.26);
  const g1 = xf(new CylinderGeometry(0.09, 0.09, 0.04, 12), -1.42, 0, 0.26, 0, 0, Math.PI / 2);
  const g2 = xf(new CylinderGeometry(0.09, 0.09, 0.04, 12), -1.42, 0, -0.26, 0, 0, Math.PI / 2);
  const box1 = xf(extrudeAlongX(roundedRect(0.16, 0.16, 0.02), 0.16, 0.01), -0.52, 0.3, 0.4);
  const box2 = xf(extrudeAlongX(roundedRect(0.16, 0.16, 0.02), 0.16, 0.01), -0.52, 0.3, -0.4);
  return [
    ...merge("skin", [hull, collar]),
    ...merge("dark", [cap, strut(1), strut(-1), n1, n2]),
    ...merge("accent", [ring, box1, box2]),
    { geometry: glass, kind: "glass" },
    ...merge("glow", [g1, g2]),
  ];
}

function extractor(c: HullPaint): ProcSolid[] {
  const hull = extrudeAlongX(roundedRect(0.72, 1.05, 0.08), 2.35, 0.04);
  const well = xf(extrudeAlongX(roundedRect(0.48, 0.78, 0.05), 1.42, 0.02), 0.12, 0.1, 0);
  const scoop = latheX(
    [
      [0.1, -0.45],
      [0.14, -0.1],
      [0.22, 0.15],
      [0.34, 0.32],
      [0.3, 0.42],
    ],
    18,
    [],
    12,
  );
  xf(scoop, 1.95, 0.04, 0);
  const boom = latheX(
    [
      [0.12, -0.42],
      [0.16, 0],
      [0.12, 0.42],
    ],
    12,
    [],
    8,
  );
  xf(boom, 1.45, 0.08, 0);
  const ring = xf(new TorusGeometry(0.3, 0.028, 8, 18), 2.18, 0.04, 0, 0, Math.PI / 2, 0);
  const bin = (z: number) =>
    latheX(
      [
        [0.22, -0.55],
        [0.28, -0.4],
        [0.28, 0.4],
        [0.22, 0.55],
      ],
      16,
      [],
      10,
    ).translate(0.15, -0.08, z);
  const glass = xf(canopy(0.36, 0.15, 0.28), 0.3, 0.32, 0);
  const n1 = xf(nozzle(0.13, 0.2, 0.5), -1.75, 0, 0.26);
  const n2 = xf(nozzle(0.13, 0.2, 0.5), -1.75, 0, -0.26);
  const g1 = xf(new CylinderGeometry(0.11, 0.11, 0.05, 12), -2.02, 0, 0.26, 0, 0, Math.PI / 2);
  const g2 = xf(new CylinderGeometry(0.11, 0.11, 0.05, 12), -2.02, 0, -0.26, 0, 0, Math.PI / 2);
  const lids = [
    xf(extrudeAlongX(roundedRect(0.12, 0.68, 0.02), 0.4, 0.01), -0.55, 0.4, 0),
    xf(extrudeAlongX(roundedRect(0.12, 0.68, 0.02), 0.4, 0.01), 0.35, 0.4, 0),
  ];
  return [
    ...merge("skin", [hull, boom, scoop]),
    ...merge("dark", [well, bin(0.62), bin(-0.62), n1, n2, ...lids]),
    { geometry: ring, kind: "accent" },
    { geometry: glass, kind: "glass" },
    ...merge("glow", [g1, g2]),
  ];
}

const BUILDERS: Record<ShipId, (c: HullPaint) => ProcSolid[]> = {
  courier,
  hauler,
  scout,
  clipper,
  tender,
  tug,
  extractor,
};

export function buildProcHull(id: ShipId): ProcSolid[] {
  const paint = HULL_PAINT[id] ?? HULL_PAINT.courier;
  const build = BUILDERS[id] ?? courier;
  return build(paint);
}

export function disposeProcHull(solids: ProcSolid[]) {
  for (const s of solids) s.geometry.dispose();
}

export function procVertexCount(solids: ProcSolid[]) {
  return solids.reduce((n, s) => n + (s.geometry.getAttribute("position")?.count ?? 0), 0);
}
