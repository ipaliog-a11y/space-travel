import { useEffect, useState } from "react";
import { fittedShip, refuelQuote } from "@/lib/starwake/catalog";
import { hubBoard } from "@/lib/starwake/job-hub";
import { formatHaul, formatStop, holdUsed, jobFits, jobIsRetired, jobPayout } from "@/lib/starwake/jobs";
import { getPlanet, getStation, getSystem } from "@/lib/starwake/galaxy";
import { STATION_KIND_BLURB, STATION_KIND_LABEL } from "@/lib/starwake/stations";
import { useStarwake } from "@/lib/starwake/store";
import type { CargoJob } from "@/lib/starwake/types";
import {
  buyFuel,
  loadRepairStatus,
  payJobDelivery,
  repairCurrentHull,
  type WearSnapshot,
} from "@/lib/hangar/api";
import { HARDPOINT_TIER_NAMES } from "@/lib/hangar/types";
import type { HardpointTier } from "@/lib/ship-ownership/types";

type Props = {
  stationId: string;
  systemId: string;
  onUndock: () => void;
  onRefuel: () => void;
  onHullRepaired?: (wear: WearSnapshot) => void;
};

export function StationBay({ stationId, systemId, onUndock, onRefuel, onHullRepaired }: Props) {
  const stn = getStation(systemId, stationId);
  const planet = stn ? getPlanet(systemId, stn.planetId) : null;
  const sys = getSystem(systemId);
  const shipId = useStarwake((s) => s.shipId);
  const loadout = useStarwake((s) => s.loadout);
  const fuel = useStarwake((s) => s.fuel[s.shipId]);
  const fuel2 = useStarwake((s) => s.fuel2[s.shipId]);
  const retired = useStarwake((s) => s.retiredJobs);
  const board = hubBoard(useStarwake((s) => s.board), systemId, stationId).filter(
    (j) => !jobIsRetired(j, retired),
  );
  const man = useStarwake((s) => s.manifests[s.shipId]);
  const acceptJob = useStarwake((s) => s.acceptJob);
  const refreshHubBoard = useStarwake((s) => s.refreshHubBoard);
  const loadCargo = useStarwake((s) => s.loadCargo);
  const deliverCargo = useStarwake((s) => s.deliverCargo);
  const dropJob = useStarwake((s) => s.dropJob);
  const fit = fittedShip(shipId, loadout);
  const cap = fit.fuelCap;
  const cap2 = fit.fuelCap2;
  const needT1 = Math.max(0, cap - (fuel ?? 0));
  const needT2 = Math.max(0, cap2 - (fuel2 ?? 0));
  const quote = refuelQuote(needT1, needT2);
  const tanksFull = needT1 < 0.2 && needT2 < 0.2;
  const used = holdUsed(man);
  const hold = fit.cargoCap;
  const canLoad = Boolean(man && !man.loaded && man.job.from.stationId === stationId && man.job.from.systemId === systemId);
  const canDeliver = Boolean(man?.loaded && man.job.to.stationId === stationId && man.job.to.systemId === systemId);
  const [credits, setCredits] = useState<number | null>(null);
  const [repairCost, setRepairCost] = useState(0);
  const [hardpointTier, setHardpointTier] = useState<HardpointTier>("stock");
  const [repairing, setRepairing] = useState(false);
  const [fueling, setFueling] = useState(false);
  const [paying, setPaying] = useState(false);
  const [repairError, setRepairError] = useState<string | null>(null);
  const deliverPay = man ? jobPayout(man.job) : 0;

  useEffect(() => {
    let cancelled = false;
    const apply = () => {
      loadRepairStatus({ data: { shipType: shipId } })
        .then((status) => {
          if (cancelled) return;
          setCredits(status.credits);
          setRepairCost(status.repairCost);
          setHardpointTier(status.hardpointTier);
          setRepairError(null);
        })
        .catch(() => undefined);
    };
    apply();
    const later = window.setTimeout(apply, 800);
    return () => {
      cancelled = true;
      window.clearTimeout(later);
    };
  }, [shipId, stationId]);

  async function onPump() {
    if (tanksFull || fueling) return;
    if (quote.cost > 0 && credits != null && credits < quote.cost) {
      setRepairError(`Need ₡${quote.cost.toLocaleString()} to fill`);
      return;
    }
    setFueling(true);
    setRepairError(null);
    try {
      const result = await buyFuel({ data: { t1: needT1, t2: needT2 } });
      setCredits(result.credits);
      onRefuel();
    } catch (err) {
      setRepairError(err instanceof Error ? err.message : "Refuel failed");
    } finally {
      setFueling(false);
    }
  }

  async function onRepair() {
    if (repairCost <= 0 || repairing) return;
    setRepairing(true);
    setRepairError(null);
    try {
      const status = await repairCurrentHull({ data: { shipType: shipId } });
      setCredits(status.credits);
      setRepairCost(status.repairCost);
      setHardpointTier(status.hardpointTier);
      if (status.wear) onHullRepaired?.(status.wear);
    } catch (err) {
      setRepairError(err instanceof Error ? err.message : "Repair failed");
    } finally {
      setRepairing(false);
    }
  }

  async function onDeliver() {
    if (!man?.loaded || !canDeliver || paying) return;
    setPaying(true);
    setRepairError(null);
    try {
      const result = await payJobDelivery({
        data: {
          job: {
            kind: man.job.kind,
            qty: man.job.qty,
            from: man.job.from,
            to: man.job.to,
          },
        },
      });
      deliverCargo(systemId, stationId, result.paid);
      setCredits(result.credits);
    } catch (err) {
      setRepairError(err instanceof Error ? err.message : "Payout failed");
    } finally {
      setPaying(false);
    }
  }

  if (!stn) return null;

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
        <span>T2 {Math.round(fuel2 ?? 0)}/{Math.round(cap2)}</span>
        <span>Hold {used}/{Math.round(hold)} u</span>
        {credits != null && <span>₡{Math.round(credits).toLocaleString()}</span>}
        <span>HP {HARDPOINT_TIER_NAMES[hardpointTier]}</span>
      </div>
      {repairError && <p className="station-repair-err">{repairError}</p>}
      <div className="station-acts">
        <button
          type="button"
          className="engage ghost"
          onClick={() => void onPump()}
          disabled={fueling || tanksFull || (quote.cost > 0 && credits != null && credits < quote.cost)}
        >
          {tanksFull
            ? "Tanks full"
            : fueling
              ? "Fueling"
              : quote.cost > 0
                ? `Refuel ₡${quote.cost.toLocaleString()}`
                : "Refuel"}
        </button>
        <button
          type="button"
          className="engage ghost"
          onClick={() => void onRepair()}
          disabled={repairing || repairCost <= 0 || (credits != null && credits < repairCost)}
        >
          {repairCost <= 0
            ? "Hull sound"
            : repairing
              ? "Repairing"
              : `Repair ₡${repairCost.toLocaleString()}`}
        </button>
        {canLoad && (
          <button type="button" className="engage" onClick={() => loadCargo(systemId, stationId)}>
            Load
          </button>
        )}
        {canDeliver && (
          <button type="button" className="engage" onClick={() => void onDeliver()} disabled={paying}>
            {paying ? "Paying" : `Deliver ₡${deliverPay.toLocaleString()}`}
          </button>
        )}
        <button type="button" className="engage" onClick={onUndock}>
          Undock
        </button>
      </div>
      <section className="job-board station-board" aria-label="Station board">
        <div className="job-board-head">
          <h2>Board</h2>
          <span>From this lock to another hub.</span>
          {!man && (
            <button type="button" className="job-drop" onClick={refreshHubBoard}>
              Refresh
            </button>
          )}
        </div>
        {man ? (
          <div className="job-card on">
            <span className="job-kind">{man.loaded ? "loaded" : "accepted"} · {man.job.kind}</span>
            <span className="job-title">{man.job.title}</span>
            <span className="job-route">
              {formatStop(man.job.from)} → {formatStop(man.job.to)} · {man.job.qty} u · {formatHaul(man.job)} · ₡{jobPayout(man.job).toLocaleString()}
            </span>
            {!man.loaded && (
              <button type="button" className="job-drop" onClick={dropJob}>Drop</button>
            )}
          </div>
        ) : (
          <div className="job-grid">
            {board.length === 0 ? (
              <p className="bay-caption">No listings. Refresh for a new slate from this lock.</p>
            ) : (
              board.map((job) => (
                <JobCard
                  key={job.id}
                  job={job}
                  fits={jobFits(job, shipId, loadout, man)}
                  onAccept={() => acceptJob(job.id)}
                />
              ))
            )}
          </div>
        )}
      </section>
    </div>
  );
}

function JobCard({ job, fits, onAccept }: { job: CargoJob; fits: boolean; onAccept: () => void }) {
  return (
    <article className={`job-card${fits ? "" : " tight"}`}>
      <span className="job-kind">{job.kind} · {job.qty} u · {formatHaul(job)} · ₡{jobPayout(job).toLocaleString()}</span>
      <span className="job-title">{job.title}</span>
      <span className="job-route">{formatStop(job.from)} → {formatStop(job.to)}</span>
      <button type="button" className="job-take" disabled={!fits} onClick={onAccept}>
        {fits ? "Accept" : "Won't fit"}
      </button>
    </article>
  );
}
