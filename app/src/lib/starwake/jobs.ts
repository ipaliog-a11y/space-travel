import { distLy, GALAXY, getPlanet, getStation, getSystem } from "./galaxy";
import { hashu, mulberry32 } from "./math";
import type { CargoJob, JobKind, JobStop, Manifest, ShipId } from "./types";
import { fittedShip, SHIP_ORDER } from "./catalog";
import type { Loadout } from "./types";

const COURIER_CARGO = ["sealed cores", "scan plates", "seed vault", "nav film", "med ice"];
const HAULER_CARGO = ["ore", "water ice", "grain", "basalt", "volatiles"];
const TENDER_CARGO = ["LH2", "reaction mass", "cell packs", "cryo feed", "depot water"];
const TUG_CARGO = ["lock crates", "bay spares", "gantry parts", "dock film", "collar rings"];
const COURIER_QTY = [2, 3, 4, 6];
const HAULER_QTY = [16, 20, 24, 32];
const TENDER_QTY = [10, 12, 14, 16];
const TUG_QTY = [8, 10, 12];
const JOB_KINDS: JobKind[] = ["courier", "hauler", "tender", "tug"];

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
  const near = GALAXY
    .filter((s) => s.id !== here.id && s.stations.length > 0 && distLy(here, s) <= range)
    .sort((a, b) => distLy(here, a) - distLy(here, b));
  if (!near.length) return null;
  return near[Math.min(near.length - 1, Math.floor(rng() * Math.min(4, near.length)))];
}

function makeJob(kind: JobKind, fromSys: string, jump: boolean, rng: () => number, n: number): CargoJob | null {
  const origin = getSystem(fromSys);
  if (origin.stations.length < 1) return null;
  const fromS = pickStation(origin.id, rng);
  if (!fromS) return null;
  let toSys = origin;
  if (jump) {
    const hop = neighborPort(origin.id, cargoBag(kind).range, rng);
    if (hop) toSys = hop;
  }
  const toS = pickStation(toSys.id, rng, toSys.id === origin.id ? fromS.id : undefined);
  if (!toS || (toS.id === fromS.id && toSys.id === origin.id)) return null;
  const { bag, qtys } = cargoBag(kind);
  const cargo = bag[Math.floor(rng() * bag.length)];
  const qty = qtys[Math.floor(rng() * qtys.length)];
  const from: JobStop = { systemId: origin.id, stationId: fromS.id };
  const to: JobStop = { systemId: toSys.id, stationId: toS.id };
  return {
    id: `job-${hashu(`${kind}-${cargo}-${fromS.id}-${toS.id}-${n}`).toString(36)}`,
    kind,
    title: `${fromS.name} ${cargo}`,
    cargo,
    qty,
    from,
    to,
  };
}

export function makeBoard(systemId: string, seed = 0xc0de): CargoJob[] {
  const rng = mulberry32(seed >>> 0);
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
    for (let t = 0; t < 6 && !job; t++) job = makeJob(row.kind, systemId, row.jump, rng, n++);
    if (job && !out.some((j) => j.id === job!.id)) out.push(job);
  }
  return out;
}

export function refillBoard(board: CargoJob[], systemId: string, seed: number): CargoJob[] {
  if (board.length >= 6) return board;
  const extra = makeBoard(systemId, seed);
  const have = new Set(board.map((j) => j.id));
  const next = [...board];
  for (const j of extra) {
    if (have.has(j.id)) continue;
    next.push(j);
    have.add(j.id);
    if (next.length >= 6) break;
  }
  return next;
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

export function sanitizeBoard(raw: unknown, systemId: string): CargoJob[] {
  if (!Array.isArray(raw) || raw.length === 0) return makeBoard(systemId);
  const out: CargoJob[] = [];
  for (const row of raw) {
    if (!row || typeof row !== "object") continue;
    const j = row as CargoJob;
    const from = coerceStop(j.from, systemId);
    const to = coerceStop(j.to, systemId);
    if (!from || !to) continue;
    if (typeof j.qty !== "number" || j.qty < 1) continue;
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
  return out.length ? out : makeBoard(systemId);
}

export function sanitizeManifests(raw: unknown): Record<ShipId, Manifest | null> {
  const out = Object.fromEntries(SHIP_ORDER.map((id) => [id, null])) as Record<ShipId, Manifest | null>;
  if (!raw || typeof raw !== "object") return out;
  const rec = raw as Partial<Record<ShipId, Manifest | null>>;
  for (const hull of SHIP_ORDER) {
    const m = rec[hull];
    if (!m?.job?.id) continue;
    const from = coerceStop(m.job.from, "helion");
    const to = coerceStop(m.job.to, "helion");
    if (!from || !to) continue;
    out[hull] = { job: { ...m.job, from, to }, loaded: Boolean(m.loaded) };
  }
  return out;
}

export function holdUsed(manifest: Manifest | null) {
  if (!manifest?.loaded) return 0;
  return manifest.job.qty;
}

export function jobFits(job: CargoJob, shipId: ShipId, loadout: Loadout, manifest: Manifest | null) {
  if (manifest) return false;
  const cap = fittedShip(shipId, loadout).cargoCap;
  return job.qty <= cap;
}

export function atStop(stop: JobStop, systemId: string, stationId: string | null) {
  return Boolean(stationId && stop.systemId === systemId && stop.stationId === stationId);
}
