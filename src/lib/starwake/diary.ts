/**
 * Pilot tape. One chronological stamp list so hauls and worlds share a page.
 * Bound to the active save slot — never a global scrapbook.
 */
import type { JobLogEntry, JobStop } from "./types.ts";

export type DiaryWorld = {
  id: string;
  name: string;
  kindLabel: string;
  system: string;
  at: number;
  scanned: boolean;
  surveyed: boolean;
};

export type DiaryStamp = {
  id: string;
  at: number;
  kind: "haul" | "world";
  kicker: string;
  title: string;
  meta: string;
  pay?: number;
  from?: JobStop;
  to?: JobStop;
};

export function diaryTape(jobLog: JobLogEntry[], worlds: DiaryWorld[]): DiaryStamp[] {
  const rows: DiaryStamp[] = [];
  for (const j of jobLog) {
    rows.push({
      id: `haul-${j.id}-${j.at}`,
      at: j.at || 0,
      kind: "haul",
      kicker: "Haul",
      title: j.cargo,
      meta: `${j.qty}u`,
      pay: j.pay,
      from: j.from,
      to: j.to,
    });
  }
  for (const w of worlds) {
    rows.push({
      id: `world-${w.id}`,
      at: w.at || 0,
      kind: "world",
      kicker: w.surveyed ? "Survey" : w.scanned ? "Scan" : "Arrive",
      title: w.name,
      meta: `${w.system} · ${w.kindLabel}`,
    });
  }
  return rows.sort((a, b) => b.at - a.at || a.title.localeCompare(b.title));
}

export function stampWhen(at: number) {
  if (!at) return "—";
  return new Date(at).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
