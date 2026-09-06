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
import { formatHaul, formatStop, holdUsed, jobPayout } from "@/lib/starwake/jobs";
import { listedPads } from "@/lib/starwake/market-hubs";
import { EMPTY_HOLD, cargoQty, lotLabel } from "@/lib/starwake/market";
import { useStarwake } from "@/lib/starwake/store";
import type { ModuleDef, ShipId, SlotId, StatKey } from "@/lib/starwake/types";
import { buyFuel, buyModuleFit, loadHangar, loadRepairStatus, upgradeCurrentHardpoint } from "@/lib/hangar/api";
import { HARDPOINT_TIER_NAMES, type HangarShip } from "@/lib/hangar/types";
import {
  HARDPOINT_BONUSES,
  HARDPOINT_COSTS,
  getNextHardpointTier,
  type HardpointTier,
} from "@/lib/ship-ownership/types";
import { HULL_DUTY_LABEL, hullDuty, hullFullyCrewed } from "@/lib/starwake/fleet";
import { HullBay } from "./HullBay";
import { HelionConfirm } from "./HelionConfirm";

const RELIABILITY_TAB = "reliability" as const;
type FitTab = SlotId | typeof RELIABILITY_TAB;
const HARDPOINT_ORDER: HardpointTier[] = ["stock", "mk1", "mk2", "mk3"];

type Props = {
  shipId: ShipId;
  onPick: (id: ShipId) => void;
  onBack: () => void;
  onProfile: () => void;
  onMarket: () => void;
  onWatch: () => void;
  onCrew: () => void;
  onUndock: () => void;
  ownedHulls: ShipId[] | null;
};

const STATS: { key: StatKey; label: string; unit: string; max: number; invert?: boolean }[] = [
  { key: "turnRate", label: "Turn", unit: "", max: 2.2 },
  { key: "cruiseSpeed", label: "Cruise", unit: "", max: 20 },
  { key: "overdriveSpeed", label: "OD", unit: "", max: 180 },
  { key: "jumpRangeLy", label: "Jump", unit: "ly", max: 36 },
  { key: "cargoCap", label: "Hold", unit: "u", max: 80 },
  { key: "fuelCap", label: "Tank", unit: "t1", max: 280 },
  { key: "fuelCap2", label: "T2", unit: "t2", max: 80 },
  { key: "overdriveSec", label: "Heat", unit: "s", max: 18 },
  { key: "coolSec", label: "Cool", unit: "s", max: 12, invert: true },
  { key: "fsdChargeSec", label: "Spool", unit: "s", max: 5.2, invert: true },
  { key: "mass", label: "Mass", unit: "", max: 2.2 },
];

