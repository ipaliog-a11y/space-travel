/**
 * Crew skill lines — research table, not wired into hire / collect yet.
 *
 * Shape: three short lines per hull (Courier / Hauler), three nodes each.
 * Not a node graph. Spend **marks** (1 per collected haul). Dismiss burns them.
 * Edit this list to add or rename skills. `applyCrewMods` is the only consumer
 * the sim should call once approved.
 */
import { CREW_CUT, CREW_UPKEEP, type CrewHull } from "./fleet.ts";

export type CrewLineId = "packet" | "wake" | "quiet" | "hold" | "pad" | "care";

export type CrewSkillMod = {
  /** Multiply run duration. 0.9 = ten percent faster. */
  runSec?: number;
  /** Add to upkeep (negative is cheaper). */
  upkeep?: number;
  /** Add to CREW_CUT (0.05 = +5 points). */
  cut?: number;
  /** Multiply job qty. */
  qty?: number;
  /** Weight toward jump packets vs local. */
  jumpBias?: number;
  /** Future interdiction: 0.7 = thirty percent fewer hits. */
  risk?: number;
  /** Future: multiply wear on the assigned hull. */
  wear?: number;
};

export type CrewSkill = {
  id: string;
  hull: CrewHull;
  line: CrewLineId;
  /** 1 is the root of the line. Must own tier-1 to take 2, and 2 to take 3. */
  tier: 1 | 2 | 3;
  name: string;
  marks: number;
  note: string;
  mod: CrewSkillMod;
};

export type CrewMods = {
  runSec: number;
  upkeep: number;
  cut: number;
  qty: number;
  jumpBias: number;
  risk: number;
  wear: number;
};

/** Cap spent marks so a crew finishes one line and dips another — not all nine. */
export const CREW_MARK_CAP = 8;

export const CREW_SKILLS: CrewSkill[] = [
  // Courier — Packet (speed), Wake (jump work), Quiet (risk)
  { id: "packet-1", hull: "courier", line: "packet", tier: 1, name: "Timetable", marks: 1, note: "Knows the local clock. Shorter hops.", mod: { runSec: 0.92 } },
  { id: "packet-2", hull: "courier", line: "packet", tier: 2, name: "Relay", marks: 2, note: "Stacks pads. Cheaper to keep on the line.", mod: { runSec: 0.88, upkeep: -12 } },
  { id: "packet-3", hull: "courier", line: "packet", tier: 3, name: "Clock", marks: 3, note: "Same-day film. The fast ticket.", mod: { runSec: 0.8 } },
  { id: "wake-1", hull: "courier", line: "wake", tier: 1, name: "Hop", marks: 1, note: "Takes jump packets first. A little slower.", mod: { jumpBias: 0.35, runSec: 1.04 } },
  { id: "wake-2", hull: "courier", line: "wake", tier: 2, name: "Corridor", marks: 2, note: "Better cut on the long ticket.", mod: { jumpBias: 0.55, cut: 0.04 } },
  { id: "wake-3", hull: "courier", line: "wake", tier: 3, name: "Long ticket", marks: 3, note: "Lives on the FSD. Cut stays up.", mod: { jumpBias: 0.8, cut: 0.06 } },
  { id: "quiet-1", hull: "courier", line: "quiet", tier: 1, name: "Dark", marks: 1, note: "Runs lights-out. Fewer stops that go wrong.", mod: { risk: 0.85 } },
  { id: "quiet-2", hull: "courier", line: "quiet", tier: 2, name: "Film", marks: 2, note: "Safer, slightly thinner cut.", mod: { risk: 0.7, cut: -0.03 } },
  { id: "quiet-3", hull: "courier", line: "quiet", tier: 3, name: "Ghost", marks: 3, note: "Hard to find. Hard to tax.", mod: { risk: 0.5 } },

  // Hauler — Hold (mass), Pad (turnaround), Care (hull)
  { id: "hold-1", hull: "hauler", line: "hold", tier: 1, name: "Bin", marks: 1, note: "Packs a little more per lock.", mod: { qty: 1.12 } },
  { id: "hold-2", hull: "hauler", line: "hold", tier: 2, name: "Brick", marks: 2, note: "Fat holds. A bit slower to spool.", mod: { qty: 1.25, runSec: 1.06 } },
  { id: "hold-3", hull: "hauler", line: "hold", tier: 3, name: "Mass", marks: 3, note: "The brick that fills a pad.", mod: { qty: 1.4, runSec: 1.1 } },
  { id: "pad-1", hull: "hauler", line: "pad", tier: 1, name: "Lock", marks: 1, note: "Knows the clamps. Faster turnaround.", mod: { runSec: 0.9 } },
  { id: "pad-2", hull: "hauler", line: "pad", tier: 2, name: "Turn", marks: 2, note: "In and out. Upkeep dips.", mod: { runSec: 0.84, upkeep: -18 } },
  { id: "pad-3", hull: "hauler", line: "pad", tier: 3, name: "Same-day", marks: 3, note: "The pad crew. Fast mass.", mod: { runSec: 0.76 } },
  { id: "care-1", hull: "hauler", line: "care", tier: 1, name: "Gentle", marks: 1, note: "Hands on the brick. Less wear.", mod: { wear: 0.88 } },
  { id: "care-2", hull: "hauler", line: "care", tier: 2, name: "Hands", marks: 2, note: "Keeps the spare flying.", mod: { wear: 0.78, upkeep: -10 } },
  { id: "care-3", hull: "hauler", line: "care", tier: 3, name: "Kept", marks: 3, note: "The hull lasts. The line holds.", mod: { wear: 0.65 } },
];

