import { hashu, mulberry32 } from "./math";
import { keplerPosition, periodDays, planetMu, starMu } from "./orbit";
import type { Belt, Comet, Moon, MoonKind, Nebula, NebulaKind, Planet, PlanetKind, StarSystem, Station, WildProspect } from "./types";
import { pickStationKind, stationLook, stationSuffix } from "./station-mesh";

const SYLLABLES = [
  "hel", "ion", "vega", "nyx", "or", "ion", "ash", "rhea", "tau", "ix",
  "mir", "cal", "keph", "ara", "sol", "lyra", "dra", "keth", "uma", "sil",
  "vora", "neme", "prax", "el", "thar", "quin", "osa", "bel", "ceti", "alis",
];

const STAR_PALETTE: [number, number, number][] = [
  [1.0, 0.95, 0.82],
  [1.0, 0.78, 0.52],
  [1.0, 0.55, 0.38],
  [0.72, 0.84, 1.0],
  [0.85, 0.9, 1.0],
  [0.55, 0.7, 1.0],
];

const ROMAN = ["I", "II", "III", "IV", "V", "VI"];

export const KIND_LABEL: Record<PlanetKind, string> = {
  rocky: "Rocky world",
  desert: "Desert world",
  ocean: "Ocean world",
  ice: "Ice world",
  volcanic: "Volcanic world",
  gas: "Gas giant",
  ringed: "Ringed giant",
  icegiant: "Ice giant",
};

export const NEBULA_LABEL: Record<NebulaKind, string> = {
  arm: "Spiral arm",
  core: "Inner disk",
  rift: "Dust rift",
  hii: "H II region",
  reflect: "Reflection cloud",
  snr: "Supernova remnant",
  wr: "Wolf–Rayet shell",
  cirrus: "Halo cirrus",
};

export const NEBULA_CODE: Record<NebulaKind, number> = {
  arm: 0,
  core: 1,
  rift: 2,
  hii: 3,
  reflect: 4,
  snr: 5,
  wr: 6,
  cirrus: 7,
};

const KIND_INNER: PlanetKind[] = ["volcanic", "desert", "rocky"];
const KIND_MID: PlanetKind[] = ["rocky", "ocean", "desert", "ocean"];
const KIND_OUTER: PlanetKind[] = ["ice", "gas", "ringed", "icegiant", "ice", "gas", "icegiant"];

const KIND_LOOK: Record<PlanetKind, {
  color: [number, number, number];
  r0: number;
  r1: number;
  km0: number;
  km1: number;
  climate: string;
  composition: string;
  atmosphere: string;
  massK: number;
}> = {
  rocky: {
    color: [0.50, 0.46, 0.42],
    r0: 22, r1: 34,
    km0: 5100, km1: 7400,
    climate: "Thin wind over highland and crater plains.",
    composition: "Silicate crust, iron-nickel core.",
    atmosphere: "Trace CO2 / Ar",
    massK: 1.0,
  },
  desert: {
    color: [0.74, 0.48, 0.26],
    r0: 20, r1: 32,
    km0: 4700, km1: 6900,
    climate: "Arid. Dust storms. No standing water.",
    composition: "Oxides, dune crust, basalt.",
    atmosphere: "Thin N2 / CO2",
    massK: 0.85,
  },
  ocean: {
    color: [0.16, 0.40, 0.58],
    r0: 24, r1: 36,
    km0: 5800, km1: 8400,
    climate: "Global sea. Wet, temperate belts.",
    composition: "Basalt, water ice, salts.",
    atmosphere: "N2 with O2 traces",
    massK: 1.1,
  },
  ice: {
    color: [0.74, 0.84, 0.90],
    r0: 18, r1: 30,
    km0: 3100, km1: 6200,
    climate: "Cryogenic. Nitrogen frost. No liquid.",
    composition: "Water ice over rock.",
    atmosphere: "Tenuous N2",
    massK: 0.7,
  },
  volcanic: {
    color: [0.46, 0.18, 0.12],
    r0: 18, r1: 28,
    km0: 4400, km1: 6400,
    climate: "Ash skies. Lava plains. Unstable crust.",
    composition: "Basalt, sulfur, metals.",
    atmosphere: "SO2 haze",
    massK: 0.95,
  },
  gas: {
    color: [0.80, 0.62, 0.40],
    r0: 88, r1: 140,
    km0: 42000, km1: 79000,
    climate: "No surface. Belt storms, deep convection.",
    composition: "Hydrogen-helium envelope.",
    atmosphere: "H2 / He",
    massK: 140,
  },
  ringed: {
    color: [0.70, 0.64, 0.50],
    r0: 80, r1: 128,
    km0: 38000, km1: 72000,
    climate: "Belt storms. Ring dusk on the limb.",
    composition: "H/He body, ice-rock rings.",
    atmosphere: "H2 / He",
    massK: 95,
  },
  icegiant: {
    color: [0.42, 0.62, 0.78],
    r0: 48, r1: 76,
    km0: 16000, km1: 28000,
    climate: "Cold hydrogen. Methane haze. Faint rings.",
    composition: "Ices, rock core, H/He envelope.",
    atmosphere: "H2 / He / CH4",
    massK: 17,
  },
};

