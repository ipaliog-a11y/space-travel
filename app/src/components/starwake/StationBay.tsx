import { fittedShip } from "@/lib/starwake/catalog";
import { formatStop, holdUsed, jobFits } from "@/lib/starwake/jobs";
import { getPlanet, getStation, getSystem } from "@/lib/starwake/galaxy";
import { STATION_KIND_BLURB, STATION_KIND_LABEL } from "@/lib/starwake/stations";
import { useStarwake } from "@/lib/starwake/store";
import type { CargoJob } from "@/lib/starwake/types";

type Props = {
  stationId: string;
  systemId: string;
  onUndock: () => void;
  onRefuel: () => void;
};

export function StationBay({ stationId, systemId, onUndock, onRefuel }: Props) {
  const stn = getStation(systemId, stationId);
  const planet = stn ? getPlanet(systemId, stn.planetId) : null;
  const sys = getSystem(systemId);
  const shipId = useStarwake((s) => s.shipId);
  const loadout = useStarwake((s) => s.loadout);
  const fuel = useStarwake((s) => s.fuel[s.shipId]);
  const board = useStarwake((s) => s.board);
  const man = useStarwake((s) => s.manifests[s.shipId]);
  const acceptJob = useStarwake((s) => s.acceptJob);
  const loadCargo = useStarwake((s) => s.loadCargo);
  const deliverCargo = useStarwake((s) => s.deliverCargo);
  const dropJob = useStarwake((s) => s.dropJob);
  const cap = fittedShip(shipId, loadout).fuelCap;
  const used = holdUsed(man);
  const hold = fittedShip(shipId, loadout).cargoCap;
  if (!stn) return null;
  const canLoad = Boolean(man && !man.loaded && man.job.from.stationId === stationId && man.job.from.systemId === systemId);
  const canDeliver = Boolean(man?.loaded && man.job.to.stationId === stationId && man.job.to.systemId === systemId);

  return (
    <div className="station-bay" data-ui>
      <header className="station-head">
        <h2>{stn.name}</h2>
        <p>
          {planet?.name ?? sys.name} · {STATION_KIND_LABEL[stn.kind]}
        </p>
        <p>{STATION_KIND_BLURB[stn.kind]}</p>
      </header>
      <div className="station-stats">
        <span>T1 {Math.round(fuel)}/{Math.round(cap)}</span>
        <span>Hold {used}/{Math.round(hold)} u</span>
      </div>
      <div className="station-acts">
        <button type="button" className="engage ghost" onClick={onRefuel} disabled={fuel >= cap - 0.2}>
          Refuel
        </button>
        {canLoad && (
          <button type="button" className="engage" onClick={() => loadCargo(systemId, stationId)}>
            Load
          </button>
        )}
        {canDeliver && (
          <button type="button" className="engage" onClick={() => deliverCargo(systemId, stationId)}>
            Deliver
          </button>
        )}
        <button type="button" className="engage" onClick={onUndock}>
          Undock
        </button>
      </div>
      <section className="job-board station-board" aria-label="Station board">
        <div className="job-board-head">
          <h2>Board</h2>
          <span>Hauls run lock to lock.</span>
        </div>
        {man ? (
          <div className="job-card on">
            <span className="job-kind">{man.loaded ? "loaded" : "accepted"} · {man.job.kind}</span>
            <span className="job-title">{man.job.title}</span>
            <span className="job-route">
              {formatStop(man.job.from)} → {formatStop(man.job.to)} · {man.job.qty} u
            </span>
            {!man.loaded && (
              <button type="button" className="job-drop" onClick={dropJob}>Drop</button>
            )}
          </div>
        ) : (
          <div className="job-grid">
            {board.map((job) => (
              <JobCard
                key={job.id}
                job={job}
                fits={jobFits(job, shipId, loadout, man)}
                onAccept={() => acceptJob(job.id)}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function JobCard({ job, fits, onAccept }: { job: CargoJob; fits: boolean; onAccept: () => void }) {
  return (
    <article className={`job-card${fits ? "" : " tight"}`}>
      <span className="job-kind">{job.kind} · {job.qty} u</span>
      <span className="job-title">{job.title}</span>
      <span className="job-route">{formatStop(job.from)} → {formatStop(job.to)}</span>
      <button type="button" className="job-take" disabled={!fits} onClick={onAccept}>
        {fits ? "Accept" : "Won't fit"}
      </button>
    </article>
  );
}
