import { useEffect, useState } from "react";
import { fittedShip, refuelQuote } from "@/lib/starwake/catalog";
import { hubBoard } from "@/lib/starwake/job-hub";
import { formatHaul, formatStop, holdUsed, jobFits, jobIsRetired, jobPayout } from "@/lib/starwake/jobs";
import { EMPTY_HOLD, cargoQty, hubKey, lotLabel } from "@/lib/starwake/market";
import { getPlanet, getStation, getSystem } from "@/lib/starwake/galaxy";
import { STATION_KIND_BLURB, STATION_KIND_LABEL } from "@/lib/starwake/stations";
import { useStarwake } from "@/lib/starwake/store";
import type { CargoJob } from "@/lib/starwake/types";
import { buyFuel, buyOutpost, buyOutpostT1, loadRepairStatus, payJobDelivery, repairCurrentHull, type WearSnapshot } from "@/lib/hangar/api";
import { foundOutpost, isOwnLock, OUTPOST_CAP, OUTPOST_COST, T1_CAP, T1_COST } from "@/lib/starwake/outpost";
import { HelionConfirm } from "./HelionConfirm";
import { HARDPOINT_TIER_NAMES } from "@/lib/hangar/types";
import type { HardpointTier } from "@/lib/ship-ownership/types";
import { MarketWatch } from "./MarketWatch";

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
  const cargo = useStarwake((s) => s.cargo[s.shipId] ?? EMPTY_HOLD);
  const ware = useStarwake((s) => s.warehouses[hubKey(systemId, stationId)] ?? EMPTY_HOLD);
  const outpost = useStarwake((s) => s.outpost);
  const own = isOwnLock(stationId, outpost);
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
  const used = holdUsed(man, cargo);
  const hold = fit.cargoCap;
  const canLoad = Boolean(
    man &&
      !man.loaded &&
      man.job.from.stationId === stationId &&
      man.job.from.systemId === systemId &&
      man.job.qty + used <= hold,
  );
  const canDeliver = Boolean(man?.loaded && man.job.to.stationId === stationId && man.job.to.systemId === systemId);
  const [credits, setCredits] = useState<number | null>(null);
  const [repairCost, setRepairCost] = useState(0);
  const [hardpointTier, setHardpointTier] = useState<HardpointTier>("stock");
  const [repairing, setRepairing] = useState(false);
  const [fueling, setFueling] = useState(false);
  const [paying, setPaying] = useState(false);
  const [repairError, setRepairError] = useState<string | null>(null);
  const [foundAsk, setFoundAsk] = useState(false);
  const [founding, setFounding] = useState(false);
  const [upAsk, setUpAsk] = useState(false);
  const [upgrading, setUpgrading] = useState(false);
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

  async function onFound() {
    if (outpost || founding) return;
    if (credits != null && credits < OUTPOST_COST) {
      setRepairError(`Need ₡${OUTPOST_COST.toLocaleString()} to found a lock`);
      setFoundAsk(false);
      return;
    }
    setFounding(true);
    setRepairError(null);
    try {
      const r = await buyOutpost();
      setCredits(r.credits);
      const ok = useStarwake.getState().foundPlayerLock();
      if (!ok) throw new Error("No world to anchor");
      const o = useStarwake.getState().outpost;
      useStarwake.getState().pushNotice({
        kicker: "Annex",
        title: o?.name ?? "Your lock",
        body: `Storage ${OUTPOST_CAP} u. Same tape. Dock the annex.`,
      });
      setFoundAsk(false);
    } catch (err) {
      setRepairError(err instanceof Error ? err.message : "Found failed");
    } finally {
      setFounding(false);
    }
  }

  async function onUpgrade() {
    if (!outpost || outpost.tier >= 1 || upgrading) return;
    if (credits != null && credits < T1_COST) {
      setRepairError(`Need ₡${T1_COST.toLocaleString()} to expand`);
      setUpAsk(false);
      return;
    }
    setUpgrading(true);
    setRepairError(null);
    try {
      const r = await buyOutpostT1();
      setCredits(r.credits);
      if (!useStarwake.getState().upgradePlayerLock()) throw new Error("Already expanded");
      useStarwake.getState().pushNotice({
        kicker: "Annex",
        title: "Bay expanded",
        body: `${T1_CAP} u. Full tape. Same-system sell.`,
      });
      setUpAsk(false);
    } catch (err) {
      setRepairError(err instanceof Error ? err.message : "Upgrade failed");
    } finally {
      setUpgrading(false);
    }
  }

  if (!stn) return null;

  return (
    <div className="station-bay helion-dock" data-ui>
      <header className="station-head">
        <div className="k">{own ? "Annex" : "Board"}</div>
        <h2>{stn.name}</h2>
        <p>
          {planet?.name ?? sys.name} · {STATION_KIND_LABEL[stn.kind]}
          {own ? ` · your lock · ${outpost?.cap ?? OUTPOST_CAP} u` : ""}
        </p>
        <p>{STATION_KIND_BLURB[stn.kind]}</p>
      </header>
      <div className="station-stats">
        <span>T1 {Math.round(fuel)}/{Math.round(cap)}</span>
        <span>T2 {Math.round(fuel2 ?? 0)}/{Math.round(cap2)}</span>
        <span>Hold {used}/{Math.round(hold)} u</span>
        {ware.length > 0 && <span>Pad {cargoQty(ware)} u · {lotLabel(ware)}</span>}
        {own && ware.length === 0 && <span>Annex 0/{outpost?.cap ?? OUTPOST_CAP} u</span>}
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
        {!outpost && (
          <button
            type="button"
            className="engage ghost"
            onClick={() => setFoundAsk(true)}
            disabled={founding || (credits != null && credits < OUTPOST_COST)}
          >
            Found lock ₡{OUTPOST_COST.toLocaleString()}
          </button>
        )}
        {outpost && outpost.systemId === systemId && outpost.tier < 1 && (
          <button
            type="button"
            className="engage ghost"
            onClick={() => setUpAsk(true)}
            disabled={upgrading || (credits != null && credits < T1_COST)}
          >
            Expand bay ₡{T1_COST.toLocaleString()}
          </button>
        )}
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
                  fits={jobFits(job, shipId, loadout, man, cargo)}
                  onAccept={() => acceptJob(job.id)}
                />
              ))
            )}
          </div>
        )}
      </section>
      <MarketWatch
        systemId={systemId}
        stationId={stationId}
        credits={credits}
        onCredits={setCredits}
        onError={setRepairError}
      />
      {foundAsk && (
        <HelionConfirm
          kicker="Annex"
          title="Found a lock"
          body={`₡${OUTPOST_COST.toLocaleString()} for a truss in this system. ${foundOutpost(sys, "Line")?.name ?? "Annex"} sits on a wild world if one is free. Storage ${OUTPOST_CAP} u. Same tape everywhere. Price leverage later.`}
          confirmLabel={founding ? "Founding" : "Found"}
          busy={founding}
          onConfirm={() => void onFound()}
          onCancel={() => setFoundAsk(false)}
        />
      )}
      {upAsk && (
        <HelionConfirm
          kicker="Annex"
          title="Expand the bay"
          body={`₡${T1_COST.toLocaleString()} for ${T1_CAP} u. Public pads still take 6%. Annex sells full tape. Same-system remote sell stays.`}
          confirmLabel={upgrading ? "Expanding" : "Expand"}
          busy={upgrading}
          onConfirm={() => void onUpgrade()}
          onCancel={() => setUpAsk(false)}
        />
      )}
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