export const AU_UNITS = 2800;

export function planetPark(p: Planet) {
  return p.radius * 1.52;
}

export function formatPeriod(days: number, style: "short" | "long" = "short"): string {
  const d = Math.max(1, Math.round(days));
  const y = d / 365;
  if (style === "long") {
    if (y < 0.95) return `${d} d`;
    return `${formatYears(y)} y · ${d.toLocaleString()} d`;
  }
  if (y < 0.95) return `${d} d`;
  return `${formatYears(y)} y`;
}

function formatYears(y: number): string {
  if (y < 10) return trimNum(y.toFixed(2));
  if (y < 100) return trimNum(y.toFixed(1));
  return String(Math.round(y));
}

function trimNum(s: string) {
  return s.replace(/(\.\d*?)0+$/, "$1").replace(/\.$/, "");
}

export function clampEcc(e: number) {
  return Math.min(0.92, Math.max(0, e));
}

export function formatEcc(e: number): string {
  const v = clampEcc(e);
  return `e ${v < 0.1 ? v.toFixed(3) : v.toFixed(2)}`;
}

export function formatPeriodLine(
  p: Pick<Planet, "yearDays" | "ecc">,
  style: "short" | "long" = "short",
): string {
  return `${formatPeriod(p.yearDays, style)} · ${formatEcc(p.ecc)}`;
}

export function periapsisAu(p: Pick<Planet, "au" | "ecc">): number {
  return +(p.au * (1 - clampEcc(p.ecc))).toFixed(2);
}

export function apoapsisAu(p: Pick<Planet, "au" | "ecc">): number {
  return +(p.au * (1 + clampEcc(p.ecc))).toFixed(2);
}

