import { distLy, GALAXY, HOME_SYSTEM_ID, getPlanet, getStation, getSystem, planetOfStation } from "./galaxy";
import { hashu, mulberry32 } from "./math";
import type { CargoJob, JobKind, JobLogEntry, JobStop, Manifest, ShipId } from "./types";
import { fittedShip, SHIP_ORDER } from "./catalog";
import type { Loadout } from "./types";
import { jobPayoutFor, type JobSpan } from "./job-pay";
import { cargoQty, type CargoHold } from "./market.ts";
import { hubBoard, jobLeavesHub } from "./job-hub";
import { diaryEarnings, jobContractKey, jobIsRetired, logDelivery, retireContract, retireJob, sanitizeRetired } from "./job-log";

export { hubBoard, jobLeavesHub, diaryEarnings, jobContractKey, jobIsRetired, logDelivery, retireContract, retireJob, sanitizeRetired };

const COURIER_CARGO = ["sealed cores", "scan plates", "seed vault", "nav film", "med ice"];
const HAULER_CARGO = ["ore", "water ice", "grain", "basalt", "volatiles"];
const TENDER_CARGO = ["LH2", "reaction mass", "cell packs", "cryo feed", "depot water"];
const TUG_CARGO = ["lock crates", "bay spares", "gantry parts", "dock film", "collar rings"];
const COURIER_QTY = [2, 3, 4, 6];
const HAULER_QTY = [16, 20, 24, 32];
const TENDER_QTY = [10, 12, 14, 16];
const TUG_QTY = [8, 10, 12];
const JOB_KINDS: JobKind[] = ["courier", "hauler", "tender", "tug"];
const BOARD_SIZE = 6;
const DIARY_CAP = 40;

function cargoBag(kind: JobKind) {
  if (kind === "hauler") return { bag: HAULER_CARGO, qtys: HAULER_QTY, range: 18 };
  if (kind === "tender") return { bag: TENDER_CARGO, qtys: TENDER_QTY, range: 14 };
  if (kind === "tug") return { bag: TUG_CARGO, qtys: TUG_QTY, range: 0 };
  return { bag: COURIER_CARGO, qtys: COURIER_QTY, range: 12 };
}

function stopLabel(stop: JobStop) {
  const st = getStation(stop.systemId, stop.stationId);
  return st?.name ?? getSystem(stop.systemId).name;
}

export function formatStop(stop: JobStop) {
  return stopLabel(stop);
}

function pickStation(systemId: string, rng: () => number, avoid?: string) {
  const list = getSystem(systemId).stations.filter((s) => s.id !== avoid);
  if (!list.length) return getSystem(systemId).stations[0] ?? null;
  return list[Math.floor(rng() * list.length)];
}

function neighborPort(fromId: string, range: number, rng: () => number) {
  const here = getSystem(fromId);
  const withPorts = GALAXY
    .filter((s) => s.id !== here.id && s.stations.length > 0)
    .sort((a, b) => distLy(here, a) - distLy(here, b));
  const near = withPorts.filter((s) => distLy(here, s) <= Math.max(range, 0.01));
  const pool = near.length ? near : withPorts;
  if (!pool.length) return null;
  return pool[Math.min(pool.length - 1, Math.floor(rng() * Math.min(4, pool.length)))];
}

function makeJob(
  kind: JobKind,
  fromSys: string,
  fromStationId: string | undefined,
  jump: boolean,
  rng: () => number,
  n: number,
  seed: number,
): CargoJob | null {
  const origin = getSystem(fromSys);
  if (origin.stations.length < 1) return null;
  const fromS = fromStationId
    ? origin.stations.find((s) => s.id === fromStationId) ?? null
    : pickStation(origin.id, rng);
  if (!fromS) return null;
  const localOthers = origin.stations.filter((s) => s.id !== fromS.id);
  let toSys = origin;
  if (jump || localOthers.length === 0) {
    const hop = neighborPort(origin.id, cargoBag(kind).range || 12, rng);
    if (hop) toSys = hop;
  }
  const toS = pickStation(toSys.id, rng, toSys.id === origin.id ? fromS.id : undefined);
  if (!toS || (toS.id === fromS.id && toSys.id === origin.id)) return null;
  const { bag, qtys } = cargoBag(kind);
  const cargo = bag[Math.floor(rng() * bag.length)];
  const qty = qtys[Math.floor(rng() * qtys.length)];
  const from: JobStop = { systemId: origin.id, stationId: fromS.id };
  const to: JobStop = { systemId: toSys.id, stationId: toS.id };
  const nonce = Math.floor(rng() * 1e9);
  return {
    id: `job-${hashu(`${seed}:${n}:${kind}:${fromS.id}:${toS.id}:${cargo}:${qty}:${nonce}`).toString(36)}`,
    kind,
    title: `${fromS.name} ${cargo}`,
    cargo,
    qty,
    from,
    to,
  };
}

