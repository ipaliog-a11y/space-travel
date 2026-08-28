import type { CargoJob, JobStop } from "./types";

/** True when the haul starts at this hub and ends somewhere else. */
export function jobLeavesHub(
  from: JobStop,
  to: JobStop,
  systemId: string,
  stationId: string,
): boolean {
  if (from.systemId !== systemId || from.stationId !== stationId) return false;
  return to.systemId !== systemId || to.stationId !== stationId;
}

export function hubBoard(board: CargoJob[], systemId: string, stationId: string): CargoJob[] {
  return board.filter((j) => jobLeavesHub(j.from, j.to, systemId, stationId));
}