function nameFrom(rng: () => number, n = 2) {
  let s = "";
  for (let i = 0; i < n; i++) s += SYLLABLES[Math.floor(rng() * SYLLABLES.length)];
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function pickKind(i: number, n: number, rng: () => number): PlanetKind {
  const t = n <= 1 ? 0.5 : i / (n - 1);
  const bag = t < 0.28 ? KIND_INNER : t < 0.62 ? KIND_MID : KIND_OUTER;
  return bag[Math.floor(rng() * bag.length)];
}

function makePlanets(rng: () => number, systemName: string, starR: number): Planet[] {
  const n = 3 + Math.floor(rng() * 3);
  const planets: Planet[] = [];
  let orbit = starR * 5.2 + 2200;
  for (let i = 0; i < n; i++) {
    orbit += 2400 + rng() * 2000 + starR * 2.4;
    const kind = pickKind(i, n, rng);
    const def = KIND_LOOK[kind];
    const radius = def.r0 + rng() * (def.r1 - def.r0);
    const rings = kind === "ringed" || (kind === "gas" && rng() > 0.62);
    const au = +(orbit / AU_UNITS).toFixed(2);
    const radiusKm = Math.round(def.km0 + rng() * (def.km1 - def.km0));
    const massEarth = +(def.massK * (radiusKm / ((def.km0 + def.km1) * 0.5)) ** 3 * (0.85 + rng() * 0.3)).toFixed(2);
    const rEarth = radiusKm / 6371;
    const gravityG = +Math.max(0.08, massEarth / Math.max(0.2, rEarth * rEarth)).toFixed(2);
    const tint = 0.88 + rng() * 0.22;
    const color: [number, number, number] = [
      Math.min(1, def.color[0] * tint),
      Math.min(1, def.color[1] * tint),
      Math.min(1, def.color[2] * (0.92 + rng() * 0.16)),
    ];
    const tFrac = n <= 1 ? 0.5 : i / (n - 1);
    const ecc = tFrac < 0.3
      ? 0.008 + rng() * 0.06
      : tFrac < 0.65
        ? 0.02 + rng() * 0.1
        : 0.04 + rng() * 0.2 + (rng() > 0.88 ? 0.18 : 0);
    const inc = 0.012 + rng() * 0.1 + (rng() > 0.9 ? 0.22 : 0);
    const mu = starMu(starR);
    const meanN = Math.sqrt(mu / (orbit * orbit * orbit));
    planets.push({
      id: `${systemName.toLowerCase()}-${i}`,
      name: `${systemName} ${ROMAN[i]}`,
      kind,
      radius,
      orbit,
      phase: rng() * Math.PI * 2,
      color,
      rings,
      ringInner: radius * (kind === "ringed" ? 1.2 : 1.4 + rng() * 0.1),
      ringOuter: radius * (kind === "ringed" ? 3.55 + rng() * 0.85 : 2.15 + rng() * 0.45),
      ringTilt: kind === "ringed" ? 0.34 + rng() * 0.22 : 0.18 + rng() * 0.5,
      ringColor: kind === "ice" || rng() > 0.5
        ? [0.78, 0.74, 0.66]
        : [0.62, 0.52, 0.40],
      radiusKm,
      massEarth,
      gravityG,
      au,
      yearDays: Math.max(1, Math.round(periodDays(meanN))),
      dayHours: +(8 + rng() * 70).toFixed(1),
      ecc: +ecc.toFixed(3),
      inc,
      lan: rng() * Math.PI * 2,
      argp: rng() * Math.PI * 2,
      m0: rng() * Math.PI * 2,
      meanN,
      climate: def.climate,
      composition: def.composition,
      atmosphere: def.atmosphere,
      interest: "wild",
      stationId: null,
      prospect: null,
      moons: [],
    });
  }
  return planets;
}

export const GRADE_WORD = ["", "thin", "fair", "rich"] as const;

const PROSPECT_NOTE: Record<PlanetKind, { research: string; mining: string }> = {
  rocky: {
    research: "Crater chronology. A later lander would date the highlands.",
    mining: "Silicate crust. Iron-nickel traces in the basins.",
  },
  desert: {
    research: "Dust chemistry and wind-cut strata.",
    mining: "Oxide dunes. Shallow metal crust.",
  },
  ocean: {
    research: "Salt layers and wet-belt organics. Sample from orbit.",
    mining: "Little ore. Some dissolved volatiles.",
  },
  ice: {
    research: "Cryogenic ices. A clean lab core.",
    mining: "Water ice and locked volatiles in the crust.",
  },
  volcanic: {
    research: "Ash skies. Unstable crust for a later lander.",
    mining: "Sulfur vents and metal veins along the rifts.",
  },
  gas: {
    research: "Deep-band chemistry. No surface to claim.",
    mining: "No crust. Atmosphere only.",
  },
  ringed: {
    research: "Ring dusk on the limb. Ice-rock grain for a lab.",
    mining: "Ice-rock rings. Easy orbital scoop later.",
  },
  icegiant: {
    research: "Methane bands. Cold envelope chemistry.",
    mining: "No crust. Trace ices in the high haze.",
  },
};

function rollGrade(rng: () => number, lo: number, hi: number): 1 | 2 | 3 {
  return (lo + Math.floor(rng() * (hi - lo + 1))) as 1 | 2 | 3;
}

export function makeProspect(kind: PlanetKind, rng: () => number): WildProspect {
  let research: WildProspect["research"] = 0;
  let mining: WildProspect["mining"] = 0;
  if (kind === "volcanic") {
    mining = rollGrade(rng, 2, 3);
    research = rng() > 0.55 ? 1 : 0;
  } else if (kind === "desert") {
    mining = rollGrade(rng, 1, 2);
    research = rollGrade(rng, 1, 2);
  } else if (kind === "rocky") {
    mining = rollGrade(rng, 1, 2);
    research = rng() > 0.4 ? 1 : 0;
  } else if (kind === "ice") {
    mining = rollGrade(rng, 2, 3);
    research = rollGrade(rng, 1, 2);
  } else if (kind === "ocean") {
    research = rollGrade(rng, 2, 3);
    mining = rng() > 0.62 ? 1 : 0;
  } else if (kind === "gas") {
    research = rollGrade(rng, 2, 3);
  } else if (kind === "icegiant") {
    research = rollGrade(rng, 2, 3);
    mining = rng() > 0.7 ? 1 : 0;
  } else {
    research = rollGrade(rng, 1, 2);
    mining = rollGrade(rng, 2, 3);
  }
  if (!research && !mining) research = 1;
  const primary = mining >= research ? "mining" : "research";
  return { research, mining, note: PROSPECT_NOTE[kind][primary] };
}

export function formatProspect(p: WildProspect) {
  const bits: string[] = [];
  if (p.research) bits.push(`Research ${GRADE_WORD[p.research]}`);
  if (p.mining) bits.push(`Mining ${GRADE_WORD[p.mining]}`);
  return bits.join(" · ");
}

export function formatProspectShort(p: WildProspect) {
  const primary = p.mining >= p.research ? "mining" : "research";
  const g = primary === "mining" ? p.mining : p.research;
  return `${primary} ${GRADE_WORD[g]}`;
}

function makeStations(planets: Planet[], rng: () => number, home = false): Station[] {
  const stations: Station[] = [];
  const n = planets.length;
  for (let i = 0; i < n; i++) {
    const p = planets[i];
    const gas = p.kind === "gas" || p.kind === "ringed" || p.kind === "icegiant";
    let want: boolean;
    if (home) want = i < Math.max(2, n - 1);
    else if (i === n - 1 && n >= 3) want = rng() > 0.7;
    else want = gas ? rng() > 0.48 : rng() > 0.14;
    if (!want) {
      p.interest = "wild";
      p.stationId = null;
      p.prospect = makeProspect(p.kind, rng);
      continue;
    }
    const kind = pickStationKind(p, rng, home ? stations.length : null);
    const look = stationLook(kind);
    const id = `st-${p.id}`;
    const radius = 7.2 + Math.min(4.5, p.radius * 0.06);
    const st: Station = {
      id,
      name: `${p.name} ${stationSuffix(kind, rng)}`,
      planetId: p.id,
      kind,
      radius,
      ringR: radius * 1.92,
      phase: rng() * Math.PI * 2,
      color: look.color,
      accent: look.accent,
    };
    p.interest = "port";
    p.stationId = id;
    p.prospect = null;
    stations.push(st);
  }
  if (!stations.length && planets[0]) {
    const p = planets[0];
    const kind = pickStationKind(p, rng, home ? 0 : null);
    const look = stationLook(kind);
    const id = `st-${p.id}`;
    const radius = 8;
    stations.push({
      id,
      name: `${p.name} ${stationSuffix(kind, rng)}`,
      planetId: p.id,
      kind,
      radius,
      ringR: radius * 1.92,
      phase: 0.4,
      color: look.color,
      accent: look.accent,
    });
    p.interest = "port";
    p.stationId = id;
    p.prospect = null;
  }
  return stations;
}

function applyShowpieceRings(planets: Planet[]) {
  const p =
    planets.find((pl) => pl.kind === "ringed") ??
    planets.find((pl) => pl.kind === "gas") ??
    planets[Math.max(0, planets.length - 2)];
  if (!p) return;
  const def = KIND_LOOK.ringed;
  p.kind = "ringed";
  p.rings = true;
  p.climate = def.climate;
  p.composition = def.composition;
  p.atmosphere = def.atmosphere;
  p.ringInner = p.radius * 1.16;
  p.ringOuter = p.radius * 4.25;
  p.ringTilt = 0.47;
  p.ringColor = [0.9, 0.82, 0.62];
}

function isGiant(p: Planet) {
  return p.kind === "gas" || p.kind === "ringed" || p.kind === "icegiant";
}

function paintKind(p: Planet, kind: PlanetKind, rng: () => number) {
  const def = KIND_LOOK[kind];
  const tint = 0.88 + rng() * 0.22;
  p.kind = kind;
  p.climate = def.climate;
  p.composition = def.composition;
  p.atmosphere = def.atmosphere;
  p.color = [
    Math.min(1, def.color[0] * tint),
    Math.min(1, def.color[1] * tint),
    Math.min(1, def.color[2] * (0.92 + rng() * 0.16)),
  ];
  const span = def.r1 - def.r0;
  p.radius = def.r0 + Math.min(span, Math.max(0, p.radius - 20) * 0.35 + rng() * span * 0.55);
  p.radiusKm = Math.round(def.km0 + rng() * (def.km1 - def.km0));
  const rEarth = p.radiusKm / 6371;
  p.massEarth = +(def.massK * (p.radiusKm / ((def.km0 + def.km1) * 0.5)) ** 3 * (0.85 + rng() * 0.3)).toFixed(2);
  p.gravityG = +Math.max(0.08, p.massEarth / Math.max(0.2, rEarth * rEarth)).toFixed(2);
}

function ensureIceGiant(planets: Planet[], rng: () => number, force = false) {
  if (planets.some((p) => p.kind === "icegiant")) return;
  if (!force && rng() > 0.55) return;
  const cand =
    [...planets].reverse().find((p) => p.kind === "ice" || (p.kind === "gas" && !p.rings)) ??
    [...planets].reverse().find((p) => p.kind !== "ringed") ??
    planets[planets.length - 1];
  if (!cand || cand.kind === "ringed") return;
  paintKind(cand, "icegiant", rng);
  cand.rings = rng() > 0.45;
  if (cand.rings) {
    cand.ringInner = cand.radius * 1.35;
    cand.ringOuter = cand.radius * (2.05 + rng() * 0.45);
    cand.ringTilt = 0.55 + rng() * 0.4;
    cand.ringColor = [0.72, 0.82, 0.9];
  }
}

const MOON_BAG: MoonKind[] = ["ice", "rocky", "ice", "desert", "volcanic"];

function makeMoons(planet: Planet, rng: () => number) {
  const giant = isGiant(planet);
  let n = 0;
  if (giant) n = 1 + Math.floor(rng() * 3) + (rng() > 0.82 ? 1 : 0);
  else if (rng() > 0.78) n = 1;
  if (n < 1) {
    planet.moons = [];
    return;
  }
  const start = planet.rings
    ? Math.max(planet.ringOuter * 1.18, planet.radius * 3.8)
    : planet.radius * (giant ? 4.2 : 5.2);
  const moons: Moon[] = [];
  let orbit = start;
  for (let i = 0; i < n; i++) {
    if (i > 0) orbit *= 1.45 + rng() * 0.22;
    else orbit += rng() * planet.radius * 0.35;
    const kind = MOON_BAG[Math.floor(rng() * MOON_BAG.length)];
    const def = KIND_LOOK[kind];
    const radius = 3.4 + rng() * (giant ? 7.5 : 4.2);
    const radiusKm = Math.round(420 + rng() * (kind === "ice" ? 2200 : 1600));
    const massEarth = +(0.002 + rng() * 0.04).toFixed(3);
    const rEarth = Math.max(0.08, radiusKm / 6371);
    const muP = planetMu(planet);
    const meanN = Math.sqrt(muP / (orbit * orbit * orbit));
    moons.push({
      id: `${planet.id}-m${i}`,
      name: `${planet.name} ${String.fromCharCode(97 + i)}`,
      planetId: planet.id,
      kind,
      radius,
      orbit,
      phase: rng() * Math.PI * 2,
      inc: 0.04 + rng() * 0.22 + (rng() > 0.88 ? 0.4 : 0),
      meanN,
      color: [
        Math.min(1, def.color[0] * (0.9 + rng() * 0.18)),
        Math.min(1, def.color[1] * (0.9 + rng() * 0.18)),
        Math.min(1, def.color[2] * (0.92 + rng() * 0.14)),
      ],
      radiusKm,
      massEarth,
      gravityG: +Math.max(0.02, massEarth / (rEarth * rEarth)).toFixed(2),
      dayHours: +(16 + rng() * 90).toFixed(1),
      climate: kind === "ice" ? "Frozen crust. No air to speak of." : def.climate,
      composition: def.composition,
      atmosphere: "None",
      prospect: makeProspect(kind, rng),
    });
  }
  planet.moons = moons;
}

function makeBelt(planets: Planet[], rng: () => number, systemName: string, starR: number, force = false): Belt | null {
  if (!force && rng() > 0.62) return null;
  const sorted = [...planets].sort((a, b) => a.orbit - b.orbit);
  let inner = 0;
  let outer = 0;
  let best = 0;
  for (let i = 0; i < sorted.length - 1; i++) {
    const a = sorted[i].orbit + sorted[i].radius * 6;
    const b = sorted[i + 1].orbit - sorted[i + 1].radius * 8;
    const gap = b - a;
    if (gap > best) {
      best = gap;
      inner = a + gap * 0.18;
      outer = a + gap * 0.82;
    }
  }
  if (best < 1400) {
    const last = sorted[sorted.length - 1];
    inner = last.orbit + last.radius * 10;
    outer = inner + 1600 + rng() * 900;
  }
  if (outer <= inner + 400) return null;
  const icy = inner / AU_UNITS > 1.6 || rng() > 0.55;
  const mid = (inner + outer) * 0.5;
  const mu = starMu(starR);
  return {
    id: `${systemName.toLowerCase()}-belt`,
    name: `${systemName} Belt`,
    inner,
    outer,
    icy,
    seed: Math.floor(rng() * 1e9),
    rocks: 48 + Math.floor(rng() * 28),
    n0: Math.sqrt(mu / (mid * mid * mid)),
    prospect: {
      research: icy ? 2 : 1,
      mining: icy ? 2 : 3,
      note: icy ? "Ice-rock grains. Easy scoop from the lane." : "Silicate bodies. Metal traces in the dark.",
    },
  };
}

function makeComets(rng: () => number, systemName: string, starR: number, planets: Planet[], force = 0): Comet[] {
  const n = force > 0 ? force : rng() > 0.72 ? 2 : rng() > 0.38 ? 1 : 0;
  const maxOrbit = Math.max(...planets.map((p) => p.orbit), starR * 40);
  const out: Comet[] = [];
  for (let i = 0; i < n; i++) {
    const sma = maxOrbit * (0.45 + rng() * 0.9);
    const ecc = 0.68 + rng() * 0.22;
    const au = +(sma / AU_UNITS).toFixed(2);
    const mu = starMu(starR);
    const meanN = Math.sqrt(mu / (sma * sma * sma));
    out.push({
      id: `${systemName.toLowerCase()}-c${i}`,
      name: `C/${nameFrom(rng, 2)}`,
      orbit: sma,
      ecc: +ecc.toFixed(3),
      inc: 0.18 + rng() * 0.7,
      lan: rng() * Math.PI * 2,
      argp: rng() * Math.PI * 2,
      m0: rng() * Math.PI * 2,
      meanN,
      radius: 2.4 + rng() * 2.2,
      color: rng() > 0.5 ? [0.78, 0.84, 0.9] : [0.7, 0.76, 0.72],
      radiusKm: Math.round(8 + rng() * 28),
      au,
      yearDays: Math.max(1, Math.round(periodDays(meanN))),
      climate: "Dirty snow. Bright near the star, dark in the cold.",
      composition: "Water ice, dust, frozen volatiles.",
      atmosphere: "Coma when near the star",
      prospect: {
        research: 3,
        mining: 2,
        note: "Fresh ices. Sample the coma before periapsis.",
      },
    });
  }
  return out;
}

function dressSystem(
  planets: Planet[],
  rng: () => number,
  systemName: string,
  starR: number,
  home = false,
): { belt: Belt | null; comets: Comet[] } {
  if (home) applyShowpieceRings(planets);
  ensureIceGiant(planets, rng, home);
  for (const p of planets) makeMoons(p, rng);
  if (home) {
    const ringed = planets.find((p) => p.kind === "ringed");
    if (ringed && ringed.moons.length < 2) makeMoons(ringed, () => 0.31 + rng() * 0.4);
  }
  const belt = makeBelt(planets, rng, systemName, starR, home);
  const comets = makeComets(rng, systemName, starR, planets, home ? 1 : 0);
  return { belt, comets };
}

function pickNebula(x: number, y: number, rng: () => number, home = false): Nebula {
  const seed = rng();
  if (home) return { kind: "arm", seed: 0.17, intensity: 1.08 };
  const r = Math.hypot(x, y);
  const towardCore = r < 0.05 ? 0 : -x / r;
  let kind: NebulaKind = "arm";
  if (r > 28 && towardCore > 0.55 && rng() > 0.4) kind = "core";
  else if (r > 34 && rng() > 0.74) kind = "cirrus";
  else {
    const roll = rng();
    if (roll < 0.12) kind = "rift";
    else if (roll < 0.28) kind = "hii";
    else if (roll < 0.38) kind = "reflect";
    else if (roll < 0.48) kind = "snr";
    else if (roll < 0.58) kind = "wr";
    else if (roll < 0.7) kind = "core";
    else kind = "arm";
  }
  let intensity = 0.82 + rng() * 0.4;
  if (kind === "cirrus") intensity *= 0.72;
  if (kind === "hii" || kind === "core") intensity *= 1.12;
  if (kind === "rift") intensity *= 0.9;
  return { kind, seed, intensity };
}

export const GALAXY_SEED = 0x8d42;

export function buildGalaxy(seed = GALAXY_SEED): StarSystem[] {
  const rng = mulberry32(seed);
  const systems: StarSystem[] = [];

  const homePlanets = makePlanets(mulberry32(seed ^ 0x11), "Helion", 88);
  const homeExtra = dressSystem(homePlanets, mulberry32(seed ^ 0x31), "Helion", 88, true);
  const homeStations = makeStations(homePlanets, mulberry32(seed ^ 0x21), true);
  systems.push({
    id: "helion",
    name: "Helion",
    x: 0,
    y: 0,
    z: 0,
    starColor: [1.0, 0.94, 0.78],
    starRadius: 88,
    planets: homePlanets,
    stations: homeStations,
    belt: homeExtra.belt,
    comets: homeExtra.comets,
    nebula: pickNebula(0, 0, mulberry32(seed ^ 0x51), true),
  });

  const used = new Set(["helion", "hel"]);
  for (let i = 0; i < 47; i++) {
    const ang = rng() * Math.PI * 2;
    const rad = 6 + rng() * 38;
    let name = nameFrom(rng, rng() > 0.4 ? 2 : 3);
    let guard = 0;
    while (used.has(name.toLowerCase()) && guard++ < 8) name = nameFrom(rng, 2);
    used.add(name.toLowerCase());
    const pal = STAR_PALETTE[Math.floor(rng() * STAR_PALETTE.length)];
    const starR = 58 + rng() * 48;
    const planets = makePlanets(rng, name, starR);
    const extra = dressSystem(planets, rng, name, starR, false);
    const x = Math.cos(ang) * rad;
    const y = Math.sin(ang) * rad;
    systems.push({
      id: `sys-${hashu(name + i).toString(36)}`,
      name,
      x,
      y,
      z: ((hashu(`${name}:z`) >>> 0) / 4294967296 - 0.5) * (3.4 + rad * 0.09),
      starColor: pal,
      starRadius: starR,
      planets,
      stations: makeStations(planets, rng, false),
      belt: extra.belt,
      comets: extra.comets,
      nebula: pickNebula(x, y, rng, false),
    });
  }
  stitchGalaxy(systems, 11.6);
  return systems;
}

export const GALAXY = buildGalaxy();

export function loggedWorlds(surveys: Record<string, true>) {
  const out: { systemId: string; system: string; planet: Planet }[] = [];
  for (const sys of GALAXY) {
    for (const p of sys.planets) {
      if (surveys[p.id] && p.prospect) out.push({ systemId: sys.id, system: sys.name, planet: p });
    }
  }
  return out;
}

export type CatalogRole = "planet" | "moon" | "comet" | "belt";

export type CatalogEntry = {
  id: string;
  name: string;
  systemId: string;
  system: string;
  role: CatalogRole;
  kindLabel: string;
  wild: boolean;
  prospect: WildProspect | null;
  color: [number, number, number];
  rings: boolean;
  planet?: Planet;
  moon?: Moon;
  comet?: Comet;
  belt?: Belt;
  parentName?: string;
  radiusKm?: number;
  massEarth?: number;
  gravityG?: number;
  au?: number;
  yearDays?: number;
  ecc?: number;
  inc?: number;
  dayHours?: number;
  atmosphere?: string;
  composition?: string;
  climate?: string;
};

function catalogIn(sys: StarSystem, id: string): CatalogEntry | null {
  if (sys.belt && sys.belt.id === id) {
    const b = sys.belt;
    return {
      id: b.id,
      name: b.name,
      systemId: sys.id,
      system: sys.name,
      role: "belt",
      kindLabel: b.icy ? "Ice belt" : "Rock belt",
      wild: true,
      prospect: b.prospect,
      color: b.icy ? [0.72, 0.78, 0.86] : [0.55, 0.5, 0.44],
      rings: false,
      belt: b,
      au: +(((b.inner + b.outer) * 0.5) / AU_UNITS).toFixed(2),
      climate: b.icy ? "Cold grains. Thin ice on dark rock." : "Crowded silicate lane.",
      composition: b.icy ? "Ice-rock rubble." : "Silicate and metal shards.",
      atmosphere: "None",
    };
  }
  const comet = sys.comets.find((c) => c.id === id);
  if (comet) {
    return {
      id: comet.id,
      name: comet.name,
      systemId: sys.id,
      system: sys.name,
      role: "comet",
      kindLabel: "Comet",
      wild: true,
      prospect: comet.prospect,
      color: comet.color,
      rings: false,
      comet,
      radiusKm: comet.radiusKm,
      au: comet.au,
      yearDays: comet.yearDays,
      ecc: comet.ecc,
      inc: comet.inc,
      atmosphere: comet.atmosphere,
      composition: comet.composition,
      climate: comet.climate,
    };
  }
  for (const p of sys.planets) {
    if (p.id === id) {
      return {
        id: p.id,
        name: p.name,
        systemId: sys.id,
        system: sys.name,
        role: "planet",
        kindLabel: KIND_LABEL[p.kind],
        wild: p.interest === "wild",
        prospect: p.prospect,
        color: p.color,
        rings: p.rings,
        planet: p,
        radiusKm: p.radiusKm,
        massEarth: p.massEarth,
        gravityG: p.gravityG,
        au: p.au,
        yearDays: p.yearDays,
        ecc: p.ecc,
        inc: p.inc,
        dayHours: p.dayHours,
        atmosphere: p.atmosphere,
        composition: p.composition,
        climate: p.climate,
      };
    }
    const m = p.moons.find((mo) => mo.id === id);
    if (m) {
      return {
        id: m.id,
        name: m.name,
        systemId: sys.id,
        system: sys.name,
        role: "moon",
        kindLabel: `${KIND_LABEL[m.kind]} moon`,
        wild: true,
        prospect: m.prospect,
        color: m.color,
        rings: false,
        moon: m,
        planet: p,
        parentName: p.name,
        radiusKm: m.radiusKm,
        massEarth: m.massEarth,
        gravityG: m.gravityG,
        dayHours: m.dayHours,
        yearDays: periodDays(m.meanN),
        atmosphere: m.atmosphere,
        composition: m.composition,
        climate: m.climate,
      };
    }
  }
  return null;
}

export function getCatalog(systemId: string, id: string) {
  return catalogIn(getSystem(systemId), id);
}

export function findCatalog(id: string) {
  for (const sys of GALAXY) {
    const e = catalogIn(sys, id);
    if (e) return e;
  }
  return null;
}

export type PlanetLogRow = {
  id: string;
  name: string;
  kindLabel: string;
  systemId: string;
  system: string;
  at: number;
  scanned: boolean;
  surveyed: boolean;
  rings: boolean;
  role: CatalogRole;
};

export function planetLog(
  visits: Record<string, { systemId: string; at: number }>,
  scanned: Record<string, true>,
  surveys: Record<string, true>,
): PlanetLogRow[] {
  const rows = new Map<string, PlanetLogRow>();
  const add = (id: string, systemId: string, at: number) => {
    const e = getCatalog(systemId, id) ?? findCatalog(id);
    if (!e || rows.has(id)) return;
    rows.set(id, {
      id: e.id,
      name: e.name,
      kindLabel: e.kindLabel,
      systemId: e.systemId,
      system: e.system,
      at,
      scanned: Boolean(scanned[id]),
      surveyed: Boolean(surveys[id]),
      rings: e.rings,
      role: e.role,
    });
  };
  for (const [id, rec] of Object.entries(visits)) add(id, rec.systemId, rec.at);
  for (const id of Object.keys(scanned)) {
    if (rows.has(id)) continue;
    const e = findCatalog(id);
    if (e) add(id, e.systemId, 0);
  }
  return [...rows.values()].sort((a, b) => b.at - a.at || a.name.localeCompare(b.name));
}

export function getSystem(id: string) {
  return GALAXY.find((s) => s.id === id) ?? GALAXY[0];
}

export function getPlanet(systemId: string, planetId: string) {
  return getSystem(systemId).planets.find((p) => p.id === planetId) ?? null;
}

export function getMoon(systemId: string, moonId: string) {
  for (const p of getSystem(systemId).planets) {
    const m = p.moons.find((mo) => mo.id === moonId);
    if (m) return { moon: m, planet: p };
  }
  return null;
}

export function getComet(systemId: string, cometId: string) {
  return getSystem(systemId).comets.find((c) => c.id === cometId) ?? null;
}

export function getStation(systemId: string, stationId: string) {
  return getSystem(systemId).stations.find((s) => s.id === stationId) ?? null;
}

export function planetOfStation(systemId: string, stationId: string) {
  const st = getStation(systemId, stationId);
  if (!st) return null;
  return getPlanet(systemId, st.planetId);
}

export function distLy(a: StarSystem, b: StarSystem) {
  return Math.hypot(a.x - b.x, a.y - b.y, (a.z ?? 0) - (b.z ?? 0));
}

/** Pull isolated stars toward the Helion component so a stock courier (12 ly) can plot a route to every system. */
function stitchGalaxy(systems: StarSystem[], range: number) {
  const origin = systems[0];
  if (!origin) return;
  for (let iter = 0; iter < 64; iter++) {
    const seen = new Set<string>([origin.id]);
    const q: StarSystem[] = [origin];
    while (q.length) {
      const a = q.pop()!;
      for (const b of systems) {
        if (seen.has(b.id)) continue;
        if (distLy(a, b) <= range + 1e-4) {
          seen.add(b.id);
          q.push(b);
        }
      }
    }
    if (seen.size === systems.length) return;
    let best: { far: StarSystem; near: StarSystem; d: number } | null = null;
    for (const far of systems) {
      if (seen.has(far.id)) continue;
      for (const near of systems) {
        if (!seen.has(near.id)) continue;
        const d = distLy(far, near);
        if (!best || d < best.d) best = { far, near, d };
      }
    }
    if (!best || best.d < 1e-6) return;
    const target = range * 0.96;
    const k = Math.min(1, target / best.d);
    const { far, near } = best;
    far.x = near.x + (far.x - near.x) * k;
    far.y = near.y + (far.y - near.y) * k;
    far.z = (near.z ?? 0) + ((far.z ?? 0) - (near.z ?? 0)) * k;
  }
}

export function catalogSystems(from: StarSystem) {
  return GALAXY
    .filter((s) => s.id !== from.id)
    .map((s) => ({ system: s, ly: distLy(from, s) }))
    .sort((a, b) => a.ly - b.ly);
}

export function neighbors(from: StarSystem, range: number) {
  return catalogSystems(from).filter((n) => n.ly <= range * 2.4);
}

export function plotRoute(from: StarSystem, to: StarSystem, range: number): StarSystem[] | null {
  if (from.id === to.id) return [from];
  if (distLy(from, to) <= range + 1e-4) return [from, to];
  const dist = new Map<string, number>();
  const prev = new Map<string, string>();
  const used = new Set<string>();
  for (const s of GALAXY) dist.set(s.id, Infinity);
  dist.set(from.id, 0);
  for (let n = 0; n < GALAXY.length; n++) {
    let best: StarSystem | null = null;
    let bestD = Infinity;
    for (const s of GALAXY) {
      if (used.has(s.id)) continue;
      const d = dist.get(s.id) ?? Infinity;
      if (d < bestD) {
        bestD = d;
        best = s;
      }
    }
    if (!best || bestD === Infinity) return null;
    if (best.id === to.id) break;
    used.add(best.id);
    for (const s of GALAXY) {
      if (used.has(s.id) || s.id === best.id) continue;
      const hop = distLy(best, s);
      if (hop > range + 1e-4) continue;
      const nd = bestD + hop;
      if (nd < (dist.get(s.id) ?? Infinity)) {
        dist.set(s.id, nd);
        prev.set(s.id, best.id);
      }
    }
  }
  if (!prev.has(to.id) && from.id !== to.id) return null;
  const ids: string[] = [];
  let cur: string | undefined = to.id;
  while (cur) {
    ids.push(cur);
    cur = prev.get(cur);
  }
  ids.reverse();
  if (ids[0] !== from.id) return null;
  return ids.map((id) => getSystem(id));
}

export function nextHop(from: StarSystem, to: StarSystem, range: number) {
  const route = plotRoute(from, to, range);
  if (!route || route.length < 2) return null;
  return route[1];
}

export function routeLengthLy(route: StarSystem[]) {
  let n = 0;
  for (let i = 1; i < route.length; i++) n += distLy(route[i - 1], route[i]);
  return n;
}

export function planetWorld(p: Planet, t: number): [number, number, number] {
  return keplerPosition(p, t);
}

export function moonWorld(planet: Planet, moon: Moon, t: number): [number, number, number] {
  const [x, y, z] = planetWorld(planet, t);
  const ang = moon.phase + moon.meanN * t;
  const c = Math.cos(ang);
  const s = Math.sin(ang);
  const si = Math.sin(moon.inc);
  const ci = Math.cos(moon.inc);
  return [x + c * moon.orbit, y + s * si * moon.orbit, z + s * ci * moon.orbit];
}

export function cometWorld(c: Comet, t: number): [number, number, number] {
  return keplerPosition(c, t);
}

export function beltRock(belt: Belt, i: number, t: number) {
  const h = hashu(`${belt.seed}:${i}`);
  const u = (h >>> 0) / 4294967296;
  const u2 = ((Math.imul(h, 1597) >>> 0) / 4294967296);
  const u3 = ((Math.imul(h, 31337) >>> 0) / 4294967296);
  const r = belt.inner + (belt.outer - belt.inner) * u;
  const n = belt.n0 * Math.pow((belt.inner + belt.outer) * 0.5 / Math.max(r, 1), 1.5);
  const a = u2 * Math.PI * 2 + t * n * (0.92 + u3 * 0.16);
  const y = (u3 - 0.5) * (belt.outer - belt.inner) * 0.08;
  return {
    pos: [Math.cos(a) * r, y, Math.sin(a) * r] as [number, number, number],
    r: 0.65 + u * 2.2,
  };
}

export function inBelt(belt: Belt, x: number, y: number, z: number) {
  const rho = Math.hypot(x, z);
  return rho > belt.inner * 0.96 && rho < belt.outer * 1.04 && Math.abs(y) < (belt.outer - belt.inner) * 0.14 + 36;
}

export function planetKeepOut(p: Planet) {
  return p.radius * 1.13;
}

export function planetProximity(p: Planet) {
  return p.radius * 5.6;
}

export function moonPark(m: Moon) {
  return m.radius * 3.15;
}

export function moonProximity(m: Moon) {
  return m.radius * 6.4;
}

export function cometPark(c: Comet) {
  return Math.max(16, c.radius * 5.8);
}

export function cometProximity(c: Comet) {
  return Math.max(28, c.radius * 9);
}

export { planetSOI } from "./orbit";
