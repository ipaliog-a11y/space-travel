import type { ShipId } from "./types.ts";

export type MeshName = "sphere" | "cyl" | "box" | "torus" | "thin" | "cone";

const HULL = 11;
const SOLAR = 12;
const RAD = 14;

export type HullPart = {
  mesh: MeshName;
  p: [number, number, number];
  ax: [number, number, number];
  along: "y" | "z";
  s: [number, number, number];
  color: [number, number, number];
  emit: number;
  shade: number;
};
export type HullPaint = (typeof HULL_PAINT)[ShipId];

export const HULL_SCALE = 0.42;

export const HULL_PAINT: Record<
  ShipId,
  {
    skin: [number, number, number];
    dark: [number, number, number];
    glass: [number, number, number];
    accent: [number, number, number];
    glow: [number, number, number];
  }
> = {
  courier: {
    skin: [0.86, 0.89, 0.92],
    dark: [0.42, 0.48, 0.54],
    glass: [0.38, 0.62, 0.74],
    accent: [0.78, 0.58, 0.28],
    glow: [0.55, 0.82, 0.94],
  },
  hauler: {
    skin: [0.28, 0.31, 0.35],
    dark: [0.12, 0.14, 0.16],
    glass: [0.32, 0.46, 0.56],
    accent: [0.86, 0.42, 0.16],
    glow: [0.62, 0.84, 0.96],
  },
  scout: {
    skin: [0.80, 0.84, 0.78],
    dark: [0.40, 0.46, 0.40],
    glass: [0.42, 0.64, 0.58],
    accent: [0.62, 0.72, 0.48],
    glow: [0.58, 0.88, 0.78],
  },
  clipper: {
    skin: [0.84, 0.80, 0.74],
    dark: [0.38, 0.36, 0.32],
    glass: [0.48, 0.62, 0.70],
    accent: [0.90, 0.78, 0.52],
    glow: [0.70, 0.86, 0.94],
  },
  tender: {
    skin: [0.62, 0.66, 0.64],
    dark: [0.32, 0.36, 0.34],
    glass: [0.40, 0.56, 0.58],
    accent: [0.78, 0.82, 0.76],
    glow: [0.55, 0.80, 0.86],
  },
  tug: {
    skin: [0.74, 0.71, 0.64],
    dark: [0.38, 0.36, 0.30],
    glass: [0.44, 0.54, 0.58],
    accent: [0.88, 0.84, 0.72],
    glow: [0.70, 0.82, 0.88],
  },
  extractor: {
    skin: [0.72, 0.68, 0.58],
    dark: [0.36, 0.34, 0.28],
    glass: [0.40, 0.50, 0.52],
    accent: [0.82, 0.76, 0.58],
    glow: [0.62, 0.78, 0.82],
  },
};

function P(
  mesh: MeshName,
  p: [number, number, number],
  ax: [number, number, number],
  s: [number, number, number],
  color: [number, number, number],
  shade = HULL,
  emit = 0,
  along: "y" | "z" = "y",
): HullPart {
  return { mesh, p, ax, along, s, color, emit, shade };
}

const X: [number, number, number] = [1, 0, 0];
const Y: [number, number, number] = [0, 1, 0];
const Z: [number, number, number] = [0, 0, 1];

