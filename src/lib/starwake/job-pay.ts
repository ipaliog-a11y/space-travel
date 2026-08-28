import type { CargoJob, JobKind } from "./types.ts";

const PAY_KIND: Record<JobKind, { base: number; perUnit: number }> = {
  courier: { base: 700, perUnit: 80 },
  hauler: { base: 400, perUnit: 22 },
  tender: { base: 500, perUnit: 30 },
  tug: { base: 450, perUnit: 40 },
};
const PAY_PER_LY = 90;
const PAY_MIN = 1000;
const PAY_MAX = 4000;

/** Week 1 placeholder. Four typical courier lock-to-lock runs fund Mk I from ₡1,000. */
export function jobPayoutFor(job: Pick<CargoJob, "kind" | "qty">, distanceLy = 0): number {
  const kind = PAY_KIND[job.kind] ?? PAY_KIND.courier;
  const qty = Math.max(1, Math.min(48, Math.round(job.qty) || 1));
  const ly = Math.max(0, Math.min(22, distanceLy));
  const raw = kind.base + kind.perUnit * qty + PAY_PER_LY * ly;
  return Math.max(PAY_MIN, Math.min(PAY_MAX, Math.round(raw)));
}
