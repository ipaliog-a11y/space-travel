import type { GoodId } from "./market.ts";

export type TapeMove = { goodId: GoodId; unit: number; delta: number };

export function tapeMovers(rows: TapeMove[], n = 4): { up: TapeMove[]; down: TapeMove[] } {
  const take = Math.max(1, Math.round(n));
  const up = rows.filter((r) => r.delta > 0).sort((a, b) => b.delta - a.delta || a.goodId.localeCompare(b.goodId)).slice(0, take);
  const down = rows.filter((r) => r.delta < 0).sort((a, b) => a.delta - b.delta || a.goodId.localeCompare(b.goodId)).slice(0, take);
  return { up, down };
}

export type WaitCall = "hold" | "dump" | "flat";

/** Rising tape: sit. Falling tape: dock where it lists. Qty 0 is flat. */
export function waitOrDump(delta: number, qty: number): WaitCall {
  if (qty <= 0) return "flat";
  if (delta > 0) return "hold";
  if (delta < 0) return "dump";
  return "flat";
}

export type HopHub = {
  systemId: string;
  stationId: string;
  system: string;
  station: string;
  key: string;
};

export type ListedHop = HopHub & { ly: number };

export function nearestListed(hubs: HopHub[], fromSystemId: string, lyOf: (from: string, to: string) => number): ListedHop[] {
  const from = fromSystemId || "";
  return hubs
    .map((h) => ({ ...h, ly: h.systemId === from ? 0 : lyOf(from, h.systemId) }))
    .sort((a, b) => a.ly - b.ly || a.station.localeCompare(b.station));
}

export function waitDumpHint(call: WaitCall, hop: ListedHop | null): string {
  if (call === "hold") return "Tape is up. Sit it.";
  if (call === "dump") {
    if (!hop) return "Tape is down. No lock lists it.";
    if (hop.ly < 0.05) return `Tape is down. This system lists it — ${hop.station}.`;
    return `Tape is down. Dump at ${hop.station} · ${hop.ly.toFixed(1)} ly.`;
  }
  return "Tape is flat.";
}
