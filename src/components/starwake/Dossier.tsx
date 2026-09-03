import { AU_UNITS, apoapsisAu, formatPeriodLine, formatProspect, getCatalog, getStation, periapsisAu } from "@/lib/starwake/galaxy";
import { STATION_KIND_LABEL } from "@/lib/starwake/stations";
import { useStarwake } from "@/lib/starwake/store";

type Props = {
  systemId: string;
  planetId: string;
  onClose: () => void;
};

export function Dossier({ systemId, planetId, onClose }: Props) {
  const entry = getCatalog(systemId, planetId);
  const scanned = useStarwake((s) => s.scanned[planetId]);
  const logged = useStarwake((s) => s.surveys[planetId]);
  if (!entry) return null;
  const rgb = entry.color.map((c) => Math.round(c * 255)).join(" ");
  const wild = entry.wild;
  const port = !wild && entry.planet?.stationId ? getStation(systemId, entry.planet.stationId) : null;
  const prospectLine = !wild
    ? null
    : !scanned
      ? "Unknown. Scan from the well."
      : !logged
        ? "Latent. Hold in the well and survey to log research or mining."
        : entry.prospect
          ? formatProspect(entry.prospect)
          : "Logged";
  return (
    <div className="dossier helion-dock" data-ui>
      <button type="button" className="icon-btn" onClick={onClose} aria-label="Close">
        ×
      </button>
      <h3>{entry.name}</h3>
      <p className="kind">{entry.kindLabel}{entry.parentName ? ` · ${entry.parentName}` : ""}{wild ? " · wild" : " · port"}</p>
      <div className="dossier-body">
        <div className="dossier-lead">
          <div
            className={`dossier-orb${entry.rings ? " ringed" : ""}`}
            style={{ backgroundColor: `rgb(${rgb})` }}
            aria-hidden="true"
          />
          <div className="dossier-lead-copy">
            <p className="dossier-k">{wild ? "Prospect" : "Port"}</p>
            <p className="dossier-v">
              {wild ? prospectLine : port ? `${port.name} · ${STATION_KIND_LABEL[port.kind]}` : "Orbital lock"}
            </p>
            {wild && logged && entry.prospect && (
              <p className="dossier-note">{entry.prospect.note}</p>
            )}
          </div>
        </div>
        <dl>
          {wild && (
            <div className="wide">
              <dt>Port</dt>
              <dd>None · orbital survey only</dd>
            </div>
          )}
          {entry.radiusKm != null && <div><dt>Radius</dt><dd>{entry.radiusKm.toLocaleString()} km</dd></div>}
          {entry.massEarth != null && <div><dt>Mass</dt><dd>{entry.massEarth} M⊕</dd></div>}
          {entry.gravityG != null && <div><dt>Gravity</dt><dd>{entry.gravityG} g</dd></div>}
          {entry.au != null && <div><dt>Orbit</dt><dd>{entry.au} AU</dd></div>}
          {entry.yearDays != null && (
            <div className="wide">
              <dt>Period</dt>
              <dd>{formatPeriodLine({ yearDays: entry.yearDays, ecc: entry.ecc ?? 0 }, "long")}</dd>
            </div>
          )}
          {entry.planet && (
            <>
              <div><dt>Peri</dt><dd>{periapsisAu(entry.planet)} AU</dd></div>
              <div><dt>Apo</dt><dd>{apoapsisAu(entry.planet)} AU</dd></div>
            </>
          )}
          {entry.comet && (
            <>
              <div><dt>Peri</dt><dd>{periapsisAu(entry.comet)} AU</dd></div>
              <div><dt>Apo</dt><dd>{apoapsisAu(entry.comet)} AU</dd></div>
            </>
          )}
          {entry.dayHours != null && <div><dt>Day</dt><dd>{entry.dayHours} h</dd></div>}
          {entry.inc != null && <div><dt>Incl</dt><dd>{(entry.inc * 180 / Math.PI).toFixed(1)}°</dd></div>}
          {entry.atmosphere && <div><dt>Atmo</dt><dd>{entry.atmosphere}</dd></div>}
          {entry.composition && <div><dt>Make</dt><dd>{entry.composition}</dd></div>}
          {entry.climate && <div className="wide"><dt>Climate</dt><dd>{entry.climate}</dd></div>}
          {entry.belt && (
            <div className="wide">
              <dt>Lane</dt>
              <dd>{(entry.belt.inner / AU_UNITS).toFixed(2)}–{(entry.belt.outer / AU_UNITS).toFixed(2)} AU</dd>
            </div>
          )}
        </dl>
      </div>
    </div>
  );
}