function courier(lod: number, c: HullPaint): HullPart[] {
  const out: HullPart[] = [
    P("cyl", [0.05, 0, 0], X, [0.105, 3.85, 0.105], c.skin),
    P("cone", [2.08, 0, 0], X, [0.1, 0.62, 0.1], c.skin),
    P("cyl", [2.46, 0, 0], X, [0.022, 0.42, 0.022], c.dark),
    P("cyl", [0.18, 0.01, 0], X, [0.16, 0.82, 0.16], c.skin),
    P("sphere", [0.62, 0.13, 0], Y, [0.55, 0.13, 0.2], c.glass, HULL, 0.28),
    P("cyl", [-2.12, 0, 0.13], X, [0.075, 0.42, 0.075], c.dark),
    P("cyl", [-2.12, 0, -0.13], X, [0.075, 0.42, 0.075], c.dark),
    P("cyl", [-2.36, 0, 0.13], X, [0.055, 0.08, 0.055], c.glow, HULL, 0.7),
    P("cyl", [-2.36, 0, -0.13], X, [0.055, 0.08, 0.055], c.glow, HULL, 0.7),
  ];
  if (lod < 1) return out;
  out.push(
    P("box", [0.22, 0.18, 0], X, [1.15, 0.04, 0.1], c.dark),
    P("box", [-0.35, -0.02, 0.18], X, [1.2, 0.016, 0.055], c.skin),
    P("box", [-0.35, -0.02, -0.18], X, [1.2, 0.016, 0.055], c.skin),
    P("cyl", [-0.7, 0, 0], X, [0.168, 0.012, 0.168], c.dark),
    P("cyl", [0.2, 0, 0], X, [0.168, 0.012, 0.168], c.dark),
    P("cyl", [1.05, 0, 0], X, [0.12, 0.01, 0.12], c.accent, HULL, 0.08),
  );
  if (lod < 2) return out;
  out.push(
    P("cyl", [-1.12, 0.22, 0], Y, [0.03, 0.38, 0.03], c.dark),
    P("cyl", [-1.52, 0.38, 0], X, [0.42, 0.045, 0.42], c.skin, SOLAR, 0.04),
    P("box", [-1.52, 0.4, 0.12], Y, [0.62, 0.018, 0.22], c.skin, SOLAR),
    P("box", [-1.52, 0.4, -0.12], Y, [0.62, 0.018, 0.22], c.skin, SOLAR),
    P("box", [-1.52, 0.52, 0], Y, [0.55, 0.016, 0.2], c.skin, SOLAR),
    P("cyl", [-1.52, 0.62, 0], Y, [0.012, 0.55, 0.012], c.dark),
    P("cyl", [-1.52, 0.9, 0], Y, [0.035, 0.02, 0.035], c.accent, HULL, 0.12),
    P("box", [0.95, 0.02, 0.12], Z, [0.18, 0.04, 0.22], c.dark, RAD),
    P("box", [0.95, 0.02, -0.12], Z, [0.18, 0.04, 0.22], c.dark, RAD),
  );
  return out;
}

function hauler(lod: number, c: HullPaint): HullPart[] {
  const out: HullPart[] = [
    P("box", [0.05, 0.04, 0], Y, [3.45, 0.98, 1.48], c.skin),
    P("box", [0.1, 0.1, 0], Y, [1.9, 0.72, 1.18], c.dark),
    P("box", [1.78, 0.12, 0], Y, [0.82, 0.72, 1.08], c.skin),
    P("sphere", [1.82, 0.4, 0], Y, [0.42, 0.2, 0.36], c.glass, HULL, 0.22),
    P("cyl", [-2.15, 0.02, 0.34], X, [0.28, 0.85, 0.28], c.dark),
    P("cyl", [-2.15, 0.02, -0.34], X, [0.28, 0.85, 0.28], c.dark),
    P("cyl", [-2.62, 0.02, 0.34], X, [0.22, 0.12, 0.22], c.glow, HULL, 0.75),
    P("cyl", [-2.62, 0.02, -0.34], X, [0.22, 0.12, 0.22], c.glow, HULL, 0.75),
  ];
  if (lod < 1) return out;
  out.push(
    P("box", [0.12, 0.06, 0.74], Y, [2.7, 0.16, 0.05], c.accent, HULL, 0.06),
    P("box", [0.12, 0.06, -0.74], Y, [2.7, 0.16, 0.05], c.accent, HULL, 0.06),
    P("cyl", [0.05, -0.62, 0], X, [0.3, 2.05, 0.3], c.dark),
    P("box", [-1.92, 0.02, 0], Y, [0.7, 0.88, 1.22], c.skin),
    P("box", [2.22, -0.04, 0], Y, [0.28, 0.34, 0.82], c.skin),
  );
  if (lod < 2) return out;
  for (let i = 0; i < 7; i++) {
    out.push(P("box", [-0.95 + i * 0.3, 0.52, 0], Y, [0.05, 0.12, 1.42], c.dark));
  }
  out.push(
    P("box", [-1.35, 0.46, 0.38], Y, [0.78, 0.48, 0.05], c.skin),
    P("box", [-1.35, 0.46, 0], Y, [0.78, 0.48, 0.05], c.skin),
    P("box", [-1.35, 0.46, -0.38], Y, [0.78, 0.48, 0.05], c.skin),
    P("cyl", [-1.05, -0.62, 0], X, [0.3, 0.08, 0.3], c.dark),
    P("cyl", [1.1, -0.62, 0], X, [0.3, 0.08, 0.3], c.dark),
  );
  return out;
}

