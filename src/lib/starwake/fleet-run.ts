import { hashu, mulberry32 } from "./math.ts";
import { getSystem, HOME_SYSTEM_ID } from "./galaxy.ts";
import { jobPayout, jobSpan, makeBoard } from "./jobs.ts";
import {
  CREW_CUT,
  crewNetFromPayout,
  type Crew,
  type CrewHull,
  type CrewRun,
} from "./fleet.ts";
import type { CargoJob, JobStop } from "./types.ts";

const LINE_NAMES = ["Kite", "Latch", "Quill", "Bramble", "Nock", "Sill"];

export function crewGross(job: CargoJob) {
  return Math.max(1, Math.round(jobPayout(job) * CREW_CUT));
}

export function crewNet(job: CargoJob, hull: CrewHull) {
  return crewNetFromPayout(jobPayout(job), hull);
}

export function crewRunSec(job: CargoJob) {
  const span = jobSpan(job);
  if (span.ly > 0) return Math.round(140 + span.ly * 8);
  return Math.round(80 + span.au * 18);
}

export function originFromSave(systemId: string, stationId?: string | null): JobStop {
  const sys = getSystem(systemId || HOME_SYSTEM_ID);
  const st =
    (stationId && sys.stations.find((s) => s.id === stationId)) || sys.stations[0];
  return { systemId: sys.id, stationId: st?.id ?? "a" };
}

export function pickCrewJob(hull: CrewHull, from: JobStop, seed: number): CargoJob {
  const board = makeBoard(from.systemId, seed >>> 0, from.stationId);
  const match = board.find((j) => j.kind === hull);
  if (match) return match;
  const any = board[0];
  if (any) return { ...any, kind: hull, qty: hull === "hauler" ? 20 : 4 };
  const toSys = getSystem(from.systemId);
  const to = toSys.stations.find((s) => s.id !== from.stationId) ?? toSys.stations[0];
  return {
    id: `crew-${(seed >>> 0).toString(36)}`,
    kind: hull,
    title: "Line packet",
    cargo: hull === "hauler" ? "ore" : "nav film",
    qty: hull === "hauler" ? 20 : 4,
    from,
    to: { systemId: toSys.id, stationId: to?.id ?? from.stationId },
  };
}

export function startCrewRun(hull: CrewHull, from: JobStop, now: number, seed: number): CrewRun {
  const job = pickCrewJob(hull, from, now ^ seed);
  return {
    job,
    startedAt: now,
    endsAt: now + crewRunSec(job) * 1000,
    claimed: false,
  };
}

export function makeCrew(
  hull: CrewHull,
  now: number,
  from: JobStop,
  taken: string[],
  shipKey: string,
): Crew {
  const rng = mulberry32(hashu(`crew|${hull}|${now}`) >>> 0);
  const name =
    LINE_NAMES.find((n) => !taken.includes(n)) ??
    LINE_NAMES[Math.floor(rng() * LINE_NAMES.length)];
  const id = `crew-${hashu(`${hull}|${now}|${name}`).toString(36)}`;
  return {
    id,
    hull,
    name,
    hiredAt: now,
    run: startCrewRun(hull, from, now, hashu(id)),
    shipKey,
    log: [],
    earned: 0,
    completed: 0,
  };
}

export function claimCrew(crew: Crew, paid: number, now: number): Crew {
  const run = crew.run;
  if (!run) return crew;
  const dest = run.job.to;
  const seed = hashu(`${crew.id}|${now}|${paid}`) >>> 0;
  return { ...crew, run: startCrewRun(crew.hull, dest, now, seed) };
}
