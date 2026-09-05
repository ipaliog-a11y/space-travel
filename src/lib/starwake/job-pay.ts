import type { CargoJob, JobKind } from "./types.ts";

/** Credits per cargo unit per AU (local) or per ly (jump, weighted). */
export const PAY_PER_UNIT_AU: Record<JobKind, number> = {
  courier: 220,
  hauler: 38,
  tender: 55,
  tug: 70,
  extractor: 72,
};

/** One jump-ly pays like this many AU of local haul. */
export const JUMP_LY_AS_AU = 0.3;
const PAY_MIN = 1;
const PAY_MAX = 50000;

export type JobSpan = { au: number; ly: number };

export function haulAu(span: JobSpan): number {
  return Math.max(0, span.au) + Math.max(0, span.ly) * JUMP_LY_AS_AU;
}

/** Pay ∝ cargo mass × haul distance. No ₡1,000 floor flattening local runs. */
export function jobPayoutFor(job: Pick<CargoJob, "kind" | "qty">, span: JobSpan | number = 0): number {
  const kind = PAY_PER_UNIT_AU[job.kind] ?? PAY_PER_UNIT_AU.courier;
  const qty = Math.max(1, Math.min(80, Math.round(job.qty) || 1));
  const dist = typeof span === "number" ? Math.max(0, span) : haulAu(span);
  const raw = qty * dist * kind;
  return Math.max(PAY_MIN, Math.min(PAY_MAX, Math.round(raw)));
}
