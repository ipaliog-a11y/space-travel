import { useEffect, useState } from "react";
import {
  SHIP_SETS,
  SHIPS,
  SLOT_TAB,
  SLOTS,
  fittedShip,
  moduleById,
  moduleFitCost,
  modulesFor,
  refuelQuote,
} from "@/lib/starwake/catalog";
import { planetLog } from "@/lib/starwake/galaxy";
import { diaryEarnings, formatHaul, formatStop, holdUsed, jobPayout } from "@/lib/starwake/jobs";
import { useStarwake } from "@/lib/starwake/store";
import type { ModuleDef, ShipId, SlotId, StatKey } from "@/lib/starwake/types";
import { buyFuel, buyModuleFit, loadRepairStatus, upgradeCurrentHardpoint } from "@/lib/hangar/api";
import { HARDPOINT_TIER_NAMES } from "@/lib/hangar/types";
import {
  HARDPOINT_BONUSES,
  HARDPOINT_COSTS,
  getNextHardpointTier,
  type HardpointTier,
} from "@/lib/ship-ownership/types";
import { HullBay } from "./HullBay";

const RELIABILITY_TAB = "reliability" as const;
type FitTab = SlotId | typeof RELIABILITY_TAB;
const HARDPOINT_ORDER: HardpointTier[] = ["stock", "mk1", "mk2", "mk3"];

type Props = {
  shipId: ShipId;
  onPick: (id: ShipId) => void;
  onBack: () => void;
  onProfile: () => void;
  onMarket: () => void;
  onUndock: () => void;
  ownedHulls: ShipId[] | null;
  onClaimStarter: () => Promise<void>;
};

const STATS: { key: StatKey; label: string; unit: string; max: number; invert?: boolean }[] = [
  { key: "turnRate", label: "Turn", unit: "", max: 2.2 },
  { key: "cruiseSpeed", label: "Cruise", unit: "", max: 10 },
  { key: "overdriveSpeed", label: "OD", unit: "", max: 90 },
  { key: "jumpRangeLy", label: "Jump", unit: "ly", max: 36 },
  { key: "cargoCap", label: "Hold", unit: "u", max: 80 },
  { key: "fuelCap", label: "Tank", unit: "t1", max: 280 },
  { key: "fuelCap2", label: "T2", unit: "t2", max: 80 },
  { key: "overdriveSec", label: "Heat", unit: "s", max: 18 },
  { key: "coolSec", label: "Cool", unit: "s", max: 12, invert: true },
  { key: "fsdChargeSec", label: "Spool", unit: "s", max: 5.2, invert: true },
  { key: "mass", label: "Mass", unit: "", max: 2.2 },
];

