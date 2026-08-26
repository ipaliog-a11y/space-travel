import { useEffect, useState } from "react";
import {
  SHIP_ORDER,
  SHIPS,
  SLOT_TAB,
  SLOTS,
  fittedShip,
  modulesFor,
} from "@/lib/starwake/catalog";
import { planetLog } from "@/lib/starwake/galaxy";
import { formatStop, holdUsed, jobFits } from "@/lib/starwake/jobs";
import { useStarwake } from "@/lib/starwake/store";
import type { CargoJob, ShipId, SlotId, StatKey } from "@/lib/starwake/types";
import { HullBay } from "./HullBay";

type Props = {
  shipId: ShipId;
  onPick: (id: ShipId) => void;
  onBack: () => void;
  onUndock: () => void;
};

const STATS: { key: StatKey; label: string; unit: string; max: number; invert?: boolean }[] = [
  { key: "turnRate", label: "Turn", unit: "", max: 2.2 },
  { key: "cruiseSpeed", label: "Cruise", unit: "", max: 10 },
  { key: "overdriveSpeed", label: "OD", unit: "", max: 90 },
  { key: "jumpRangeLy", label: "Jump", unit: "ly", max: 36 },
  { key: "cargoCap", label: "Hold", unit: "u", max: 80 },
  { key: "fuelCap", label: "Tank", unit: "t1", max: 180 },
  { key: "overdriveSec", label: "Heat", unit: "s", max: 18 },
  { key: "coolSec", label: "Cool", unit: "s", max: 12, invert: true },
  { key: "fsdChargeSec", label: "Spool", unit: "s", max: 5.2, invert: true },
  { key: "mass", label: "Mass", unit: "", max: 2.2 },
];

