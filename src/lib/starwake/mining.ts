import { hashu } from "./math.ts";
import { goodById, type GoodId } from "./market.ts";
import type { MoonKind, PlanetKind, ProspectGrade, ShipId } from "./types.ts";

export type ResourcePhase = "gas" | "liquid" | "solid";

export type BodyYield = {
  phase: ResourcePhase;
  goods: GoodId[];
};

export type YieldSource = {
  id: string;
  role: "planet" | "moon" | "comet" | "belt";
  kind?: PlanetKind | MoonKind;
  icy?: boolean;
  mining: ProspectGrade;
};

const PHASE_WORD: Record<ResourcePhase, string> = {
  gas: "Gas scoop",
  liquid: "Liquid pull",
  solid: "Solid pull",
};

const KIND_YIELDS: Record<PlanetKind, { phase: ResourcePhase; pool: [GoodId, GoodId] }> = {
  rocky: { phase: "solid", pool: ["silicates", "ore"] },
  desert: { phase: "solid", pool: ["silicates", "copper-ore"] },
  ocean: { phase: "liquid", pool: ["ice", "volatiles"] },
  ice: { phase: "liquid", pool: ["ice", "volatiles"] },
  volcanic: { phase: "solid", pool: ["ore", "rare-earths"] },
  gas: { phase: "gas", pool: ["hydrogen", "helium3"] },
  ringed: { phase: "solid", pool: ["ice", "silicates"] },
  icegiant: { phase: "gas", pool: ["hydrogen", "volatiles"] },
};

const MOON_YIELDS: Record<MoonKind, { phase: ResourcePhase; pool: [GoodId, GoodId] }> = {
  ice: KIND_YIELDS.ice,
  rocky: KIND_YIELDS.rocky,
  desert: KIND_YIELDS.desert,
  volcanic: KIND_YIELDS.volcanic,
};

/** Extractor drinks fast. Other hulls can sip so the loop is discoverable. */
export const EXTRACT_SEC: Record<ShipId, number> = {
  courier: 14,
  hauler: 10.5,
  scout: 12,
  clipper: 16,
  tender: 12.5,
  tug: 9.5,
  extractor: 2.6,
};

export function sourceFromCatalog(entry: {
  id: string;
  role: "planet" | "moon" | "comet" | "belt";
  planet?: { kind: PlanetKind } | null;
  moon?: { kind: MoonKind } | null;
  belt?: { icy: boolean } | null;
  comet?: unknown;
  prospect: { mining: ProspectGrade } | null;
}): YieldSource | null {
  if (!entry.prospect) return null;
  if (entry.role === "belt") {
    return { id: entry.id, role: "belt", icy: Boolean(entry.belt?.icy), mining: entry.prospect.mining };
  }
  if (entry.role === "comet") {
    return { id: entry.id, role: "comet", mining: entry.prospect.mining };
  }
  if (entry.role === "moon" && entry.moon) {
    return { id: entry.id, role: "moon", kind: entry.moon.kind, mining: entry.prospect.mining };
  }
  if (entry.planet) {
    return { id: entry.id, role: "planet", kind: entry.planet.kind, mining: entry.prospect.mining };
  }
  return { id: entry.id, role: entry.role, mining: entry.prospect.mining };
}

function pickPool(pool: [GoodId, GoodId], seedKey: string): GoodId[] {
  const n = hashu(`yield|${seedKey}`);
  return n & 1 ? [pool[1], pool[0]] : [pool[0], pool[1]];
}

export function yieldsFor(src: YieldSource): BodyYield {
  if (src.role === "belt") {
    const pool: [GoodId, GoodId] = src.icy ? ["ice", "silicates"] : ["ore", "silicates"];
    return { phase: "solid", goods: pickPool(pool, src.id) };
  }
  if (src.role === "comet") {
    return { phase: "liquid", goods: pickPool(["ice", "volatiles"], src.id) };
  }
  if (src.role === "moon" && src.kind && src.kind in MOON_YIELDS) {
    const def = MOON_YIELDS[src.kind as MoonKind];
    return { phase: def.phase, goods: pickPool(def.pool, src.id) };
  }
  const kind = (src.kind ?? "rocky") as PlanetKind;
  const def = KIND_YIELDS[kind] ?? KIND_YIELDS.rocky;
  return { phase: def.phase, goods: pickPool(def.pool, src.id) };
}

export function formatYieldLine(y: BodyYield, mining: ProspectGrade) {
  if (!mining) return "No crust to pull.";
  const names = y.goods.map((id) => goodById(id).name).join(" · ");
  return `${PHASE_WORD[y.phase]} · ${names}`;
}

/** Inner keep-out matches `planetKeepOut` (r×1.13). Outer sits inside park (r×1.52) … proximity (r×5.6). */
export const SCOOP_BAND_INNER = 1.13;
export const SCOOP_BAND_OUTER = 2.4;

export function isGasHarvest(kind?: PlanetKind | MoonKind | string) {
  return kind === "gas" || kind === "icegiant";
}

export function harvestHint(phase: ResourcePhase) {
  return phase === "gas" ? "Scoop from the bands." : "Extract from the well.";
}

export function inScoopBand(dist: number, radius: number) {
  const r = Math.max(1, radius);
  return dist > r * SCOOP_BAND_INNER && dist < r * SCOOP_BAND_OUTER;
}

/** Units pulled per well cycle. Grade is qty; Extractor is speed, not a bigger bite. */
export function extractQty(mining: ProspectGrade) {
  return mining;
}

export function extractLots(
  src: YieldSource,
  freeSpace: number,
): { goodId: GoodId; qty: number }[] {
  const room = Math.max(0, Math.floor(freeSpace));
  if (room <= 0 || src.mining <= 0) return [];
  const y = yieldsFor(src);
  const total = Math.min(room, extractQty(src.mining));
  if (total <= 0 || !y.goods.length) return [];
  if (y.goods.length === 1 || total === 1) {
    return [{ goodId: y.goods[0], qty: total }];
  }
  const second = 1;
  const first = total - second;
  return [
    { goodId: y.goods[0], qty: first },
    { goodId: y.goods[1], qty: second },
  ];
}

export function extractSecFor(shipId: ShipId) {
  return EXTRACT_SEC[shipId] ?? EXTRACT_SEC.courier;
}