export function Hangar({ shipId, onPick, onBack, onProfile, onMarket, onWatch, onCrew, onUndock, ownedHulls }: Props) {
  const loadout = useStarwake((s) => s.loadout);
  const setModule = useStarwake((s) => s.setModule);
  const ownedModules = useStarwake((s) => s.ownedModules);
  const ownModule = useStarwake((s) => s.ownModule);
  const manifests = useStarwake((s) => s.manifests);
  const cargoHolds = useStarwake((s) => s.cargo);
  const warehouses = useStarwake((s) => s.warehouses);
  const pads = listedPads(warehouses);
  const dropJob = useStarwake((s) => s.dropJob);
  const crew = useStarwake((s) => s.crew);
  const fuel = useStarwake((s) => s.fuel[s.shipId]);
  const fuel2 = useStarwake((s) => s.fuel2[s.shipId]);
  const refuel = useStarwake((s) => s.refuel);
  const [slot, setSlot] = useState<FitTab>("tank");
  const [credits, setCredits] = useState<number | null>(null);
  const [hardpointTier, setHardpointTier] = useState<HardpointTier>("stock");
  const [fitError, setFitError] = useState<string | null>(null);
  const [buyingId, setBuyingId] = useState<string | null>(null);
  const [fueling, setFueling] = useState(false);
  const [pendingHp, setPendingHp] = useState<HardpointTier | null>(null);
  const [pendingMod, setPendingMod] = useState<ModuleDef | null>(null);
  const [bayShips, setBayShips] = useState<HangarShip[]>([]);
  const [bayOpen, setBayOpen] = useState(false);
  const fitted = fittedShip(shipId, loadout);
  const crewLocked = hullFullyCrewed(shipId, crew, bayShips);
  const needT1 = Math.max(0, fitted.fuelCap - (fuel ?? 0));
  const needT2 = Math.max(0, fitted.fuelCap2 - (fuel2 ?? 0));
  const pumpQuote = refuelQuote(needT1, needT2);
  const tanksFull = needT1 < 0.2 && needT2 < 0.2;
  const hullSlot = slot === RELIABILITY_TAB ? "tank" : slot;
  const parts = slot === RELIABILITY_TAB ? [] : modulesFor(shipId, slot);
  const fittedId = slot === RELIABILITY_TAB ? "" : loadout[shipId][slot];
  const man = manifests[shipId];
  const cargo = cargoHolds[shipId] ?? EMPTY_HOLD;
  const used = holdUsed(man, cargo);
  const duty = hullDuty(shipId, shipId, crew, bayShips);

  useEffect(() => {
    const fit = loadout[shipId];
    for (const id of Object.values(fit)) {
      const mod = moduleById(id);
      if (mod && !mod.stock) ownModule(id);
    }
  }, [shipId, loadout, ownModule]);

  useEffect(() => {
    let cancelled = false;
    Promise.all([loadRepairStatus({ data: { shipType: shipId } }), loadHangar()])
      .then(([status, hangar]) => {
        if (cancelled) return;
        setCredits(status.credits);
        setHardpointTier(status.hardpointTier);
        setBayShips(hangar.ships);
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
    setPendingMod(mod);
  }

  async function confirmModule() {
    const mod = pendingMod;
    if (!mod || buyingId) return;
    setBuyingId(mod.id);
    setFitError(null);
    try {
      const result = await buyModuleFit({ data: { moduleId: mod.id } });
      setCredits(result.credits);
      ownModule(mod.id);
      setModule(mod.slot, mod.id);
      setPendingMod(null);
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
    setPendingHp(tier);
  }

  async function confirmHardpoint() {
    const tier = pendingHp;
    if (!tier || buyingId) return;
    setBuyingId(tier);
    setFitError(null);
    try {
      const status = await upgradeCurrentHardpoint({ data: { shipType: shipId } });
      setCredits(status.credits);
      setHardpointTier(status.hardpointTier);
      setPendingHp(null);
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
      if (pendingHp || pendingMod) return;
      if (bayOpen) {
        setBayOpen(false);
        return;
      }
      onBack();
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [onBack, bayOpen, pendingHp, pendingMod]);

  return (
    <div className="gate hangar helion-dock" data-ui>
      <header className="hangar-head">
        <div className="k">{bayOpen ? "Bay" : "Hangar"}</div>
        <h1>{SHIPS[shipId].name}</h1>
        <p className="lede">
          {bayOpen ? "3D bay and fits. Esc returns to the line." : "Pick a hull. Status is on the right. Bay opens the kit."}
        </p>
        <p className="keys-hint">
          Hold {used}/{Math.round(fitted.cargoCap)} u
          {pads.length > 0 && (
            <>
              <span className="dot">·</span>
              {pads.length} pad{pads.length === 1 ? "" : "s"}
            </>
          )}
          {credits != null && (
            <>
              <span className="dot">·</span>
              ₡{Math.round(credits).toLocaleString()}
            </>
          )}
        </p>
      </header>

      {!bayOpen && pads.length > 0 && (
        <section className="job-board hangar-pads" aria-label="Pad stores">
          <div className="job-board-head">
            <h2>Pads</h2>
            <span>Stored on a lock. Load from Watch when docked there.</span>
          </div>
          <ul className="survey-list pad-list">
            {pads.map((pad) => (
              <li key={pad.key}>
                <strong>{pad.station}</strong>
                <span>{pad.system}</span>
                <em>{cargoQty(pad.hold)} u</em>
                <p className="bay-caption">{lotLabel(pad.hold)}</p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {!bayOpen && (
      <div className="hangar-overview">
        <div className="hangar-line">
      {SHIP_SETS.map((set) => {
        const hulls = ownedHulls?.filter((id) => set.hulls.includes(id)) ?? [];
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
              const rowDuty = hullDuty(id, shipId, crew, bayShips);
              const locked = hullFullyCrewed(id, crew, bayShips);
              return (
                <div
                  key={id}
                  role="tab"
                  aria-selected={shipId === id}
                  className={`ship-rail-card${shipId === id ? " on" : ""}`}
                >
                  <button
                    type="button"
                    className="ship-rail-pick"
                    onClick={() => {
                      onPick(id);
                      setSlot("tank");
                      setFitError(null);
                    }}
                  >
                    <img src={`/ships/${id}-thumb.png`} alt="" className="ship-rail-art" />
                    <span className="ship-rail-name">{hull.name}</span>
                    <span className="ship-rail-role">{hull.role}</span>
                    <span className="ship-rail-duty">{locked ? "Crew bay" : HULL_DUTY_LABEL[rowDuty]}</span>
                    <span className="ship-rail-data">
                      {fit.jumpRangeLy.toFixed(0)} ly · {Math.round(fit.cargoCap)} u
                    </span>
                  </button>
                  <button
                    type="button"
                    className="job-take"
                    onClick={() => {
                      onPick(id);
                      setSlot("tank");
                      setFitError(null);
                      setBayOpen(true);
                    }}
                  >
                    Bay
                  </button>
                </div>
              );
            })}
          </div>
        </section>
        );
      })}
        </div>
        {!(ownedHulls !== null && ownedHulls.length === 0) && (
        <aside className="hangar-status job-board" aria-label="Selected hull">
          <div className="job-board-head">
            <h2>{SHIPS[shipId].name}</h2>
            <span>{crewLocked ? "Crew bay" : HULL_DUTY_LABEL[duty]}</span>
          </div>
          <p className="bay-caption">{SHIPS[shipId].blurb}</p>
          <ul className="hull-chips">
            <li>
              <em>Rel</em>
              <strong>{HARDPOINT_TIER_NAMES[hardpointTier]}</strong>
            </li>
            <li>
              <em>Jump</em>
              <strong>{fitted.jumpRangeLy.toFixed(0)}</strong>
              <span>ly</span>
            </li>
            <li>
              <em>Hold</em>
              <strong>
                {used}/{Math.round(fitted.cargoCap)}
              </strong>
              <span>u</span>
            </li>
            <li>
              <em>T1</em>
              <strong>
                {Math.round(fuel ?? 0)}/{Math.round(fitted.fuelCap)}
              </strong>
            </li>
            <li>
              <em>T2</em>
              <strong>
                {Math.round(fuel2 ?? 0)}/{Math.round(fitted.fuelCap2)}
              </strong>
            </li>
          </ul>
          {man ? (
            <article className="job-card on">
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
            </article>
          ) : (
            <p className="survey-empty">No haul on this hull. Hub boards after you dock.</p>
          )}
          {cargo.length > 0 && <p className="bay-caption">Ship hold {lotLabel(cargo)}</p>}
          <div className="watch-acts">
            <button type="button" className="job-take" onClick={() => setBayOpen(true)}>
              Bay
            </button>
          </div>
        </aside>
        )}
      </div>
      )}

      {bayOpen && !(ownedHulls !== null && ownedHulls.length === 0) && (
      <div className="hangar-grid">
        <div className="bay">
          <HullBay hull={shipId} slot={hullSlot} onSlot={setSlot} />
          <p className="bay-caption">{SHIPS[shipId].blurb}</p>
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
        {bayOpen ? (
          <button type="button" className="engage ghost" onClick={() => setBayOpen(false)}>
            Line
          </button>
        ) : (
          <button type="button" className="engage ghost" onClick={onBack}>
            Menu
          </button>
        )}
        <button type="button" className="engage ghost" onClick={onMarket}>
          Market
        </button>
        <button type="button" className="engage ghost" onClick={onWatch}>
          Watch
        </button>
        <button type="button" className="engage ghost" onClick={onCrew}>
          Crew
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
          disabled={!ownedHulls || ownedHulls.length === 0 || crewLocked}
        >
          {crewLocked ? "Crew flying this hull" : "Fly"}
        </button>
      </div>
      {pendingHp && (
        <HelionConfirm
          kicker="Hangar"
          title={`Fit ${HARDPOINT_TIER_NAMES[pendingHp]}`}
          body={`Pay ₡${HARDPOINT_COSTS[pendingHp].toLocaleString()} to buy and fit Rel ${HARDPOINT_TIER_NAMES[pendingHp]} on this ${SHIPS[shipId].name}. Wear pool +${HARDPOINT_BONUSES[pendingHp]}.`}
          confirmLabel={`Fit ₡${HARDPOINT_COSTS[pendingHp].toLocaleString()}`}
          busy={Boolean(buyingId)}
          onConfirm={() => void confirmHardpoint()}
          onCancel={() => setPendingHp(null)}
        />
      )}
      {pendingMod && (
        <HelionConfirm
          kicker="Hangar"
          title={`Fit ${pendingMod.name}`}
          body={`Pay ₡${moduleFitCost(pendingMod).toLocaleString()} to buy and fit ${pendingMod.name} on this ${SHIPS[shipId].name}.`}
          confirmLabel={`Fit ₡${moduleFitCost(pendingMod).toLocaleString()}`}
          busy={Boolean(buyingId)}
          onConfirm={() => void confirmModule()}
          onCancel={() => setPendingMod(null)}
        />
      )}
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
