import type { CargoJob } from "./types.ts";

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
};

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

function asStop(raw: unknown) {
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

export function sanitizeCrew(raw: unknown): Crew[] {
  if (!Array.isArray(raw)) return [];
  const out: Crew[] = [];
  const seen = new Set<string>();
  for (const row of raw) {
    if (!row || typeof row !== "object") continue;
    const c = row as Partial<Crew>;
    if (!isCrewHull(c.hull)) continue;
    const id = typeof c.id === "string" && c.id ? c.id : `crew-${out.length}`;
    if (seen.has(id)) continue;
    seen.add(id);
    const name = typeof c.name === "string" && c.name.trim() ? c.name.trim().slice(0, 16) : "Line";
    const hiredAt = typeof c.hiredAt === "number" ? c.hiredAt : 0;
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
    out.push({ id, hull: c.hull, name, hiredAt, run });
    if (out.length >= FLEET_CAP) break;
  }
  return out;
}