function scout(lod: number, c: HullPaint): HullPart[] {
  const out: HullPart[] = [
    P("cyl", [0.08, 0, 0], X, [0.09, 4.05, 0.09], c.skin),
    P("cone", [2.22, 0, 0], X, [0.085, 0.72, 0.085], c.skin),
    P("cyl", [2.68, 0, 0], X, [0.016, 0.55, 0.016], c.dark),
    P("cyl", [0.12, 0.02, 0], X, [0.14, 0.7, 0.14], c.skin),
    P("sphere", [0.58, 0.12, 0], Y, [0.48, 0.12, 0.18], c.glass, HULL, 0.24),
    P("cyl", [-2.18, 0, 0.11], X, [0.055, 0.34, 0.055], c.dark),
    P("cyl", [-2.18, 0, -0.11], X, [0.055, 0.34, 0.055], c.dark),
    P("cyl", [-2.38, 0, 0.11], X, [0.042, 0.07, 0.042], c.glow, HULL, 0.65),
    P("cyl", [-2.38, 0, -0.11], X, [0.042, 0.07, 0.042], c.glow, HULL, 0.65),
  ];
  if (lod < 1) return out;
  out.push(
    P("box", [-0.4, 0.02, 0.52], X, [1.15, 0.012, 0.4], c.skin, SOLAR),
    P("box", [-0.4, 0.02, -0.52], X, [1.15, 0.012, 0.4], c.skin, SOLAR),
    P("cyl", [0.12, 0.42, 0], Y, [0.025, 0.55, 0.025], c.dark),
    P("cyl", [0.12, 0.78, 0], Y, [0.32, 0.04, 0.32], c.skin, SOLAR, 0.05),
  );
  if (lod < 2) return out;
  out.push(
    P("cyl", [-0.85, 0, 0], X, [0.12, 0.01, 0.12], c.dark),
    P("cyl", [0.25, 0, 0], X, [0.12, 0.01, 0.12], c.dark),
    P("cyl", [1.15, 0, 0], X, [0.1, 0.008, 0.1], c.accent, HULL, 0.06),
    P("cyl", [0.12, 0.95, 0], Y, [0.012, 0.42, 0.012], c.dark),
  );
  return out;
}