export function Hangar({ shipId, onPick, onBack, onUndock }: Props) {
  const loadout = useStarwake((s) => s.loadout);
  const setModule = useStarwake((s) => s.setModule);
  const board = useStarwake((s) => s.board);
  const manifests = useStarwake((s) => s.manifests);
  const completed = useStarwake((s) => s.completed);
  const surveys = useStarwake((s) => s.surveys);
  const scanned = useStarwake((s) => s.scanned);
  const visits = useStarwake((s) => s.visitedPlanets);
  const acceptJob = useStarwake((s) => s.acceptJob);
  const dropJob = useStarwake((s) => s.dropJob);
  const fuel = useStarwake((s) => s.fuel[s.shipId]);
  const refuel = useStarwake((s) => s.refuel);
  const [slot, setSlot] = useState<SlotId>("tank");
  const fitted = fittedShip(shipId, loadout);
  const parts = modulesFor(shipId, slot);
  const fittedId = loadout[shipId][slot];
  const man = manifests[shipId];
  const used = holdUsed(man);
  const log = planetLog(visits, scanned, surveys);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== "Escape") return;
      e.preventDefault();
      e.stopPropagation();
      onBack();
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [onBack]);

  return (
    <div className="gate hangar" data-ui>
      <header className="hangar-head">
        <h1>Hangar</h1>
        <p className="lede">Four hulls. Pick a bay — packet, bulk, pathfinder, or runner — then fit it and fly.</p>
        <p className="keys-hint">
          {completed} run{completed === 1 ? "" : "s"}
          <span className="dot">·</span>
          {log.length} logged
          <span className="dot">·</span>
          Hold {used}/{Math.round(fitted.cargoCap)} u
        </p>
      </header>

      <div className="ship-rail" role="tablist" aria-label="Hull">
        {SHIP_ORDER.map((id) => {
          const hull = SHIPS[id];
          const fit = fittedShip(id, loadout);
          return (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={shipId === id}
              className={`ship-rail-card${shipId === id ? " on" : ""}`}
              onClick={() => {
                onPick(id);
                setSlot("tank");
              }}
            >
              <img src={`/ships/${id}-thumb.png`} alt="" className="ship-rail-art" />
              <span className="ship-rail-name">{hull.name}</span>
              <span className="ship-rail-role">{hull.role}</span>
              <span className="ship-rail-data">
                {fit.jumpRangeLy.toFixed(0)} ly · {Math.round(fit.cargoCap)} u
              </span>
            </button>
          );
        })}
      </div>

      <div className="hull-dossier">
        <img src={`/ships/${shipId}.png`} alt="" className="hull-dossier-art" />
        <div>
          <p className="hull-dossier-kicker">
            {SHIPS[shipId].role}
            <span className="dot">·</span>
            {SHIPS[shipId].name}
          </p>
          <p className="hull-dossier-copy">{SHIPS[shipId].detail}</p>
          <ul className="hull-chips">
            <li>
              <em>Jump</em>
              <strong>{fitted.jumpRangeLy.toFixed(0)}</strong>
              <span>ly</span>
            </li>
            <li>
              <em>Hold</em>
              <strong>{Math.round(fitted.cargoCap)}</strong>
              <span>u</span>
            </li>
            <li>
              <em>Turn</em>
              <strong>{fitted.turnRate.toFixed(2)}</strong>
            </li>
            <li>
              <em>Mass</em>
              <strong>{fitted.mass.toFixed(2)}</strong>
            </li>
            <li>
              <em>Cruise</em>
              <strong>{fitted.cruiseSpeed.toFixed(1)}</strong>
            </li>
            <li>
              <em>Survey</em>
              <strong>{fitted.surveySec.toFixed(1)}</strong>
              <span>s</span>
            </li>
          </ul>
        </div>
      </div>

      <div className="hangar-grid">
        <div className="bay">
          <HullBay hull={shipId} slot={slot} onSlot={setSlot} />
          <p className="bay-caption">{SHIPS[shipId].blurb}</p>
          <section className="job-board" aria-label="Cargo jobs">
            <div className="job-board-head">
              <h2>Board</h2>
              {man ? <span>Active on {SHIPS[shipId].name}</span> : <span>Hauls run lock to lock.</span>}
            </div>
            {man ? (
              <div className="job-card on" aria-label={`Active ${man.job.title}`}>
                <span className="job-kind">{man.loaded ? "loaded" : "accepted"} · {man.job.kind}</span>
                <span className="job-title">{man.job.title}</span>
                <span className="job-route">
                  {formatStop(man.job.from)} → {formatStop(man.job.to)} · {man.job.qty} u
                </span>
                {!man.loaded && (
                  <button type="button" className="job-drop" onClick={dropJob}>
                    Drop
                  </button>
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
          <section className="job-board survey-log" aria-label="Ship log">
            <div className="job-board-head">
              <h2>Log</h2>
              <span>Worlds you arrived at. Scan fills the page.</span>
            </div>
            {log.length === 0 ? (
              <p className="survey-empty">Empty. Arrive, then scan from the well.</p>
            ) : (
              <ul className="survey-list">
                {log.map((row) => (
                  <li key={row.id}>
                    <strong>{row.name}</strong>
                    <span>{row.system}</span>
                    <em>
                      {row.surveyed
                        ? "survey"
                        : row.scanned
                          ? row.kindLabel
                          : "visited"}
                    </em>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
        <div className="fit-col">
          <dl className="spec-list">
            {STATS.map((s) => {
              const v = fitted[s.key] as number;
              const t = s.invert ? 1 - v / s.max : v / s.max;
              return (
                <div key={s.key}>
                  <dt>{s.label}</dt>
                  <dd>
                    <span className="spec-bar" aria-hidden="true">
                      <i style={{ width: `${Math.max(6, Math.min(100, t * 100))}%` }} />
                    </span>
                    <span className="spec-val">
                      {s.key === "cargoCap"
                        ? `${used}/${Math.round(v)}`
                        : s.key === "fuelCap"
                          ? `${Math.round(fuel)}/${Math.round(v)}`
                          : s.unit === "ly" || s.unit === "s"
                            ? v.toFixed(1)
                            : v.toFixed(2)}
                      {s.key === "cargoCap" ? " u" : s.key === "fuelCap" ? " t1" : s.unit ? ` ${s.unit}` : ""}
                    </span>
                  </dd>
                </div>
              );
            })}
          </dl>
          <div className="slot-tabs">
            {SLOTS.map((id) => (
              <button
                key={id}
                type="button"
                className={slot === id ? "on" : ""}
                aria-pressed={slot === id}
                onClick={() => setSlot(id)}
              >
                {SLOT_TAB[id]}
              </button>
            ))}
          </div>
          <div className="mod-list">
            {parts.map((m) => (
              <button
                key={m.id}
                type="button"
                className={`mod-card${fittedId === m.id ? " on" : ""}`}
                onClick={() => setModule(slot, m.id)}
              >
                <span className="mod-name">
                  {m.name}
                  {m.stock ? <em>stock</em> : null}
                </span>
                <span className="mod-blurb">{m.blurb}</span>
                <span className="mod-delta">{formatDelta(m)}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="gate-acts">
        <button type="button" className="engage ghost" onClick={onBack}>
          Menu
        </button>
        <button type="button" className="engage ghost" onClick={refuel} disabled={fuel >= fitted.fuelCap - 0.2}>
          Refuel
        </button>
        <button type="button" className="engage" onClick={onUndock}>
          Fly
        </button>
      </div>
    </div>
  );
}

function JobCard({ job, fits, onAccept }: { job: CargoJob; fits: boolean; onAccept: () => void }) {
  return (
    <article className={`job-card${fits ? "" : " tight"}`}>
      <span className="job-kind">{job.kind} · {job.qty} u</span>
      <span className="job-title">{job.title}</span>
      <span className="job-route">
        {formatStop(job.from)} → {formatStop(job.to)}
      </span>
      <button type="button" className="job-take" disabled={!fits} onClick={onAccept}>
        {fits ? "Accept" : "Won't fit"}
      </button>
    </article>
  );
}

function formatDelta(m: { delta: Partial<Record<StatKey, number>> }) {
  const bits: string[] = [];
  const labels: Partial<Record<StatKey, string>> = {
    turnRate: "turn",
    cruiseSpeed: "cruise",
    overdriveSpeed: "od",
    overdriveSec: "heat",
    coolSec: "cool",
    jumpRangeLy: "ly",
    fsdChargeSec: "spool",
    cargoCap: "hold",
    fuelCap: "t1",
    mass: "mass",
  };
  for (const [k, v] of Object.entries(m.delta) as [StatKey, number][]) {
    if (!v) continue;
    const sign = v > 0 ? "+" : "";
    bits.push(`${labels[k] ?? k} ${sign}${v}`);
  }
  return bits.length ? bits.join(" · ") : "stock";
}
