import { hashu, mulberry32 } from "./math.ts";
import { distLy, GALAXY, getSystem, HOME_SYSTEM_ID, AU_UNITS } from "./galaxy.ts";
import { jobPayout, jobSpan, makeBoard } from "./jobs.ts";
import { crewGrade, crewRestSec, resolveCrewPirate } from "./crew-grade.ts";
import { EXTRACT_SEC, yieldsFor, type YieldSource } from "./mining.ts";
import { goodById } from "./market.ts";
import {
  CREW_CUT,
  crewNetFromPayout,
  type Crew,
  type CrewHull,
  type CrewRun,
} from "./fleet.ts";
import type { CargoJob, JobStop, Planet } from "./types.ts";

const LINE_NAMES = ["Kite", "Latch", "Quill", "Bramble", "Nock", "Sill"];

export function crewGross(job: CargoJob) {
  return Math.max(1, Math.round(jobPayout(job) * CREW_CUT));
}

export function crewNet(job: CargoJob, hull: CrewHull) {
  return crewNetFromPayout(jobPayout(job), hull);
}

export function crewRunSec(job: CargoJob) {
  const span = jobSpan(job);
  const hop = span.ly > 0 ? Math.round(140 + span.ly * 8) : Math.round(80 + span.au * 18);
  if (job.kind !== "extractor") return hop;
  return hop + Math.round(EXTRACT_SEC.extractor * Math.max(2, job.qty));
}

export function originFromSave(systemId: string, stationId?: string | null): JobStop {
  const sys = getSystem(systemId || HOME_SYSTEM_ID);
  const st =
    (stationId && sys.stations.find((s) => s.id === stationId)) || sys.stations[0];
  return { systemId: sys.id, stationId: st?.id ?? "a" };
}

function localPad(from: JobStop): CargoJob {
  const sys = getSystem(from.systemId);
  const to = sys.stations.find((s) => s.id !== from.stationId) ?? sys.stations[0];
  return {
    id: `crew-local-${from.systemId}`,
    kind: "courier",
    title: "Pad film",
    cargo: "nav film",
    qty: 2,
    from,
    to: { systemId: sys.id, stationId: to?.id ?? from.stationId },
  };
}

export function jobFitsCrewXp(job: CargoJob, xp: number): boolean {
  const g = crewGrade(xp);
  const span = jobSpan(job);
  if (span.ly > 0) return span.ly <= g.maxLy;
  return span.au <= g.maxAu;
}

type PullSite = { id: string; name: string; au: number; ly: number; mining: number; good: string; pad: JobStop };

function siteFromPlanet(p: Planet, pad: JobStop, ly: number): PullSite | null {
  if (p.stationId && p.interest !== "wild") return null;
  const mining = p.prospect?.mining ?? (p.interest === "wild" ? 1 : 0);
  if (mining <= 0) return null;
  const src: YieldSource = { id: p.id, role: "planet", kind: p.kind, mining };
  const good = yieldsFor(src).goods[0];
  return {
    id: p.id,
    name: p.name,
    au: Math.max(0.25, p.au || 0.4),
    ly,
    mining,
    good: goodById(good).name,
    pad,
  };
}

function pullSites(from: JobStop, maxLy: number): PullSite[] {
  const here = getSystem(from.systemId);
  const out: PullSite[] = [];
  const systems = [here, ...GALAXY.filter((s) => s.id !== here.id && s.stations.length > 0 && distLy(here, s) <= maxLy + 1e-4)];
  for (const sys of systems) {
    const ly = sys.id === here.id ? 0 : distLy(here, sys);
    const pad: JobStop = {
      systemId: sys.id,
      stationId: (sys.stations[0]?.id ?? from.stationId),
    };
    for (const p of sys.planets) {
      const site = siteFromPlanet(p, pad, ly);
      if (site) out.push(site);
    }
    if (sys.belt?.prospect?.mining) {
      const src: YieldSource = { id: sys.belt.id, role: "belt", icy: sys.belt.icy, mining: sys.belt.prospect.mining };
      out.push({
        id: sys.belt.id,
        name: sys.belt.name,
        au: Math.max(0.8, ((sys.belt.inner + sys.belt.outer) / 2) / AU_UNITS),
        ly,
        mining: sys.belt.prospect.mining,
        good: goodById(yieldsFor(src).goods[0]).name,
        pad,
      });
    }
  }
  return out;
}

