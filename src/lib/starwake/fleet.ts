import type { CargoJob, JobLogEntry, JobStop, ShipId } from "./types.ts";

export const FLEET_CAP = 2;
export const CREW_CUT = 0.42;
export type CrewHull = "courier" | "hauler";

export const CREW_BOND: Record<CrewHull, number> = {
  courier: 6000,
  hauler: 9000,
};

export const CREW_UPKEEP: Record<CrewHull, number> = {
  courier: 110,
  hauler: 190,
};

export type CrewRun = {
  job: CargoJob;
  startedAt: number;
  endsAt: number;
  claimed: boolean;
};

export type Crew = {
  id: string;
  hull: CrewHull;
  name: string;
  hiredAt: number;
  run: CrewRun | null;
  /** Hangar instance the crew flies. Empty on old saves. */
  shipKey: string;
  log: JobLogEntry[];
  earned: number;
  completed: number;
};

export type AssignableHull = { id: string; shipType: string };

export function isCrewHull(v: unknown): v is CrewHull {
  return v === "courier" || v === "hauler";
}

export function crewNetFromPayout(playerPay: number, hull: CrewHull) {
  const gross = Math.max(1, Math.round(Math.max(0, playerPay) * CREW_CUT));
  return Math.max(12, gross - CREW_UPKEEP[hull]);
}

export function dueCrews(crew: Crew[], now: number) {
  return crew.filter((c) => c.run && !c.run.claimed && now >= c.run.endsAt);
}

/** Hangar ids a crew already occupies. Empty shipKey claims one matching hull type. */
export function occupiedShipKeys(crew: Crew[], ships: AssignableHull[]): Set<string> {
  const used = new Set<string>();
  for (const c of crew) {
    if (c.shipKey && ships.some((s) => s.id === c.shipKey)) used.add(c.shipKey);
  }
  for (const c of crew) {
    if (c.shipKey && used.has(c.shipKey)) continue;
    const found = ships.find((s) => s.shipType === c.hull && !used.has(s.id));
    if (found) used.add(found.id);
  }
  return used;
}

/**
 * Hulls a new crew can take. Courier/Hauler only. Always leave the player one hull.
 */
export function spareShips(ships: AssignableHull[], crew: Crew[]): AssignableHull[] {
  if (ships.length - crew.length <= 1) return [];
  const used = occupiedShipKeys(crew, ships);
  return ships.filter((s) => isCrewHull(s.shipType) && !used.has(s.id));
}

export function crewGlyphId(name: string): string {
  let h = 2166136261;
  for (let i = 0; i < name.length; i++) h = Math.imul(h ^ name.charCodeAt(i), 16777619);
  const n = (Math.abs(h) % 20) + 1;
  return `pilot-${String(n).padStart(2, "0")}`;
}

function asStop(raw: unknown): JobStop | null {
  if (!raw || typeof raw !== "object") return null;
  const rec = raw as { systemId?: string; stationId?: string };
  if (typeof rec.systemId !== "string" || !rec.systemId) return null;
  if (typeof rec.stationId !== "string" || !rec.stationId) return null;
  return { systemId: rec.systemId, stationId: rec.stationId };
}

function asJob(raw: unknown): CargoJob | null {
  if (!raw || typeof raw !== "object") return null;
  const j = raw as Partial<CargoJob>;
  const from = asStop(j.from);
  const to = asStop(j.to);
  if (!from || !to || typeof j.id !== "string" || !j.id) return null;
  const kind = j.kind === "hauler" ? "hauler" : "courier";
  return {
    id: j.id,
    kind,
    title: typeof j.title === "string" ? j.title : "Line packet",
    cargo: typeof j.cargo === "string" ? j.cargo : "cargo",
    qty: Math.max(1, Math.round(Number(j.qty) || 1)),
    from,
    to,
  };
}

function asLog(raw: unknown, hull: CrewHull): JobLogEntry[] {
  if (!Array.isArray(raw)) return [];
  const out: JobLogEntry[] = [];
  for (const row of raw) {
    if (!row || typeof row !== "object") continue;
    const r = row as Partial<JobLogEntry>;
    const from = asStop(r.from);
    const to = asStop(r.to);
    if (!from || !to || typeof r.id !== "string") continue;
    const shipId = (r.shipId === "hauler" ? "hauler" : hull) as ShipId;
    out.push({
      id: r.id,
      kind: r.kind === "hauler" ? "hauler" : "courier",
      cargo: typeof r.cargo === "string" ? r.cargo : "cargo",
      qty: Math.max(1, Math.round(Number(r.qty) || 1)),
      from,
      to,
      pay: Math.max(0, Math.round(Number(r.pay) || 0)),
      at: typeof r.at === "number" ? r.at : 0,
      shipId,
    });
    if (out.length >= 40) break;
  }
  return out;
}

export function sanitizeCrew(raw: unknown): Crew[] {
  if (!Array.isArray(raw)) return [];
  const out: Crew[] = [];
  const seen = new Set<string>();
  const shipsTaken = new Set<string>();
  for (const row of raw) {
    if (!row || typeof row !== "object") continue;
    const c = row as Partial<Crew>;
    if (!isCrewHull(c.hull)) continue;
    const id = typeof c.id === "string" && c.id ? c.id : `crew-${out.length}`;
    if (seen.has(id)) continue;
    seen.add(id);
    const name = typeof c.name === "string" && c.name.trim() ? c.name.trim().slice(0, 16) : "Line";
    const hiredAt = typeof c.hiredAt === "number" ? c.hiredAt : 0;
    let shipKey = typeof c.shipKey === "string" ? c.shipKey : "";
    if (shipKey && shipsTaken.has(shipKey)) shipKey = "";
    if (shipKey) shipsTaken.add(shipKey);
    let run: CrewRun | null = null;
    if (c.run && typeof c.run === "object") {
      const job = asJob(c.run.job);
      if (job) {
        run = {
          job,
          startedAt: typeof c.run.startedAt === "number" ? c.run.startedAt : hiredAt,
          endsAt: typeof c.run.endsAt === "number" ? c.run.endsAt : hiredAt + 90_000,
          claimed: Boolean(c.run.claimed),
        };
      }
    }
    out.push({
      id,
      hull: c.hull,
      name,
      hiredAt,
      run,
      shipKey,
      log: asLog(c.log, c.hull),
      earned: Math.max(0, Math.round(Number(c.earned) || 0)),
      completed: Math.max(0, Math.round(Number(c.completed) || 0)),
    });
    if (out.length >= FLEET_CAP) break;
  }
  return out;
}
