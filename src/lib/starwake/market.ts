import { hashu, mulberry32 } from "./math.ts";

export const MARKET_TICK_MS = 15_000;
export const MARKET_HISTORY = 24;
export const HUB_LISTINGS = 8;
const WALK = 48;
const PULL = 0.28;
const VOL = 0.62;

export const KINDS = ["raw", "refined", "consumable", "tech"] as const;
export type GoodKind = (typeof KINDS)[number];

export const KIND_LABEL: Record<GoodKind, string> = {
  raw: "harvest",
  refined: "bulk",
  consumable: "life",
  tech: "parts",
};

/** Mean ₡ / unit bands. Rare harvest may sit above cheap bulk; parts sit above all three. */
export const KIND_BAND: Record<GoodKind, { min: number; max: number }> = {
  raw: { min: 6, max: 50 },
  refined: { min: 20, max: 80 },
  consumable: { min: 12, max: 130 },
  tech: { min: 40, max: 250 },
};

export const GOODS = [
  { id: "hydrogen", name: "hydrogen", kind: "raw", base: 6 },
  { id: "ice", name: "water ice", kind: "raw", base: 8 },
  { id: "silicates", name: "silicates", kind: "raw", base: 10 },
  { id: "carbon", name: "carbon", kind: "raw", base: 12 },
  { id: "ore", name: "iron ore", kind: "raw", base: 16 },
  { id: "copper-ore", name: "copper ore", kind: "raw", base: 20 },
  { id: "crude", name: "crude oil", kind: "raw", base: 24 },
  { id: "volatiles", name: "volatiles", kind: "raw", base: 28 },
  { id: "rare-earths", name: "rare earths", kind: "raw", base: 40 },
  { id: "helium3", name: "helium-3", kind: "raw", base: 46 },
  { id: "grain", name: "grain", kind: "refined", base: 22 },
  { id: "glass", name: "glass", kind: "refined", base: 26 },
  { id: "plastics", name: "plastics", kind: "refined", base: 30 },
  { id: "steel", name: "steel", kind: "refined", base: 34 },
  { id: "ceramics", name: "ceramics", kind: "refined", base: 38 },
  { id: "copper", name: "copper", kind: "refined", base: 42 },
  { id: "polymers", name: "polymers", kind: "refined", base: 46 },
  { id: "aluminium", name: "aluminium", kind: "refined", base: 52 },
  { id: "alloys", name: "alloys", kind: "refined", base: 60 },
  { id: "titanium", name: "titanium", kind: "refined", base: 78 },
  { id: "reaction", name: "reaction mass", kind: "consumable", base: 12 },
  { id: "water", name: "water", kind: "consumable", base: 14 },
  { id: "oxygen", name: "oxygen", kind: "consumable", base: 18 },
  { id: "cryo", name: "cryo feed", kind: "consumable", base: 26 },
  { id: "food", name: "food", kind: "consumable", base: 34 },
  { id: "lh2", name: "LH2", kind: "consumable", base: 38 },
  { id: "seed", name: "seed vault", kind: "consumable", base: 50 },
  { id: "stimulants", name: "stimulants", kind: "consumable", base: 72 },
  { id: "medicine", name: "medicine", kind: "consumable", base: 95 },
  { id: "luxuries", name: "luxuries", kind: "consumable", base: 120 },
  { id: "batteries", name: "batteries", kind: "tech", base: 48 },
  { id: "spares", name: "bay spares", kind: "tech", base: 52 },
  { id: "machinery", name: "machinery", kind: "tech", base: 64 },
  { id: "optics", name: "optics", kind: "tech", base: 88 },
  { id: "film", name: "nav film", kind: "tech", base: 96 },
  { id: "chips", name: "microchips", kind: "tech", base: 110 },
  { id: "cores", name: "sealed cores", kind: "tech", base: 160 },
  { id: "robotics", name: "robotics", kind: "tech", base: 175 },
  { id: "weapons", name: "weapons parts", kind: "tech", base: 200 },
  { id: "prototype", name: "prototype tech", kind: "tech", base: 240 },
] as const;

export type GoodId = (typeof GOODS)[number]["id"];
export type GoodDef = (typeof GOODS)[number];
export type CargoLot = { goodId: GoodId; qty: number; paid: number };
export type CargoHold = CargoLot[];

const AMP: Record<GoodKind, number> = {
  raw: 0.22,
  refined: 0.16,
  consumable: 0.24,
  tech: 0.32,
};

const GOOD_IDS = new Set<string>(GOODS.map((g) => g.id));
const BY_ID = Object.fromEntries(GOODS.map((g) => [g.id, g])) as Record<GoodId, GoodDef>;

export function isGoodId(v: unknown): v is GoodId {
  return typeof v === "string" && GOOD_IDS.has(v);
}

export function goodById(id: GoodId): GoodDef {
  return BY_ID[id];
}

export function hubKey(systemId: string, stationId: string) {
  return `${systemId}:${stationId}`;
}

export function marketTick(now = Date.now()) {
  return Math.floor(now / MARKET_TICK_MS);
}

function unit01(key: string) {
  return hashu(key) / 4294967296;
}

/** Eight unique goods this lock lists, seeded from the hub. Same ₡ everywhere. */
export function hubListings(hub: string): GoodId[] {
  const rng = mulberry32(hashu(`list|${hub}`));
  const bag = GOODS.slice();
  for (let i = bag.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = bag[i];
    bag[i] = bag[j];
    bag[j] = tmp;
  }
  return bag.slice(0, HUB_LISTINGS).map((g) => g.id);
}

export function hubTrades(hub: string, goodId: GoodId) {
  return hubListings(hub).includes(goodId);
}