const IDENTITY: CrewMods = {
  runSec: 1,
  upkeep: 0,
  cut: 0,
  qty: 1,
  jumpBias: 0,
  risk: 1,
  wear: 1,
};

export function skillsForHull(hull: CrewHull): CrewSkill[] {
  return CREW_SKILLS.filter((s) => s.hull === hull);
}

export function skillById(id: string): CrewSkill | undefined {
  return CREW_SKILLS.find((s) => s.id === id);
}

export function marksSpent(owned: readonly string[]): number {
  let n = 0;
  for (const id of owned) {
    const s = skillById(id);
    if (s) n += s.marks;
  }
  return n;
}

export function marksFree(completed: number, owned: readonly string[]): number {
  return Math.max(0, Math.min(CREW_MARK_CAP, Math.max(0, completed)) - marksSpent(owned));
}

export function sanitizeOwned(raw: unknown, hull: CrewHull): string[] {
  if (!Array.isArray(raw)) return [];
  const allowed = new Set(skillsForHull(hull).map((s) => s.id));
  const out: string[] = [];
  for (const id of raw) {
    if (typeof id !== "string" || !allowed.has(id) || out.includes(id)) continue;
    out.push(id);
  }
  return out;
}

export function lineOwned(owned: readonly string[], line: CrewLineId): number {
  let max = 0;
  for (const id of owned) {
    const s = skillById(id);
    if (s?.line === line) max = Math.max(max, s.tier);
  }
  return max;
}

export function canTake(
  skill: CrewSkill,
  owned: readonly string[],
  completed: number,
  hull: CrewHull,
): boolean {
  if (skill.hull !== hull) return false;
  if (owned.includes(skill.id)) return false;
  if (skill.tier > 1 && lineOwned(owned, skill.line) < skill.tier - 1) return false;
  const next = [...owned, skill.id];
  if (marksSpent(next) > CREW_MARK_CAP) return false;
  return marksFree(completed, owned) >= skill.marks;
}

export function applyCrewMods(owned: readonly string[], hull: CrewHull): CrewMods {
  const out: CrewMods = { ...IDENTITY };
  for (const id of owned) {
    const s = skillById(id);
    if (!s || s.hull !== hull) continue;
    if (s.mod.runSec != null) out.runSec *= s.mod.runSec;
    if (s.mod.upkeep != null) out.upkeep += s.mod.upkeep;
    if (s.mod.cut != null) out.cut += s.mod.cut;
    if (s.mod.qty != null) out.qty *= s.mod.qty;
    if (s.mod.jumpBias != null) out.jumpBias = Math.max(out.jumpBias, s.mod.jumpBias);
    if (s.mod.risk != null) out.risk *= s.mod.risk;
    if (s.mod.wear != null) out.wear *= s.mod.wear;
  }
  return out;
}

export function crewCutWithSkills(owned: readonly string[], hull: CrewHull): number {
  return Math.min(0.62, Math.max(0.28, CREW_CUT + applyCrewMods(owned, hull).cut));
}

export function crewUpkeepWithSkills(owned: readonly string[], hull: CrewHull): number {
  return Math.max(20, CREW_UPKEEP[hull] + applyCrewMods(owned, hull).upkeep);
}

export function crewRunSecWithSkills(baseSec: number, owned: readonly string[], hull: CrewHull): number {
  const sec = baseSec * applyCrewMods(owned, hull).runSec;
  return Math.max(24, Math.round(sec));
}