function clipper(lod: number, c: HullPaint): HullPart[] {
  const out: HullPart[] = [
    P("cyl", [0.05, 0, 0], X, [0.16, 2.55, 0.16], c.skin),
    P("box", [0.12, 0.02, 0], Y, [1.85, 0.28, 0.72], c.skin),
    P("cone", [1.48, 0.04, 0], X, [0.16, 0.7, 0.16], c.skin),
    P("sphere", [0.52, 0.18, 0], Y, [0.42, 0.14, 0.24], c.glass, HULL, 0.26),
    P("box", [-0.15, 0, 0.52], X, [1.75, 0.07, 0.42], c.skin),
    P("box", [-0.15, 0, -0.52], X, [1.75, 0.07, 0.42], c.skin),
    P("cyl", [-1.55, 0, 0.32], X, [0.09, 0.48, 0.09], c.dark),
    P("cyl", [-1.55, 0, -0.32], X, [0.09, 0.48, 0.09], c.dark),
    P("cyl", [-1.82, 0, 0.32], X, [0.07, 0.08, 0.07], c.glow, HULL, 0.68),
    P("cyl", [-1.82, 0, -0.32], X, [0.07, 0.08, 0.07], c.glow, HULL, 0.68),
  ];
  if (lod < 1) return out;
  out.push(
    P("box", [0.32, -0.14, 0], Y, [0.62, 0.14, 0.26], c.dark),
    P("box", [-0.85, 0, 0.78], X, [0.85, 0.04, 0.28], c.skin),
    P("box", [-0.85, 0, -0.78], X, [0.85, 0.04, 0.28], c.skin),
  );
  if (lod < 2) return out;
  out.push(
    P("cyl", [0.35, 0, 0], X, [0.2, 0.012, 0.2], c.accent, HULL, 0.08),
    P("box", [0.85, 0.08, 0], Y, [0.35, 0.05, 0.18], c.dark),
  );
  return out;
}

function tender(lod: number, c: HullPaint): HullPart[] {
  const out: HullPart[] = [
    P("cyl", [0.05, 0, 0], X, [0.15, 3.55, 0.15], c.skin),
    P("sphere", [-0.55, -0.02, 0], Y, [0.54, 0.54, 0.54], c.dark),
    P("sphere", [0.72, -0.02, 0], Y, [0.54, 0.54, 0.54], c.dark),
    P("box", [0.1, 0.2, 0], Y, [1.15, 0.42, 0.7], c.skin),
    P("cyl", [1.78, 0.08, 0], X, [0.2, 0.7, 0.2], c.skin),
    P("cyl", [-2.15, 0, 0.26], X, [0.16, 0.52, 0.16], c.dark),
    P("cyl", [-2.15, 0, -0.26], X, [0.16, 0.52, 0.16], c.dark),
    P("cyl", [-2.44, 0, 0.26], X, [0.12, 0.08, 0.12], c.glow, HULL, 0.7),
    P("cyl", [-2.44, 0, -0.26], X, [0.12, 0.08, 0.12], c.glow, HULL, 0.7),
  ];
  if (lod < 1) return out;
  out.push(
    P("torus", [2.16, 0.08, 0], X, [0.2, 0.2, 0.2], c.accent, HULL, 0.05, "z"),
    P("box", [-1.88, 0, 0], Y, [0.55, 0.62, 0.78], c.dark),
    P("box", [-0.12, 0.48, 0.1], X, [1.28, 0.38, 0.02], c.skin, SOLAR),
    P("box", [-0.12, 0.48, -0.1], X, [1.28, 0.38, 0.02], c.skin, SOLAR),
  );
  if (lod < 2) return out;
  out.push(
    P("cyl", [2.12, 0.08, 0], X, [0.22, 0.08, 0.22], c.skin),
    P("cyl", [-0.55, -0.02, 0], Y, [0.56, 0.04, 0.56], c.accent, HULL, 0.04),
    P("cyl", [0.72, -0.02, 0], Y, [0.56, 0.04, 0.56], c.accent, HULL, 0.04),
  );
  return out;
}

