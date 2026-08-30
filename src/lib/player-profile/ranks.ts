/**
 * Pilot ranks — research table for Decision #003.
 *
 * Live game today: `players.current_rank` is a number (1–15). Hangar bays
 * unlock from it. XP is stored. Nothing awards XP, and nothing promotes.
 * This module is the proposed ladder — not wired into `addXp` until approved.
 */

export type RankBand = "wake" | "licensed" | "master" | "legend";

export type PilotRank = {
  tier: number;
  name: string;
  /** Cumulative XP to *enter* this rank. */
  xp: number;
  bays: number;
  band: RankBand;
  note: string;
};

/**
 * Odd ranks 3…15 add a hangar bay (Decision #003). Rank 1–2 stay one bay.
 * XP is a playable curve, not the Week 7 stub (rank 15 at 500k).
 *
 * Pacing assumption: a typical courier is ~40 XP. Rank 3 (~25 jobs) lands
 * near used-hull money. Rank 5 (~100 jobs) is the third bay. Rank 15 is
 * a long cap, not an Elite-Dangerous-length grind.
 */
export const PILOT_RANKS: PilotRank[] = [
  { tier: 1, name: "Wake", xp: 0, bays: 1, band: "wake", note: "New ticket. One bay. Helios." },
  { tier: 2, name: "Runner", xp: 350, bays: 1, band: "wake", note: "Local loops. Still one hull." },
  { tier: 3, name: "Pilot", xp: 1_000, bays: 2, band: "licensed", note: "Second bay. Used hull is the treadmill." },
  { tier: 4, name: "Freighter", xp: 2_200, bays: 2, band: "licensed", note: "Hold work. Jump packets start to count." },
  { tier: 5, name: "Navigator", xp: 4_000, bays: 3, band: "licensed", note: "Third bay. Old ace-icon gate." },
  { tier: 6, name: "Skipper", xp: 6_800, bays: 3, band: "licensed", note: "Small command. Route memory." },
  { tier: 7, name: "Captain", xp: 11_000, bays: 4, band: "master", note: "Fourth bay. Name on the pad." },
  { tier: 8, name: "Master", xp: 17_000, bays: 4, band: "master", note: "Master mariner. Wear is a budget." },
  { tier: 9, name: "Broker", xp: 26_000, bays: 5, band: "master", note: "Fifth bay. Tape and jobs both pay." },
  { tier: 10, name: "Pathfinder", xp: 38_000, bays: 5, band: "master", note: "Deep routes. Old veteran-icon gate." },
  { tier: 11, name: "Warden", xp: 54_000, bays: 6, band: "legend", note: "Sixth bay. System regular." },
  { tier: 12, name: "Consul", xp: 74_000, bays: 6, band: "legend", note: "Station weight. Reputation later." },
  { tier: 13, name: "Marshal", xp: 100_000, bays: 7, band: "legend", note: "Seventh bay." },
  { tier: 14, name: "Luminary", xp: 135_000, bays: 7, band: "legend", note: "Known wake. One bay left." },
  { tier: 15, name: "Starwake", xp: 180_000, bays: 8, band: "legend", note: "Cap. Eight bays. Bonus slots still purchased." },
];

export const MAX_RANK = 15;

export function rankFromXp(totalXp: number): PilotRank {
  const xp = Math.max(0, totalXp);
  let current = PILOT_RANKS[0];
  for (const rank of PILOT_RANKS) {
    if (xp >= rank.xp) current = rank;
    else break;
  }
  return current;
}

export function rankByTier(tier: number): PilotRank {
  const clamped = Math.min(MAX_RANK, Math.max(1, Math.round(tier)));
  return PILOT_RANKS[clamped - 1];
}

export function xpIntoRank(totalXp: number): { rank: PilotRank; next: PilotRank | null; have: number; need: number } {
  const rank = rankFromXp(totalXp);
  const next = rank.tier >= MAX_RANK ? null : PILOT_RANKS[rank.tier];
  const have = Math.max(0, totalXp - rank.xp);
  const need = next ? next.xp - rank.xp : 0;
  return { rank, next, have, need };
}

/** Jobs at `xpPerJob` to enter `tier`. Rank 1 is zero. */
export function jobsToTier(tier: number, xpPerJob = 40): number {
  const rank = rankByTier(tier);
  if (rank.xp <= 0) return 0;
  return Math.ceil(rank.xp / Math.max(1, xpPerJob));
}
