/**
 * Helion clip HUD. One pip, one verb, lamps not twin bars.
 * Decision #027.
 */

export type LookVerbId =
  | "abort-dock"
  | "dock"
  | "sip"
  | "abort-extract"
  | "extract"
  | "survey"
  | "file"
  | "scan";

export type LookVerb = { id: LookVerbId; label: string };

export function lookVerb(opts: {
  docking: boolean;
  canDock: boolean;
  canScoop: boolean;
  scooping: boolean;
  extracting: boolean;
  canExtract: boolean;
  gasHarvest: boolean;
  canSurvey: boolean;
  hasBody: boolean;
  known: boolean;
}): LookVerb | null {
  if (opts.docking) return { id: "abort-dock", label: "Abort" };
  if (opts.canDock) return { id: "dock", label: "Dock" };
  if (opts.scooping) return { id: "sip", label: "Sip…" };
  if (opts.canScoop) return { id: "sip", label: "Sip star" };
  if (opts.extracting) return { id: "abort-extract", label: "Abort" };
  if (opts.canExtract) return { id: "extract", label: opts.gasHarvest ? "Scoop" : "Extract" };
  if (opts.canSurvey) return { id: "survey", label: "Survey" };
  if (opts.hasBody) return opts.known ? { id: "file", label: "File" } : { id: "scan", label: "Scan" };
  return null;
}

export function jumpLamp(lock01: number): "off" | "amber" | "teal" {
  if (lock01 >= 0.99) return "teal";
  if (lock01 >= 0.34) return "amber";
  return "off";
}
