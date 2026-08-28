import type { CargoJob, JobLogEntry, ShipId } from "./types.ts";

const RETIRED_CAP = 200;
const DIARY_CAP = 40;

/** Stable contract: same cargo, mass, and route. Unique listing ids still change. */
export function jobContractKey(job: Pick<CargoJob, "kind" | "cargo" | "qty" | "from" | "to">): string {
  return `${job.kind}|${job.cargo}|${Math.round(job.qty)}|${job.from.systemId}:${job.from.stationId}|${job.to.systemId}:${job.to.stationId}`;
}

export function retireJob(retired: string[], id: string): string[] {
  if (retired.includes(id)) return retired.slice(-RETIRED_CAP);
  return [...retired, id].slice(-RETIRED_CAP);
}

export function retireContract(retired: string[], job: Pick<CargoJob, "kind" | "cargo" | "qty" | "from" | "to" | "id">): string[] {
  return retireJob(retireJob(retired, job.id), jobContractKey(job));
}

export function jobIsRetired(
  job: Pick<CargoJob, "kind" | "cargo" | "qty" | "from" | "to" | "id">,
  retired: Iterable<string>,
): boolean {
  const skip = retired instanceof Set ? retired : new Set(retired);
  return skip.has(job.id) || skip.has(jobContractKey(job));
}

export function logDelivery(
  diary: JobLogEntry[],
  job: CargoJob,
  pay: number,
  shipId: ShipId,
  at = Date.now(),
): JobLogEntry[] {
  return [
    {
      id: job.id,
      kind: job.kind,
      cargo: job.cargo,
      qty: job.qty,
      from: job.from,
      to: job.to,
      pay,
      at,
      shipId,
    },
    ...diary.filter((row) => row.id !== job.id),
  ].slice(0, DIARY_CAP);
}

export function diaryEarnings(diary: JobLogEntry[]): number {
  return diary.reduce((sum, row) => sum + row.pay, 0);
}

export function sanitizeRetired(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const row of raw) {
    if (typeof row !== "string" || !row || seen.has(row)) continue;
    seen.add(row);
    out.push(row);
    if (out.length >= RETIRED_CAP) break;
  }
  return out;
}