function skipSet(avoid?: Iterable<string>) {
  return new Set(avoid);
}

export function makeBoard(
  systemId: string,
  seed = 0xc0de,
  stationId?: string,
  avoid?: Iterable<string>,
): CargoJob[] {
  const rng = mulberry32(seed >>> 0);
  const skip = skipSet(avoid);
  const out: CargoJob[] = [];
  const plan: { kind: JobKind; jump: boolean }[] = [
    { kind: "courier", jump: false },
    { kind: "hauler", jump: false },
    { kind: "courier", jump: true },
    { kind: "hauler", jump: true },
    { kind: "tender", jump: true },
    { kind: "tug", jump: false },
  ];
  let n = 0;
  for (const row of plan) {
    let job: CargoJob | null = null;
    for (let t = 0; t < 12 && !job; t++) {
      const next = makeJob(row.kind, systemId, stationId, row.jump, rng, n++, seed);
      if (
        next &&
        jobLeavesHub(next.from, next.to, next.from.systemId, next.from.stationId) &&
        !jobIsRetired(next, skip)
      ) {
        job = next;
      }
    }
    if (job) {
      out.push(job);
      skip.add(job.id);
      skip.add(jobContractKey(job));
    }
  }
  return stationId ? hubBoard(out, systemId, stationId) : out;
}

export function refillBoard(
  board: CargoJob[],
  systemId: string,
  seed: number,
  stationId?: string,
  avoid?: Iterable<string>,
): CargoJob[] {
  const skip = skipSet(avoid);
  const keep = (stationId ? hubBoard(board, systemId, stationId) : board).filter((j) => !jobIsRetired(j, skip));
  if (keep.length >= BOARD_SIZE) return keep.slice(0, BOARD_SIZE);
  const extra = makeBoard(systemId, seed, stationId, [...skip, ...keep.flatMap((j) => [j.id, jobContractKey(j)])]);
  const have = new Set(keep.flatMap((j) => [j.id, jobContractKey(j)]));
  const next = [...keep];
  for (const j of extra) {
    if (have.has(j.id) || have.has(jobContractKey(j)) || jobIsRetired(j, skip)) continue;
    next.push(j);
    have.add(j.id);
    have.add(jobContractKey(j));
    if (next.length >= BOARD_SIZE) break;
  }
  return next;
}

export function sanitizeJobLog(raw: unknown): JobLogEntry[] {
  if (!Array.isArray(raw)) return [];
  const out: JobLogEntry[] = [];
  for (const row of raw) {
    if (!row || typeof row !== "object") continue;
    const j = row as JobLogEntry;
    const from = coerceStop(j.from, HOME_SYSTEM_ID);
    const to = coerceStop(j.to, HOME_SYSTEM_ID);
    if (!from || !to) continue;
    if (typeof j.pay !== "number" || j.pay < 0) continue;
    out.push({
      id: String(j.id || hashu(`${from.stationId}-${to.stationId}-${j.at}`).toString(36)),
      kind: JOB_KINDS.includes(j.kind) ? j.kind : "courier",
      cargo: String(j.cargo || "cargo"),
      qty: Math.max(1, Math.round(Number(j.qty) || 1)),
      from,
      to,
      pay: Math.round(j.pay),
      at: typeof j.at === "number" ? j.at : 0,
      shipId: SHIP_ORDER.includes(j.shipId) ? j.shipId : "courier",
    });
    if (out.length >= DIARY_CAP) break;
  }
  return out;
}