export function pickCrewPull(from: JobStop, seed: number, xp = 0): CargoJob {
  const g = crewGrade(xp);
  const rng = mulberry32(hashu(`pull|${from.systemId}|${seed}`) >>> 0);
  const sites = pullSites(from, g.maxLy).filter((s) => {
    if (s.ly > 0) return s.ly <= g.maxLy;
    return s.au * 2 <= g.maxAu;
  });
  const pool = sites.length ? sites : pullSites(from, g.maxLy).sort((a, b) => a.au - b.au).slice(0, 1);
  const site = pool[Math.floor(rng() * pool.length)] ?? {
    id: "well",
    name: "local well",
    au: 0.4,
    ly: 0,
    mining: 1,
    good: "ore",
    pad: from,
  };
  const qty = Math.max(1, Math.round(site.mining * 2 * g.qtyMul));
  const haulAu = site.ly > 0 ? 0 : Math.max(0.4, site.au * 2);
  return {
    id: `crew-pull-${site.id}-${(seed >>> 0).toString(36)}`,
    kind: "extractor",
    title: `Pull · ${site.name}`,
    cargo: site.good,
    qty,
    from,
    to: site.pad,
    haulAu: site.ly > 0 ? undefined : haulAu,
  };
}

export function pickCrewJob(hull: CrewHull, from: JobStop, seed: number, xp = 0): CargoJob {
  if (hull === "extractor") return pickCrewPull(from, seed, xp);
  const g = crewGrade(xp);
  const board = makeBoard(from.systemId, seed >>> 0, from.stationId);
  const match = board.find((j) => j.kind === hull && jobFitsCrewXp(j, xp));
  const fallback = board.find((j) => jobFitsCrewXp(j, xp));
  const raw = match ?? fallback;
  const qtyMul = g.qtyMul;
  if (raw) {
    return {
      ...raw,
      kind: hull,
      qty: Math.max(1, Math.round(raw.qty * qtyMul)),
    };
  }
  const pad = localPad(from);
  return { ...pad, kind: hull, qty: hull === "hauler" ? Math.max(6, Math.round(12 * qtyMul)) : Math.max(1, Math.round(3 * qtyMul)) };
}

export function startCrewRun(hull: CrewHull, from: JobStop, now: number, seed: number, xp = 0): CrewRun {
  const job = pickCrewJob(hull, from, now ^ seed, xp);
  const flightSec = crewRunSec(job);
  return {
    job,
    startedAt: now,
    endsAt: now + flightSec * 1000,
    claimed: false,
    phase: "flight",
    flightSec,
    dest: job.to,
  };
}

export function rollCrewPirate(crew: Crew, now: number) {
  const rng = mulberry32(hashu(`${crew.id}|${crew.run?.endsAt ?? 0}|${now}`) >>> 0);
  return resolveCrewPirate(crew.xp ?? 0, rng(), rng());
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
    run: startCrewRun(hull, from, now, hashu(id), 0),
    shipKey,
    log: [],
    earned: 0,
    completed: 0,
    xp: 0,
  };
}

export function restCrew(crew: Crew, now: number): Crew {
  const run = crew.run;
  const flightSec = run?.flightSec || 80;
  const dest = run?.job?.to ?? run?.dest ?? originFromSave("helion", null);
  const restSec = crewRestSec(flightSec, crew.xp ?? 0);
  if (restSec <= 0) {
    return { ...crew, run: startCrewRun(crew.hull, dest, now, hashu(`${crew.id}|go|${now}`), crew.xp ?? 0) };
  }
  return {
    ...crew,
    run: {
      job: null,
      startedAt: now,
      endsAt: now + restSec * 1000,
      claimed: true,
      phase: "rest",
      flightSec,
      dest,
    },
  };
}

export function launchCrew(crew: Crew, now: number): Crew {
  const from = crew.run?.dest ?? originFromSave("helion", null);
  return { ...crew, run: startCrewRun(crew.hull, from, now, hashu(`${crew.id}|${now}`), crew.xp ?? 0) };
}

export function claimCrew(crew: Crew, _paid: number, now: number): Crew {
  const run = crew.run;
  if (!run || run.phase !== "flight") return crew;
  const xp = (crew.xp ?? 0) + 1;
  return restCrew({ ...crew, xp }, now);
}