export function Hangar({ shipId, onPick, onBack, onProfile, onMarket, onUndock, ownedHulls, onClaimStarter }: Props) {
  const loadout = useStarwake((s) => s.loadout);
  const setModule = useStarwake((s) => s.setModule);
  const ownedModules = useStarwake((s) => s.ownedModules);
  const ownModule = useStarwake((s) => s.ownModule);
  const manifests = useStarwake((s) => s.manifests);
  const completed = useStarwake((s) => s.completed);
  const jobLog = useStarwake((s) => s.jobLog);
  const earned = diaryEarnings(jobLog);
  const surveys = useStarwake((s) => s.surveys);
  const scanned = useStarwake((s) => s.scanned);
  const visits = useStarwake((s) => s.visitedPlanets);
  const dropJob = useStarwake((s) => s.dropJob);
  const fuel = useStarwake((s) => s.fuel[s.shipId]);
  const fuel2 = useStarwake((s) => s.fuel2[s.shipId]);
  const refuel = useStarwake((s) => s.refuel);
  const [slot, setSlot] = useState<FitTab>("tank");
  const [credits, setCredits] = useState<number | null>(null);
  const [hardpointTier, setHardpointTier] = useState<HardpointTier>("stock");
  const [fitError, setFitError] = useState<string | null>(null);
  const [buyingId, setBuyingId] = useState<string | null>(null);
  const [fueling, setFueling] = useState(false);
  const fitted = fittedShip(shipId, loadout);
  const needT1 = Math.max(0, fitted.fuelCap - (fuel ?? 0));
  const needT2 = Math.max(0, fitted.fuelCap2 - (fuel2 ?? 0));
  const pumpQuote = refuelQuote(needT1, needT2);
  const tanksFull = needT1 < 0.2 && needT2 < 0.2;
  const hullSlot = slot === RELIABILITY_TAB ? "tank" : slot;
  const parts = slot === RELIABILITY_TAB ? [] : modulesFor(shipId, slot);
  const fittedId = slot === RELIABILITY_TAB ? "" : loadout[shipId][slot];
  const man = manifests[shipId];
  const used = holdUsed(man);
  const log = planetLog(visits, scanned, surveys);

  useEffect(() => {
    const fit = loadout[shipId];
    for (const id of Object.values(fit)) {
      const mod = moduleById(id);
      if (mod && !mod.stock) ownModule(id);
    }
  }, [shipId, loadout, ownModule]);

  useEffect(() => {
    let cancelled = false;
    loadRepairStatus({ data: { shipType: shipId } })
      .then((status) => {
        if (cancelled) return;
        setCredits(status.credits);
        setHardpointTier(status.hardpointTier);
        setFitError(null);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [shipId]);

  function ownsFit(mod: ModuleDef) {
    return Boolean(mod.stock) || ownedModules.includes(mod.id) || loadout[shipId][mod.slot] === mod.id;
  }

  async function onPickModule(mod: ModuleDef) {
    if (slot === RELIABILITY_TAB || buyingId) return;
    if (ownsFit(mod)) {
      setModule(mod.slot, mod.id);
      return;
    }
    const cost = moduleFitCost(mod);
    if (credits != null && credits < cost) {
      setFitError(`Need ₡${cost.toLocaleString()}`);
      return;
    }
    setBuyingId(mod.id);
    setFitError(null);
    try {
      const result = await buyModuleFit({ data: { moduleId: mod.id } });
      setCredits(result.credits);
      ownModule(mod.id);
      setModule(mod.slot, mod.id);
    } catch (err) {
      setFitError(err instanceof Error ? err.message : "Fit failed");
    } finally {
      setBuyingId(null);
    }
  }

  async function onPickHardpoint(tier: HardpointTier) {
    if (buyingId || tier === hardpointTier) return;
    const next = getNextHardpointTier(hardpointTier);
    if (tier !== next) return;
    const cost = HARDPOINT_COSTS[tier];
    if (credits != null && credits < cost) {
      setFitError(`Need ₡${cost.toLocaleString()}`);
      return;
    }
    setBuyingId(tier);
    setFitError(null);
    try {
      const status = await upgradeCurrentHardpoint({ data: { shipType: shipId } });
      setCredits(status.credits);
      setHardpointTier(status.hardpointTier);
    } catch (err) {
      setFitError(err instanceof Error ? err.message : "Hardpoint fit failed");
    } finally {
      setBuyingId(null);
    }
  }

  async function onPump() {
    if (tanksFull || fueling) return;
    if (pumpQuote.cost > 0 && credits != null && credits < pumpQuote.cost) {
      setFitError(`Need ₡${pumpQuote.cost.toLocaleString()} to fill`);
      return;
    }
    setFueling(true);
    setFitError(null);
    try {
      const result = await buyFuel({ data: { t1: needT1, t2: needT2 } });
      setCredits(result.credits);
      refuel();
    } catch (err) {
      setFitError(err instanceof Error ? err.message : "Refuel failed");
    } finally {
      setFueling(false);
    }
  }

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
        <p className="lede">Two sets. Line flies the routes. Yard fuels and shoves. Pick a bay, fit it, fly.</p>
        <p className="keys-hint">
          {completed} run{completed === 1 ? "" : "s"}
          {earned > 0 && (
            <>
              <span className="dot">·</span>
              ₡{earned.toLocaleString()} earned
            </>
          )}
          <span className="dot">·</span>
          {log.length} logged
          <span className="dot">·</span>
          Hold {used}/{Math.round(fitted.cargoCap)} u
          {credits != null && (
            <>
              <span className="dot">·</span>
              ₡{Math.round(credits).toLocaleString()}
            </>
          )}
        </p>
      </header>

      {ownedHulls !== null && ownedHulls.length === 0 && (
        <p className="lede">
          Empty bay. Claim a stock Courier to fit modules and undock.
          <button type="button" className="engage" onClick={() => void onClaimStarter()}>
            Claim Courier
          </button>
        </p>
      )}

      {SHIP_SETS.map((set) => {
        const hulls = ownedHulls === null ? set.hulls : set.hulls.filter((id) => ownedHulls.includes(id));
        if (hulls.length === 0) return null;
        return (
        <section key={set.id} className={`ship-set ship-set-${set.id}`}>
          <div className="ship-set-head">
            <h2>{set.label}</h2>
            <p>{set.blurb}</p>
          </div>
          <div className="ship-rail" role="tablist" aria-label={set.label}>
            {hulls.map((id) => {
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
                    setFitError(null);
                  }}
                >
                  <img src={`/ships/${id}-thumb.png`} alt="" className="ship-rail-art" />
                  <span className="ship-rail-name">{hull.name}</span>
                  <span className="ship-rail-role">{hull.role}</span>
                  <span className="ship-rail-blurb">{hull.blurb}</span>
                  <span className="ship-rail-data">
                    {fit.jumpRangeLy.toFixed(0)} ly · {Math.round(fit.cargoCap)} u · t1 {Math.round(fit.fuelCap)} · t2 {Math.round(fit.fuelCap2)}
                  </span>
                </button>
              );
            })}
          </div>
        </section>
        );
      })}

      {!(ownedHulls !== null && ownedHulls.length === 0) && (
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
              <em>T1</em>
              <strong>{Math.round(fitted.fuelCap)}</strong>
            </li>
            <li>
              <em>T2</em>
              <strong>{Math.round(fitted.fuelCap2)}</strong>
            </li>
            <li>
              <em>Boost</em>
              <strong>{fitted.boostCapacity}</strong>
            </li>
            <li>
              <em>Survey</em>
              <strong>{fitted.surveySec.toFixed(1)}</strong>
              <span>s</span>
            </li>
            <li>
              <em>Rel</em>
              <strong>{HARDPOINT_TIER_NAMES[hardpointTier]}</strong>
            </li>
          </ul>
        </div>
      </div>
      )}

      {!(ownedHulls !== null && ownedHulls.length === 0) && (
      <div className="hangar-grid">
        <div className="bay">
          <HullBay hull={shipId} slot={hullSlot} onSlot={setSlot} />
          <p className="bay-caption">{SHIPS[shipId].blurb}</p>
          <section className="job-board" aria-label="Cargo jobs">
            <div className="job-board-head">
              <h2>Haul</h2>
              {man ? <span>Active on {SHIPS[shipId].name}</span> : <span>Pick jobs on a hub board after you dock.</span>}
            </div>
            {man ? (
              <div className="job-card on" aria-label={`Active ${man.job.title}`}>
                <span className="job-kind">{man.loaded ? "loaded" : "accepted"} · {man.job.kind}</span>
                <span className="job-title">{man.job.title}</span>
                <span className="job-route">
                  {formatStop(man.job.from)} → {formatStop(man.job.to)} · {man.job.qty} u · {formatHaul(man.job)} · ₡{jobPayout(man.job).toLocaleString()}
                </span>
                {!man.loaded && (
                  <button type="button" className="job-drop" onClick={dropJob}>
                    Drop
                  </button>
                )}
              </div>
            ) : (
              <p className="bay-caption">Hub boards list hauls that leave that lock.</p>
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
                          : s.key === "fuelCap2"
                            ? `${Math.round(fuel2 ?? 0)}/${Math.round(v)}`
                          : s.unit === "ly" || s.unit === "s"
                            ? v.toFixed(1)
                            : v.toFixed(2)}
                      {s.key === "cargoCap" ? " u" : s.key === "fuelCap" ? " t1" : s.key === "fuelCap2" ? " t2" : s.unit ? ` ${s.unit}` : ""}
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
            <button
              type="button"
              className={slot === RELIABILITY_TAB ? "on" : ""}
              aria-pressed={slot === RELIABILITY_TAB}
              onClick={() => setSlot(RELIABILITY_TAB)}
            >
              Rel
            </button>
          </div>
          {fitError && <p className="station-repair-err">{fitError}</p>}
          <div className="mod-list">
            {slot === RELIABILITY_TAB
              ? HARDPOINT_ORDER.map((tier) => {
                  const next = getNextHardpointTier(hardpointTier);
                  const owned = HARDPOINT_ORDER.indexOf(tier) <= HARDPOINT_ORDER.indexOf(hardpointTier);
                  const canBuy = tier === next;
                  const cost = HARDPOINT_COSTS[tier];
                  const isFitted = tier === hardpointTier;
                  return (
                    <button
                      key={tier}
                      type="button"
                      className={`mod-card${isFitted ? " on" : ""}`}
                      disabled={buyingId !== null || (!owned && !canBuy) || (canBuy && credits != null && credits < cost)}
                      onClick={() => void onPickHardpoint(tier)}
                    >
                      <span className="mod-name">
                        {HARDPOINT_TIER_NAMES[tier]}
                        {isFitted ? <em>fitted</em> : owned ? <em>owned</em> : canBuy ? <em>next</em> : <em>locked</em>}
                      </span>
                      <span className="mod-blurb">
                        {tier === "stock"
                          ? "Stock reliability. Wear pool as built."
                          : `+${HARDPOINT_BONUSES[tier]} wear pool. Hangar fit.`}
                      </span>
                      <span className="mod-delta">
                        {owned ? "unlocked" : cost > 0 ? `₡${cost.toLocaleString()}` : "stock"}
                      </span>
                    </button>
                  );
                })
              : parts.map((m) => {
                  const owned = ownsFit(m);
                  const cost = moduleFitCost(m);
                  const equipped = fittedId === m.id;
                  const short = credits != null && !owned && credits < cost;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      className={`mod-card${equipped ? " on" : ""}`}
                      disabled={buyingId !== null || short}
                      onClick={() => void onPickModule(m)}
                    >
                      <span className="mod-name">
                        {m.name}
                        {equipped ? <em>fitted</em> : m.stock ? <em>stock</em> : owned ? <em>owned</em> : null}
                      </span>
                      <span className="mod-blurb">{m.blurb}</span>
                      <span className="mod-delta">
                        {formatDelta(m)}
                        {!owned && cost > 0 ? ` · ₡${cost.toLocaleString()}` : ""}
                      </span>
                    </button>
                  );
                })}
          </div>
        </div>
      </div>
      )}

      <div className="gate-acts">
        <button type="button" className="engage ghost" onClick={onBack}>
          Menu
        </button>
        <button type="button" className="engage ghost" onClick={onMarket}>
          Market
        </button>
        <button type="button" className="engage ghost" onClick={onProfile}>
          Pilot
        </button>
        <button
          type="button"
          className="engage ghost"
          onClick={() => void onPump()}
          disabled={fueling || tanksFull || (pumpQuote.cost > 0 && credits != null && credits < pumpQuote.cost)}
        >
          {tanksFull
            ? "Tanks full"
            : fueling
              ? "Fueling"
              : pumpQuote.cost > 0
                ? `Refuel ₡${pumpQuote.cost.toLocaleString()}`
                : "Refuel"}
        </button>
        <button
          type="button"
          className="engage"
          onClick={onUndock}
          disabled={ownedHulls !== null && ownedHulls.length === 0}
        >
          Fly
        </button>
      </div>
    </div>
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
    fuelCap2: "t2",
    mass: "mass",
  };
  for (const [k, v] of Object.entries(m.delta) as [StatKey, number][]) {
    if (!v) continue;
    const sign = v > 0 ? "+" : "";
    bits.push(`${labels[k] ?? k} ${sign}${v}`);
  }
  return bits.length ? bits.join(" · ") : "stock";
}
