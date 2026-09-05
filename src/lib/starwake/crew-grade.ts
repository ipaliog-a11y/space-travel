/**
 * Crew experience — not a skill tree.
 *
 * Green crews take short cheap jobs, rest as long as the hop they just flew,
 * and cannot hold a pirate. XP is +1 per collected haul. Stats ease up the ladder.
 */
export type CrewGradeId = "green" | "local" | "line" | "hand" | "keeper";

export type CrewGrade = {
  id: CrewGradeId;
  name: string;
  /** Inclusive XP to enter this grade. */
  xp: number;
  /** Same-system cap. Ignored once maxLy > 0 and the job is a jump. */
  maxAu: number;
  /** 0 = no jump packets. */
  maxLy: number;
  qtyMul: number;
  /** Rest duration = last flight × this. 1 = sit the hop again. 0 = turn and go. */
  restMul: number;
  /** Chance a flown packet is stopped. */
  hit: number;
  /** Chance to keep the packet if stopped. 0 = unarmed. */
  evade: number;
  note: string;
};

export const CREW_GRADES: CrewGrade[] = [
  {
    id: "green",
    name: "Green",
    xp: 0,
    maxAu: 2.4,
    maxLy: 0,
    qtyMul: 0.55,
    restMul: 1,
    hit: 0.16,
    evade: 0,
    note: "Local film only. Pad rest equals the hop. No guns.",
  },
  {
    id: "local",
    name: "Local",
    xp: 3,
    maxAu: 8,
    maxLy: 0,
    qtyMul: 0.72,
    restMul: 0.7,
    hit: 0.15,
    evade: 0.18,
    note: "Still in-system. Shorter pad. Can run, barely.",
  },
  {
    id: "line",
    name: "Line",
    xp: 8,
    maxAu: 99,
    maxLy: 6,
    qtyMul: 0.9,
    restMul: 0.4,
    hit: 0.14,
    evade: 0.42,
    note: "Short jumps. Half the pad. Holds some stops.",
  },
  {
    id: "hand",
    name: "Hand",
    xp: 16,
    maxAu: 99,
    maxLy: 18,
    qtyMul: 1,
    restMul: 0.18,
    hit: 0.12,
    evade: 0.65,
    note: "The board opens. Brief pad. Can keep a packet.",
  },
  {
    id: "keeper",
    name: "Keeper",
    xp: 28,
    maxAu: 99,
    maxLy: 80,
    qtyMul: 1.08,
    restMul: 0.05,
    hit: 0.1,
    evade: 0.82,
    note: "Turns around. Hard to take.",
  },
];

export function crewGrade(xp: number): CrewGrade {
  const n = Math.max(0, Math.round(xp));
  let cur = CREW_GRADES[0];
  for (const g of CREW_GRADES) {
    if (n >= g.xp) cur = g;
    else break;
  }
  return cur;
}

export function crewGradeNext(xp: number): CrewGrade | null {
  const cur = crewGrade(xp);
  const i = CREW_GRADES.findIndex((g) => g.id === cur.id);
  return CREW_GRADES[i + 1] ?? null;
}

export function crewRestSec(flightSec: number, xp: number): number {
  const rest = Math.max(0, flightSec) * crewGrade(xp).restMul;
  if (rest < 4) return 0;
  return Math.round(rest);
}

export function crewArms(xp: number): string {
  const e = crewGrade(xp).evade;
  if (e <= 0) return "Unarmed";
  if (e < 0.35) return "Can run";
  if (e < 0.6) return "Holds";
  return "Hard to take";
}

/** Pure pirate roll. hit/evade are 0–1 samples. */
export function resolveCrewPirate(
  xp: number,
  rollHit: number,
  rollEvade: number,
): { hit: boolean; lost: boolean } {
  const g = crewGrade(xp);
  const hit = rollHit < g.hit;
  const lost = hit && rollEvade >= g.evade;
  return { hit, lost };
}

export function crewXpInto(xp: number): { grade: CrewGrade; next: CrewGrade | null; have: number; need: number } {
  const grade = crewGrade(xp);
  const next = crewGradeNext(xp);
  const have = Math.max(0, Math.round(xp) - grade.xp);
  const need = next ? next.xp - grade.xp : 0;
  return { grade, next, have, need };
}
