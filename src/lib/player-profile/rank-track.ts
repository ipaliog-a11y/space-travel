/**
 * Rank progress track — layout math and the UI rank list.
 *
 * To add or reorder ranks, edit `PILOT_RANKS` in `ranks.ts` (name, XP, bays, band).
 * This file maps that ladder into track nodes. Do not duplicate XP numbers here.
 * Rewards are derived: a new hangar bay when `bays` steps up.
 */
import { PILOT_RANKS, type RankBand } from "./ranks.ts";

export type TrackReward = {
  id: string;
  icon: string;
  label: string;
};

export type TrackRank = {
  id: string;
  name: string;
  tier: number;
  xpRequired: number;
  icon: string;
  reward?: TrackReward;
  /** CSS color token, not a raw hex. */
  color: string;
  band: RankBand;
  note: string;
};

export type RankProgress = {
  currentXp: number;
  currentRankId: string;
};

export type LaidNode = TrackRank & { index: number; x: number };

export type RankSpan = {
  index: number;
  t: number;
};

const BAND_COLOR: Record<RankBand, string> = {
  wake: "var(--color-helion-dim)",
  licensed: "var(--color-helion-ivory)",
  master: "var(--color-helion-teal)",
  legend: "var(--color-helion-ivory)",
};

const PAD = 88;
const BASE_STEP = 156;
const STEP_GROW = 6;

export const TRACK_PAD = PAD;

export function clamp01(n: number): number {
  if (n <= 0) return 0;
  if (n >= 1) return 1;
  return n;
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** Map the Decision #003 ladder into track nodes. */
export function toTrackRanks(ladder = PILOT_RANKS): TrackRank[] {
  return ladder.map((rank, i) => {
    const prev = ladder[i - 1];
    const bayUnlock = !prev || rank.bays > prev.bays;
    const iconN = ((rank.tier - 1) % 20) + 1;
    return {
      id: `rank-${rank.tier}`,
      name: rank.name,
      tier: rank.tier,
      xpRequired: rank.xp,
      icon: `pilot-${String(iconN).padStart(2, "0")}`,
      color: BAND_COLOR[rank.band],
      band: rank.band,
      note: rank.note,
      reward: bayUnlock
        ? {
            id: `bay-${rank.bays}`,
            icon: "bay",
            label: `${rank.bays} bay${rank.bays === 1 ? "" : "s"}`,
          }
        : undefined,
    };
  });
}

export const TRACK_RANKS: TrackRank[] = toTrackRanks();

export function getRankForXp(xp: number, ranks: TrackRank[] = TRACK_RANKS): TrackRank {
  const n = Math.max(0, xp);
  let current = ranks[0] ?? {
    id: "rank-1",
    name: "Wake",
    tier: 1,
    xpRequired: 0,
    icon: "pilot-01",
    color: BAND_COLOR.wake,
    band: "wake" as RankBand,
    note: "",
  };
  for (const rank of ranks) {
    if (n >= rank.xpRequired) current = rank;
    else break;
  }
  return current;
}

/** Linear t between the current rank node and the next. Clamped 0–1. */
export function getProgressBetween(xp: number, ranks: TrackRank[] = TRACK_RANKS): RankSpan {
  if (ranks.length === 0) return { index: 0, t: 0 };
  let index = 0;
  const n = Math.max(0, xp);
  for (let i = 0; i < ranks.length; i++) {
    if (n >= ranks[i].xpRequired) index = i;
    else break;
  }
  const cur = ranks[index];
  const next = ranks[index + 1];
  if (!next) return { index, t: 1 };
  const span = next.xpRequired - cur.xpRequired;
  if (span <= 0) return { index, t: 1 };
  return { index, t: clamp01((n - cur.xpRequired) / span) };
}

export function layoutNodes(ranks: TrackRank[] = TRACK_RANKS): LaidNode[] {
  let x = PAD;
  return ranks.map((rank, index) => {
    const node = { ...rank, index, x };
    x += BASE_STEP + index * STEP_GROW;
    return node;
  });
}

export function trackWidth(nodes: LaidNode[]): number {
  const last = nodes[nodes.length - 1];
  return (last?.x ?? 0) + PAD;
}

export function markerX(span: RankSpan, nodes: LaidNode[]): number {
  const a = nodes[span.index];
  if (!a) return PAD;
  const b = nodes[span.index + 1] ?? a;
  return lerp(a.x, b.x, span.t);
}

export function xpIntoNext(
  xp: number,
  ranks: TrackRank[] = TRACK_RANKS,
): { rank: TrackRank; next: TrackRank | null; have: number; need: number } {
  const rank = getRankForXp(xp, ranks);
  const i = ranks.findIndex((r) => r.id === rank.id);
  const next = i >= 0 ? (ranks[i + 1] ?? null) : null;
  const have = Math.max(0, xp - rank.xpRequired);
  const need = next ? next.xpRequired - rank.xpRequired : 0;
  return { rank, next, have, need };
}
