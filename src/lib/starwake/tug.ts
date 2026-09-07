/**
 * Helion tug — stranded recovery. Trader, not Fuel Rats.
 * T1 dry: must call. T2 dry only: optional ferry. Credits, never a hull wipe.
 */
import type { StarSystem } from "./types.ts";

export const TUG_FLOOR = 400;
export const TUG_PER_AU = 8;
export const FERRY_FLOOR = 1200;
export const FERRY_CAP = 2500;
export const T2_TOP = 280;
export const SKIP_MULT = 1.5;
export const WAIT_MIN = 8;
export const WAIT_MAX = 20;

export type TugKind = "local" | "ferry" | "stranded";

export type TugPad = {
  systemId: string;
  stationId: string;
  name: string;
  au: number;
  ly: number;
};

export function rankCut(rank: number): number {
  const r = Math.max(1, Math.min(15, Math.round(rank)));
  return Math.max(0.72, 1 - (r - 1) * 0.02);
}

export function tugWaitSec(au: number): number {
  return Math.round(Math.min(WAIT_MAX, WAIT_MIN + Math.max(0, au) * 1.2));
}

export function tugCost(opts: {
  kind: TugKind;
  au: number;
  ly?: number;
  rank: number;
  outpostHere: boolean;
  skip: boolean;
}): number {
  let n =
    opts.kind === "ferry"
      ? Math.min(FERRY_CAP, FERRY_FLOOR + Math.round(Math.max(0, opts.ly ?? 0) * 80))
      : TUG_FLOOR + Math.round(Math.max(0, opts.au) * TUG_PER_AU);
  if (opts.kind === "stranded") n += T2_TOP;
  n = Math.round(n * rankCut(opts.rank));
  if (opts.outpostHere && opts.kind !== "ferry") n = Math.round(n * 0.5);
  if (opts.skip) n = Math.round(n * SKIP_MULT);
  return Math.max(200, n);
}

export function padAu(sys: StarSystem, stationId: string): number {
  const stn = sys.stations.find((s) => s.id === stationId);
  const planet = stn ? sys.planets.find((p) => p.id === stn.planetId) : null;
  return planet?.au ?? 1;
}

export function destPad(opts: {
  here: StarSystem;
  home: StarSystem;
  kind: TugKind;
  nearestId: string | null;
  lastStationId: string | null;
  outpostId: string | null;
}): TugPad {
  const homePad = opts.home.stations[0];
  if (opts.kind === "ferry") {
    const stn =
      (opts.lastStationId && opts.home.stations.find((s) => s.id === opts.lastStationId)) || homePad;
    return {
      systemId: opts.home.id,
      stationId: stn?.id ?? opts.home.id,
      name: stn?.name ?? opts.home.name,
      au: stn ? padAu(opts.home, stn.id) : 0,
      ly: Math.hypot(opts.here.x - opts.home.x, opts.here.y - opts.home.y, (opts.here.z ?? 0) - (opts.home.z ?? 0)),
    };
  }
  const prefer = opts.outpostId && opts.here.stations.some((s) => s.id === opts.outpostId)
    ? opts.outpostId
    : opts.nearestId && opts.here.stations.some((s) => s.id === opts.nearestId)
      ? opts.nearestId
      : opts.lastStationId && opts.here.stations.some((s) => s.id === opts.lastStationId)
        ? opts.lastStationId
        : opts.here.stations[0]?.id;
  const stn = prefer ? opts.here.stations.find((s) => s.id === prefer) : null;
  if (stn) {
    return {
      systemId: opts.here.id,
      stationId: stn.id,
      name: stn.name,
      au: padAu(opts.here, stn.id),
      ly: 0,
    };
  }
  return destPad({ ...opts, kind: "ferry" });
}

type TugListen = (kind: TugKind) => void;
let tugListen: TugListen | null = null;

export function listenTug(fn: TugListen) {
  tugListen = fn;
  return () => {
    if (tugListen === fn) tugListen = null;
  };
}

export function requestTug(kind: TugKind) {
  tugListen?.(kind);
}