function coerceStop(raw: unknown, systemHint: string): JobStop | null {
  if (!raw || typeof raw !== "object") return null;
  const rec = raw as { systemId?: string; stationId?: string; planetId?: string };
  const systemId = rec.systemId || systemHint;
  if (rec.stationId && getStation(systemId, rec.stationId)) {
    return { systemId, stationId: rec.stationId };
  }
  if (rec.planetId) {
    const p = getPlanet(systemId, rec.planetId);
    if (p?.stationId) return { systemId, stationId: p.stationId };
  }
  return null;
}

export function sanitizeBoard(raw: unknown, systemId: string, stationId?: string): CargoJob[] {
  if (!Array.isArray(raw) || raw.length === 0) return [];
  const out: CargoJob[] = [];
  for (const row of raw) {
    if (!row || typeof row !== "object") continue;
    const j = row as CargoJob;
    const from = coerceStop(j.from, systemId);
    const to = coerceStop(j.to, systemId);
    if (!from || !to) continue;
    if (typeof j.qty !== "number" || j.qty < 1) continue;
    if (from.stationId === to.stationId && from.systemId === to.systemId) continue;
    out.push({
      id: String(j.id || hashu(`${from.stationId}-${to.stationId}`).toString(36)),
      kind: JOB_KINDS.includes(j.kind) ? j.kind : "courier",
      title: String(j.title || j.cargo || "run"),
      cargo: String(j.cargo || "cargo"),
      qty: Math.round(j.qty),
      from,
      to,
    });
  }
  return stationId ? hubBoard(out, systemId, stationId) : out;
}

export function sanitizeManifests(raw: unknown): Record<ShipId, Manifest | null> {
  const out = Object.fromEntries(SHIP_ORDER.map((id) => [id, null])) as Record<ShipId, Manifest | null>;
  if (!raw || typeof raw !== "object") return out;
  const rec = raw as Partial<Record<ShipId, Manifest | null>>;
  for (const hull of SHIP_ORDER) {
    const m = rec[hull];
    if (!m?.job?.id) continue;
    const from = coerceStop(m.job.from, HOME_SYSTEM_ID);
    const to = coerceStop(m.job.to, HOME_SYSTEM_ID);
    if (!from || !to) continue;
    out[hull] = { job: { ...m.job, from, to }, loaded: Boolean(m.loaded) };
  }
  return out;
}

export function jobDistanceLy(job: Pick<CargoJob, "from" | "to">): number {
  if (job.from.systemId === job.to.systemId) return 0;
  return distLy(getSystem(job.from.systemId), getSystem(job.to.systemId));
}

/** In-system haul in AU (orbit gap). Same-planet locks get a short-dock floor. */
export function jobDistanceAu(job: Pick<CargoJob, "from" | "to">): number {
  if (job.from.systemId !== job.to.systemId) return 0;
  const a = planetOfStation(job.from.systemId, job.from.stationId);
  const b = planetOfStation(job.to.systemId, job.to.stationId);
  if (!a || !b) return 0.4;
  const gap = Math.abs(a.au - b.au);
  return Math.max(a.id === b.id ? 0.25 : 0.4, gap);
}

export function jobSpan(job: Pick<CargoJob, "from" | "to">): JobSpan {
  return { au: jobDistanceAu(job), ly: jobDistanceLy(job) };
}

/** Pay ∝ cargo units × (local AU + jump ly). */
export function jobPayout(job: CargoJob): number {
  return jobPayoutFor(job, jobSpan(job));
}

export function formatHaul(job: Pick<CargoJob, "from" | "to">): string {
  const span = jobSpan(job as CargoJob);
  if (span.ly > 0) return `${span.ly < 10 ? span.ly.toFixed(1) : span.ly.toFixed(0)} ly`;
  return `${span.au.toFixed(2)} AU`;
}

export function holdUsed(manifest: Manifest | null, cargo?: CargoHold | null) {
  const job = manifest?.loaded ? manifest.job.qty : 0;
  return job + cargoQty(cargo);
}

export function jobFits(
  job: CargoJob,
  shipId: ShipId,
  loadout: Loadout,
  manifest: Manifest | null,
  cargo?: CargoHold | null,
) {
  if (manifest) return false;
  const cap = fittedShip(shipId, loadout).cargoCap;
  return job.qty + cargoQty(cargo) <= cap;
}

export function atStop(stop: JobStop, systemId: string, stationId: string | null) {
  return Boolean(stationId && stop.systemId === systemId && stop.stationId === stationId);
}