/** Galaxy-wide ₡ / unit. Hashed random walk — not a sine, same at every lock. */
export function quoteGood(goodId: GoodId, tick = marketTick()) {
  const good = BY_ID[goodId];
  const amp = AMP[good.kind];
  let x = 0;
  for (let t = tick - WALK + 1; t <= tick; t++) {
    const n = unit01(`tape|${good.id}|${t}`) * 2 - 1;
    x = x * (1 - PULL) + n * VOL;
  }
  return Math.max(1, Math.round(good.base * (1 + amp * Math.tanh(x))));
}

export function quoteHistory(goodId: GoodId, tick = marketTick()) {
  const out: number[] = [];
  for (let i = MARKET_HISTORY - 1; i >= 0; i--) out.push(quoteGood(goodId, tick - i));
  return out;
}

export function trendDelta(history: number[]) {
  if (history.length < 2) return 0;
  return history[history.length - 1] - history[0];
}

export function sparkPath(values: number[], w = 72, h = 20) {
  if (values.length < 2) return "";
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = Math.max(1, max - min);
  return values
    .map((v, i) => {
      const x = (i / (values.length - 1)) * w;
      const y = h - 1 - ((v - min) / span) * (h - 2);
      return `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");
}

export function cargoQty(hold: CargoHold | null | undefined) {
  if (!hold?.length) return 0;
  let n = 0;
  for (const lot of hold) n += lot.qty;
  return n;
}

export function cargoOf(hold: CargoHold | null | undefined, goodId: GoodId) {
  if (!hold) return 0;
  const lot = hold.find((row) => row.goodId === goodId);
  return lot?.qty ?? 0;
}

export function cargoPaid(hold: CargoHold | null | undefined, goodId: GoodId) {
  if (!hold) return 0;
  const lot = hold.find((row) => row.goodId === goodId);
  return lot?.paid ?? 0;
}

/** Weighted average ₡ / unit you paid. 0 if the lot has no cost basis. */
export function cargoAvg(hold: CargoHold | null | undefined, goodId: GoodId) {
  const qty = cargoOf(hold, goodId);
  if (qty <= 0) return 0;
  return Math.round(cargoPaid(hold, goodId) / qty);
}

export function addCargo(hold: CargoHold, goodId: GoodId, qty: number, paid = 0): CargoHold {
  const n = Math.max(0, Math.round(qty));
  if (n <= 0) return hold;
  const cost = Math.max(0, Math.round(paid));
  const next = hold.map((lot) => ({ ...lot }));
  const row = next.find((lot) => lot.goodId === goodId);
  if (row) {
    row.qty += n;
    row.paid += cost;
  } else {
    next.push({ goodId, qty: n, paid: cost });
  }
  return next;
}

export function pullCargo(
  hold: CargoHold,
  goodId: GoodId,
  qty: number,
  paidExact?: number,
): { hold: CargoHold; qty: number; paid: number } | null {
  const n = Math.max(0, Math.round(qty));
  if (n <= 0) return { hold, qty: 0, paid: 0 };
  const row = hold.find((lot) => lot.goodId === goodId);
  if (!row || row.qty < n) return null;
  const share = n >= row.qty ? row.paid : Math.round((row.paid * n) / row.qty);
  const paid =
    paidExact == null ? share : Math.max(0, Math.min(row.paid, Math.round(paidExact)));
  const rest = hold
    .map((lot) =>
      lot.goodId === goodId ? { ...lot, qty: lot.qty - n, paid: lot.paid - paid } : lot,
    )
    .filter((lot) => lot.qty > 0);
  return { hold: rest, qty: n, paid };
}

export function takeCargo(hold: CargoHold, goodId: GoodId, qty: number): CargoHold | null {
  return pullCargo(hold, goodId, qty)?.hold ?? null;
}

export function sanitizeCargo(raw: unknown): CargoHold {
  if (!Array.isArray(raw)) return [];
  const merged = new Map<GoodId, { qty: number; paid: number }>();
  for (const row of raw) {
    if (!row || typeof row !== "object") continue;
    const rec = row as { goodId?: unknown; qty?: unknown; paid?: unknown };
    if (!isGoodId(rec.goodId)) continue;
    const qty = Math.max(0, Math.round(Number(rec.qty) || 0));
    if (qty <= 0) continue;
    const paid = Math.max(0, Math.round(Number(rec.paid) || 0));
    const prev = merged.get(rec.goodId) ?? { qty: 0, paid: 0 };
    merged.set(rec.goodId, { qty: prev.qty + qty, paid: prev.paid + paid });
  }
  return GOODS.filter((g) => merged.has(g.id)).map((g) => {
    const lot = merged.get(g.id)!;
    return { goodId: g.id, qty: lot.qty, paid: lot.paid };
  });
}

/** Stable empty hold for Zustand selectors. `?? []` is a new array every snapshot and loops React. */
export const EMPTY_HOLD: CargoHold = [];

export function emptyHolds(): Record<string, CargoHold> {
  return {
    courier: [],
    hauler: [],
    scout: [],
    clipper: [],
    tender: [],
    tug: [],
  };
}

export function lotLabel(hold: CargoHold) {
  if (!hold.length) return "empty";
  return hold
    .map((lot) => {
      const name = goodById(lot.goodId).name;
      if (lot.paid <= 0) return `${lot.qty} ${name}`;
      return `${lot.qty} ${name} @₡${Math.round(lot.paid / lot.qty)}`;
    })
    .join(" · ");
}

export function lotBasis(hold: CargoHold | null | undefined, goodId: GoodId) {
  const qty = cargoOf(hold, goodId);
  const avg = cargoAvg(hold, goodId);
  if (qty <= 0) return "0 u";
  return avg > 0 ? `${qty} u @₡${avg}` : `${qty} u`;
}