function tug(lod: number, c: HullPaint): HullPart[] {
  const out: HullPart[] = [
    P("box", [0.02, 0.04, 0], Y, [1.95, 0.64, 0.95], c.skin),
    P("box", [0.1, 0.1, 0], Y, [1.18, 0.44, 0.72], c.dark),
    P("cyl", [1.18, 0.12, 0], X, [0.2, 0.42, 0.2], c.skin),
    P("sphere", [0.28, 0.3, 0], Y, [0.32, 0.14, 0.26], c.glass, HULL, 0.22),
    P("cyl", [-1.18, 0, 0.26], X, [0.13, 0.48, 0.13], c.dark),
    P("cyl", [-1.18, 0, -0.26], X, [0.13, 0.48, 0.13], c.dark),
    P("cyl", [-1.44, 0, 0.26], X, [0.1, 0.08, 0.1], c.glow, HULL, 0.65),
    P("cyl", [-1.44, 0, -0.26], X, [0.1, 0.08, 0.1], c.glow, HULL, 0.65),
  ];
  if (lod < 1) return out;
  out.push(
    P("torus", [1.42, 0.12, 0], X, [0.2, 0.2, 0.2], c.accent, HULL, 0.05, "z"),
    P("box", [0.18, -0.08, 0.62], X, [1.15, 0.1, 0.16], c.skin),
    P("box", [0.18, -0.08, -0.62], X, [1.15, 0.1, 0.16], c.skin),
    P("box", [0.75, -0.1, 0.78], Y, [0.22, 0.18, 0.22], c.dark),
    P("box", [0.75, -0.1, -0.78], Y, [0.22, 0.18, 0.22], c.dark),
  );
  if (lod < 2) return out;
  out.push(
    P("box", [-0.52, 0.3, 0.4], Y, [0.18, 0.18, 0.18], c.accent),
    P("box", [-0.52, 0.3, -0.4], Y, [0.18, 0.18, 0.18], c.accent),
  );
  return out;
}

function extractor(lod: number, c: HullPaint): HullPart[] {
  const out: HullPart[] = [
    P("box", [0.02, 0.06, 0], Y, [2.42, 0.74, 1.08], c.skin),
    P("box", [0.14, 0.12, 0], Y, [1.48, 0.5, 0.8], c.dark),
    P("cyl", [1.48, 0.08, 0], X, [0.14, 0.9, 0.14], c.skin),
    P("cone", [2.05, 0.04, 0], X, [0.34, 0.48, 0.34], c.accent),
    P("sphere", [0.32, 0.36, 0], Y, [0.36, 0.16, 0.28], c.glass, HULL, 0.2),
    P("cyl", [0.18, -0.06, 0.62], X, [0.28, 1.18, 0.28], c.dark),
    P("cyl", [0.18, -0.06, -0.62], X, [0.28, 1.18, 0.28], c.dark),
    P("cyl", [-1.78, 0, 0.26], X, [0.15, 0.52, 0.15], c.dark),
    P("cyl", [-1.78, 0, -0.26], X, [0.15, 0.52, 0.15], c.dark),
    P("cyl", [-2.08, 0, 0.26], X, [0.12, 0.08, 0.12], c.glow, HULL, 0.68),
    P("cyl", [-2.08, 0, -0.26], X, [0.12, 0.08, 0.12], c.glow, HULL, 0.68),
  ];
  if (lod < 1) return out;
  out.push(
    P("torus", [2.22, 0.04, 0], X, [0.28, 0.28, 0.28], c.accent, HULL, 0.06, "z"),
    P("box", [-1.38, 0.02, 0], Y, [0.66, 0.72, 0.9], c.dark),
    P("box", [-0.55, 0.42, 0], Y, [0.42, 0.12, 0.72], c.dark),
    P("box", [0.35, 0.42, 0], Y, [0.42, 0.12, 0.72], c.dark),
  );
  if (lod < 2) return out;
  out.push(
    P("cyl", [1.92, 0.04, 0], X, [0.18, 0.16, 0.18], c.skin),
    P("box", [0.85, 0.22, 0], Y, [0.55, 0.08, 0.4], c.skin),
  );
  return out;
}

const BUILDERS: Record<ShipId, (lod: number, c: HullPaint) => HullPart[]> = {
  courier,
  hauler,
  scout,
  clipper,
  tender,
  tug,
  extractor,
};

/** lod 0 silhouette, 1 traffic close, 2 hangar. Local +X is nose, +Y up. */
export function layoutHull(id: ShipId, lod = 2): HullPart[] {
  const paint = HULL_PAINT[id] ?? HULL_PAINT.courier;
  const build = BUILDERS[id] ?? courier;
  return build(lod, paint);
}

export const TRAFFIC_HULLS: ShipId[] = ["courier", "hauler", "scout", "clipper", "tender", "tug", "extractor"];
