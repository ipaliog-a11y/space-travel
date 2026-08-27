import { useEffect, useState } from "react";
import { planetLog } from "@/lib/starwake/galaxy";
import { useStarwake } from "@/lib/starwake/store";
import { Dossier } from "./Dossier";

type Props = {
  onClose: () => void;
};

export function LogBook({ onClose }: Props) {
  const visits = useStarwake((s) => s.visitedPlanets);
  const scanned = useStarwake((s) => s.scanned);
  const surveys = useStarwake((s) => s.surveys);
  const rows = planetLog(visits, scanned, surveys);
  const [file, setFile] = useState<{ systemId: string; planetId: string } | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== "Escape") return;
      e.preventDefault();
      e.stopPropagation();
      if (file) setFile(null);
      else onClose();
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [file, onClose]);

  return (
    <>
      <div className="map-panel log-panel" data-ui>
        <div className="map-head">
          <div className="log-title">
            <strong>Log</strong>
            <span>{rows.length} world{rows.length === 1 ? "" : "s"}</span>
          </div>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close log">
            ×
          </button>
        </div>
        <div className="map-list log-list">
          {rows.length === 0 ? (
            <p className="log-empty">No entries. Arrive at a planet, then scan from the well to fill the page.</p>
          ) : (
            rows.map((row) => (
              <button
                key={row.id}
                type="button"
                className={`map-row log-row${row.scanned ? "" : " dim"}`}
                disabled={!row.scanned}
                onClick={() => {
                  if (!row.scanned) return;
                  setFile({ systemId: row.systemId, planetId: row.id });
                }}
                title={row.scanned ? "Open scan" : "Scan from the well to unlock"}
              >
                <span className="log-name">
                  {row.name}
                  {row.rings ? <em className="map-port">rings</em> : row.role !== "planet" ? <em className="map-port">{row.role}</em> : null}
                </span>
                <span className="log-meta">
                  {row.system}
                  <span className="map-period">{row.kindLabel}</span>
                </span>
                <span className={`log-flag${row.surveyed ? " on" : row.scanned ? "" : " wait"}`}>
                  {row.surveyed ? "survey" : row.scanned ? "scanned" : "visited"}
                </span>
              </button>
            ))
          )}
        </div>
      </div>
      {file && (
        <Dossier systemId={file.systemId} planetId={file.planetId} onClose={() => setFile(null)} />
      )}
    </>
  );
}
