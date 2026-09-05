import { useCallback, useEffect, useRef, useState } from "react";
import type { DriveHud, EngineHandle } from "@/lib/starwake/engine";
import { getCatalog, getSystem } from "@/lib/starwake/galaxy";
import { formatStop, holdUsed, jobPayout } from "@/lib/starwake/jobs";
import { cargoQty, EMPTY_HOLD, lotLabel, markHold, markTotal } from "@/lib/starwake/market";
import { hashu, mulberry32 } from "@/lib/starwake/math";
import { boostEscapes, haulAtRisk, INTERDICT_COOL_MS, interdictRansom, rollInterdict } from "@/lib/starwake/risk";
import { payRansom } from "@/lib/hangar/api";
import { sourceFromCatalog, yieldsFor } from "@/lib/starwake/mining";
import { fittedShip } from "@/lib/starwake/catalog";
import { useStarwake } from "@/lib/starwake/store";
import { isJumpMode, type FlightMode } from "@/lib/starwake/types";
import { useFlightWear } from "@/lib/starwake/use-flight-wear";
import { throttleToVisual, visualToThrottle, throttleReadout, idleHalt } from "@/lib/starwake/throttle";
import type { RadarBlip } from "@/lib/starwake/radar";
import { calculateWearPenalty } from "@/lib/ship-ownership/types";
import { Dossier } from "./Dossier";
import { LogBook } from "./LogBook";
import { SaveSlots } from "./SaveSlots";
import { StationBay } from "./StationBay";

type Props = {
  engine: EngineHandle | null;
  muted: boolean;
  onMute: () => void;
  mapOpen: boolean;
  onMap: () => void;
  mode: FlightMode;
  systemId: string;
  lockedId: string | null;
  charge01: number;
  onJump: () => void;
};

type Mfd = "ship" | "hold" | "jump";

function regimeLabel(drive: DriveHud) {
  if (drive.regime === "dock") return "Dock";
  if (drive.regime === "od") return drive.boosting ? "Boost" : "Od";
  if (drive.regime === "park") return "Park";
  if (drive.regime === "well") return "Well";
  return "Free";
}

function speedUnit(drive: DriveHud) {
  if (drive.regime === "park" || (drive.coasting && drive.speedRel)) return "orb";
  return drive.speedRel ? "rel" : "spd";
}

const IDLE_DRIVE: DriveHud = {
  throttle: 0.4,
  heat01: 0,
  overheated: false,
  overdrive: false,
  boostCharges: 5,
  boostMax: 5,
  boosting: false,
  boostArmed: false,
  focusName: null,
  atPlanet: null,
  speed: 0,
  navName: null,
  navDist: null,
  etaSec: null,
  canJump: false,
  atPlanetId: null,
  scanned: false,
  coasting: false,
  well: null,
  fuel: 100,
  fuelCap: 100,
  fuel2: 24,
  fuelCap2: 24,
  dry: false,
  dry2: false,
  atStation: null,
  atStationId: null,
  docking: false,
  berthed: false,
  gateIndex: 0,
  alignOff: 1,
  alignHead: 0,
  alignSpd: 0,
  surveying: false,
  surveyPaused: false,
  survey01: 0,
  extracting: false,
  extractPaused: false,
  extract01: 0,
  inBands: false,
  regime: "free",
  speedRel: false,
  radar: [],
};

export function FlightChrome({
  engine,
  muted,
  onMute,
  mapOpen,
  onMap,
  mode,
  systemId,
  lockedId,
  charge01,
  onJump,
}: Props) {
  const stickRef = useRef<HTMLDivElement>(null);
  const thrRef = useRef<HTMLDivElement>(null);
  const knobRef = useRef<HTMLDivElement>(null);
  const fillRef = useRef<HTMLDivElement>(null);
  const thrKnobRef = useRef<HTMLDivElement>(null);
  const heatRef = useRef<HTMLDivElement>(null);
  const tagRef = useRef<HTMLDivElement>(null);
  const [drive, setDrive] = useState<DriveHud>(IDLE_DRIVE);
  const [dossier, setDossier] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);
  const [opts, setOpts] = useState(false);
  const [logOpen, setLogOpen] = useState(false);
  const [tab, setTab] = useState<Mfd>("hold");
  const [hit, setHit] = useState<{ ransom: number } | null>(null);
  const [hitBusy, setHitBusy] = useState(false);
  const [hitErr, setHitErr] = useState<string | null>(null);
  const odSec = useRef(0);
  const lastHitAt = useRef(0);
  const driveRef = useRef(drive);

  const leaveToMenu = useCallback(() => {
    setOpts(false);
    setLogOpen(false);
    setDossier(false);
    if (typeof engine?.returnToHangar === "function") engine.returnToHangar();
    const st = useStarwake.getState();
    if (st.entered) {
      st.setEntered(false);
      st.markSave();
    }
  }, [engine]);

  const clearHit = useCallback(() => {
    setHit(null);
    setHitBusy(false);
    setHitErr(null);
    odSec.current = 0;
  }, []);

  async function onPayHit() {
    if (!hit || hitBusy) return;
    setHitBusy(true);
    setHitErr(null);
    try {
      await payRansom({ data: { amount: hit.ransom } });
      clearHit();
    } catch (e) {
      setHitErr(e instanceof Error ? e.message : "Pay failed");
      setHitBusy(false);
    }
  }

  function onDumpHit() {
    if (hitBusy) return;
    useStarwake.getState().jettisonHaul();
    clearHit();
  }

  function onBoostHit() {
    if (hitBusy) return;
    const spent = useStarwake.getState().spendBoost();
    engine?.setBoost(Boolean(spent));
    const rng = mulberry32(hashu(`run|${Date.now()}`) >>> 0);
    if (spent && boostEscapes(rng())) {
      clearHit();
      return;
    }
    useStarwake.getState().jettisonHaul();
    clearHit();
  }

  const syncThr = useCallback((t: number, heat = 0) => {
    const el = thrRef.current;
    if (!el || !thrKnobRef.current || !fillRef.current) return;
    const vis = throttleToVisual(t);
    const trackH = Math.max(40, el.clientHeight - 36);
    const y = 28 + (1 - vis) * trackH;
    thrKnobRef.current.style.top = `${y - 9}px`;
    fillRef.current.style.height = `${Math.max(0, vis * 100)}%`;
    fillRef.current.classList.toggle("rev", t < -0.02);
    if (heatRef.current) heatRef.current.style.height = `${Math.max(0, heat * 25)}%`;
  }, []);

  useEffect(() => {
    if (!engine) return;
    return engine.subscribeDrive((d) => {
      setDrive(d);
      driveRef.current = d;
      syncThr(d.throttle, d.heat01);
    });
  }, [engine, syncThr]);

  useEffect(() => {
    if (!engine) return;
    let raf = 0;
    const tick = () => {
      const el = tagRef.current;
      const d = engine.getFocusDebug?.();
      if (el && d) {
        const on = Boolean((d.nav || d.name) && d.visible && Math.abs(d.ndcX) < 1.02 && Math.abs(d.ndcY) < 1.02);
        el.style.opacity = on ? "1" : "0";
        if (on) {
          el.style.left = `${(d.ndcX * 0.5 + 0.5) * 100}%`;
          el.style.top = `${(-d.ndcY * 0.5 + 0.5) * 100}%`;
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [engine]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== "Escape") return;
      e.preventDefault();
      e.stopImmediatePropagation();
      const d = driveRef.current;
      if (hit) return;
      if (dossier) setDossier(false);
      else if (logOpen) setLogOpen(false);
      else if (opts) setOpts(false);
      else if (mapOpen) onMap();
      else if (d.docking) engine?.cancelDock();
      else if (d.berthed) engine?.undock();
      else setOpts(true);
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [dossier, opts, logOpen, mapOpen, onMap, engine, hit]);

  useEffect(() => {
    const id = window.setInterval(() => {
      if (hit) return;
      const d = driveRef.current;
      const st = useStarwake.getState();
      const man = st.manifests[st.shipId];
      const cargo = st.cargo[st.shipId] ?? EMPTY_HOLD;
      const loaded = haulAtRisk(Boolean(man?.loaded), cargoQty(cargo));
      if (d.regime !== "od" || d.berthed || !loaded) {
        odSec.current = 0;
        return;
      }
      odSec.current += 1;
      if (Date.now() - lastHitAt.current < INTERDICT_COOL_MS) return;
      if (odSec.current % 4 !== 0) return;
      const rng = mulberry32(hashu(`hit|${st.shipId}|${Math.floor(Date.now() / 4000)}`) >>> 0);
      if (!rollInterdict(odSec.current, rng(), loaded)) return;
      const jobPay = man?.loaded ? jobPayout(man.job) : 0;
      const ransom = interdictRansom(jobPay, markTotal(markHold(cargo)).mark);
      engine?.setBoost(false);
      engine?.setThrottle(0.4);
      setHitErr(null);
      setHit({ ransom });
      lastHitAt.current = Date.now();
    }, 1000);
    return () => window.clearInterval(id);
  }, [engine, hit]);

  useEffect(() => {
    const stick = stickRef.current;
    const thr = thrRef.current;
    if (!stick || !thr) return;
    let stickOn = false;
    let thrOn = false;

    const stickFrom = (e: PointerEvent) => {
      const r = stick.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      const maxR = r.width * 0.42;
      let dx = e.clientX - cx;
      let dy = e.clientY - cy;
      const len = Math.hypot(dx, dy) || 1;
      if (len > maxR) {
        dx = (dx / len) * maxR;
        dy = (dy / len) * maxR;
      }
      const x = dx / maxR;
      const y = dy / maxR;
      engine?.setStick(x, y, true);
      if (knobRef.current) {
        knobRef.current.style.transform = `translate(${(x * 32).toFixed(1)}px, ${(y * 32).toFixed(1)}px)`;
      }
    };

    const thrFrom = (e: PointerEvent) => {
      const r = thr.getBoundingClientRect();
      const pad = 14;
      const t = visualToThrottle(1 - Math.max(0, Math.min(1, (e.clientY - r.top - pad) / Math.max(1, r.height - pad * 2))));
      engine?.setThrottle(t);
    };

    const onStickDown = (e: PointerEvent) => {
      e.preventDefault();
      e.stopPropagation();
      stickOn = true;
      stick.setPointerCapture(e.pointerId);
      stickFrom(e);
    };
    const onStickMove = (e: PointerEvent) => {
      if (!stickOn) return;
      e.preventDefault();
      stickFrom(e);
    };
    const endStick = () => {
      stickOn = false;
      engine?.setStick(0, 0, false);
      if (knobRef.current) knobRef.current.style.transform = "translate(0px, 0px)";
    };

    const onThrDown = (e: PointerEvent) => {
      e.preventDefault();
      e.stopPropagation();
      thrOn = true;
      thr.setPointerCapture(e.pointerId);
      thrFrom(e);
    };
    const onThrMove = (e: PointerEvent) => {
      if (!thrOn) return;
      e.preventDefault();
      thrFrom(e);
    };
    const endThr = () => {
      thrOn = false;
      const t = engine?.getThrottle?.() ?? 0;
      if (t < 0) engine?.setThrottle(0);
    };

    stick.addEventListener("pointerdown", onStickDown);
    stick.addEventListener("pointermove", onStickMove);
    stick.addEventListener("pointerup", endStick);
    stick.addEventListener("pointercancel", endStick);
    thr.addEventListener("pointerdown", onThrDown);
    thr.addEventListener("pointermove", onThrMove);
    thr.addEventListener("pointerup", endThr);
    thr.addEventListener("pointercancel", endThr);
    return () => {
      stick.removeEventListener("pointerdown", onStickDown);
      stick.removeEventListener("pointermove", onStickMove);
      stick.removeEventListener("pointerup", endStick);
      stick.removeEventListener("pointercancel", endStick);
      thr.removeEventListener("pointerdown", onThrDown);
      thr.removeEventListener("pointermove", onThrMove);
      thr.removeEventListener("pointerup", endThr);
      thr.removeEventListener("pointercancel", endThr);
    };
  }, [engine]);

  const scanned = useStarwake((s) => s.scanned);
  const surveys = useStarwake((s) => s.surveys);
  const invertX = useStarwake((s) => s.invertX);
  const invertY = useStarwake((s) => s.invertY);
  const showOrbits = useStarwake((s) => s.showOrbits);
  const shipId = useStarwake((s) => s.shipId);
  const loadout = useStarwake((s) => s.loadout);
  const { wear, applyWear } = useFlightWear(shipId, mode, drive.boosting);
  const setWearPenalty = useStarwake((s) => s.setWearPenalty);
  const man = useStarwake((s) => s.manifests[s.shipId]);
  const cargo = useStarwake((s) => s.cargo[s.shipId] ?? EMPTY_HOLD);

  useEffect(() => {
    setWearPenalty(wear ? calculateWearPenalty(wear.wearPoints, wear.maxWearPool) : 0);
  }, [setWearPenalty, wear?.wearPoints, wear?.maxWearPool]);
  const body = drive.atPlanetId ? getCatalog(systemId, drive.atPlanetId) : null;
  const known = Boolean(drive.atPlanetId && scanned[drive.atPlanetId]);

  function onScan() {
    if (!drive.atPlanetId) return;
    useStarwake.getState().scanPlanet(drive.atPlanetId);
    setDossier(true);
  }

  function onSave() {
    useStarwake.getState().markSave();
    setSavedFlash(true);
    window.setTimeout(() => setSavedFlash(false), 900);
  }
  const here = getSystem(systemId);
  const locked = lockedId ? getSystem(lockedId) : null;
  const jumping = isJumpMode(mode);
  const canJump = Boolean(drive.canJump) && !jumping;
  const tagName = drive.navName || drive.focusName;
  const dist = drive.navDist;
  const eta = formatEta(drive.etaSec);
  const hull = fittedShip(shipId, loadout);
  const cap = hull.cargoCap;
  const used = holdUsed(man, cargo);
  const canDock = Boolean(drive.atStationId && !drive.docking && !drive.berthed && !jumping);
  const logged = Boolean(body && surveys[body.id]);
  const harvest = body && body.wild ? sourceFromCatalog(body) : null;
  const harvestPhase = harvest ? yieldsFor(harvest).phase : null;
  const gasHarvest = harvestPhase === "gas";
  const canSurvey = Boolean(
    body &&
      body.wild &&
      body.prospect &&
      known &&
      !logged &&
      drive.well &&
      !jumping &&
      !drive.docking &&
      !drive.berthed &&
      !drive.extracting,
  );
  const canExtract = Boolean(
    body &&
      body.wild &&
      body.prospect &&
      body.prospect.mining > 0 &&
      logged &&
      !jumping &&
      !drive.docking &&
      !drive.berthed &&
      !drive.surveying &&
      used < cap &&
      (gasHarvest ? drive.inBands : drive.well),
  );
  const hullPct = wear ? Math.max(0, 100 - wear.wearPercentage) / 100 : 1;
  const t1 = drive.fuelCap > 0 ? drive.fuel / drive.fuelCap : 0;
  const t2 = drive.fuelCap2 > 0 ? drive.fuel2 / drive.fuelCap2 : 0;
  const thrRead = throttleReadout(drive.throttle, {
    overdrive: drive.overdrive,
    docking: drive.docking,
    berthed: drive.berthed,
    halt: idleHalt(drive.throttle, drive.docking, Boolean(drive.atStationId), drive.speed / 100),
  });

  return (
    <div className={`hud helion${mapOpen || opts ? " mapped" : ""}${logOpen ? " logged" : ""}`}>
      {tagName && (
        <div ref={tagRef} className={`planet-tag${drive.atPlanet ? " near" : ""}`}>
          {tagName}
          {dist != null && (
            <span className="tag-dist">
              {dist < 10 ? dist.toFixed(1) : dist.toFixed(0)}
              {eta ? ` · ${eta}` : ""}
            </span>
          )}
        </div>
      )}

      <div className="helion-sys">
        System
        <strong>{here.name}</strong>
      </div>

      <div className="helion-speed">
        <strong>{Math.round(drive.speed)}</strong>
        <span>
          {speedUnit(drive)} · {regimeLabel(drive)}
          {drive.regime === "park" ? " · hold" : drive.well ? ` · ${drive.well}` : ""}
          {drive.inBands ? " · bands" : ""}
        </span>
        {drive.regime === "park" && <i className="park-lamp" aria-label="Park" />}
      </div>

      <div className="helion-plate left">
        <div className="k">Lock</div>
        <div className="name">{tagName || locked?.name || "—"}</div>
        <div className="meta">
          {mode === "transit" && tagName
            ? `Transit ${tagName}`
            : gasHarvest && drive.inBands
              ? `${dist != null ? (dist < 10 ? dist.toFixed(1) : dist.toFixed(0)) : "—"} · bands`
              : gasHarvest && drive.well
                ? `${dist != null ? (dist < 10 ? dist.toFixed(1) : dist.toFixed(0)) : "—"} · haze`
                : dist != null
                  ? `${dist < 10 ? dist.toFixed(1) : dist.toFixed(0)} · ${eta}`
                  : locked
                    ? `Jump lock ${locked.name}`
                    : "No look"}
        </div>
        <Radar blips={drive.radar ?? []} />
        <div className="helion-acts" data-ui>
          {body && (
            <button type="button" className="h-btn" onClick={() => (known ? setDossier(true) : onScan())}>
              {known ? "File" : "Scan"}
            </button>
          )}
          {canSurvey && !drive.surveying && (
            <button type="button" className="h-btn" onClick={() => engine?.requestSurvey()}>
              Survey
            </button>
          )}
          {canExtract && !drive.extracting && (
            <button type="button" className="h-btn" onClick={() => engine?.requestExtract()}>
              {gasHarvest ? "Scoop" : "Extract"}
            </button>
          )}
          {drive.extracting && (
            <button type="button" className="h-btn" onClick={() => engine?.requestExtract()}>
              Abort
            </button>
          )}
          {canDock && (
            <button type="button" className="h-btn" onClick={() => engine?.requestDock()}>
              Dock
            </button>
          )}
          {drive.docking && (
            <button type="button" className="h-btn" onClick={() => engine?.cancelDock()}>
              Abort
            </button>
          )}
          <button type="button" className={`h-btn${mapOpen ? " on" : ""}`} onClick={onMap}>
            Charts
          </button>
        </div>
      </div>

      <div className="stick" ref={stickRef} data-ui aria-label="Ship stick">
        <div className="stick-knob" ref={knobRef} />
      </div>

      <div className="drive-dock">
        <div
          className={`throttle${drive.overheated ? " hot" : ""}${drive.overdrive ? " od" : ""}${drive.throttle < -0.02 ? " rev" : ""}`}
          ref={thrRef}
          data-ui
          aria-label="Throttle"
        >
          <div className="throttle-track">
            <div className="throttle-od-zone" />
            <div className="throttle-rev-zone" />
            <div className="throttle-heat" ref={heatRef} />
            <div className="throttle-fill" ref={fillRef} />
            <div className="throttle-notch" />
            <div className="throttle-zero" />
          </div>
          <div className="throttle-knob" ref={thrKnobRef} />
        </div>
        <div className="throttle-read">
          <strong>{thrRead.pct}%</strong>
          <span>{thrRead.status}</span>
        </div>
      </div>

      <div className="helion-plate right">
        <div className="k">{tab === "jump" ? "Fsd" : tab === "ship" ? "Hull" : "Own"}</div>
        <div className="name">{tab === "jump" ? (locked?.name ?? "Jump") : hull.name}</div>
        <div className="meta">
          {tab === "jump"
            ? canJump
              ? "Aligned"
              : jumping
                ? "Spooling"
                : "Heading off"
            : tab === "ship"
              ? wear
                ? `wear ${wear.wearPercentage.toFixed(0)}% · bst ${drive.boostCharges}/${drive.boostMax}`
                : `bst ${drive.boostCharges}/${drive.boostMax}`
              : man
                ? `${man.job.cargo} · ${man.job.qty}u`
                : cargo.length
                  ? lotLabel(cargo)
                  : "empty hold"}
        </div>
        {tab === "jump" ? (
          <div className="bars">
            <Bar label="T2" value={t2} teal dry={drive.dry2} />
            <Bar label="Head" value={canJump ? 0.92 : 0.34} warn={!canJump} />
            <Bar label="Lock" value={locked ? 0.8 : 0.12} />
          </div>
        ) : tab === "ship" ? (
          <div className="bars">
            <Bar label="Hull" value={hullPct} warn={hullPct < 0.8} />
            <Bar label="Heat" value={drive.heat01} warn={drive.overheated} />
            <Bar label="Thr" value={Math.max(0, drive.throttle)} />
            <Bar label="Bst" value={drive.boostMax ? drive.boostCharges / drive.boostMax : 0} teal />
          </div>
        ) : (
          <div className="bars">
            <Bar label="T1" value={t1} teal dry={drive.dry} />
            <Bar label="T2" value={t2} dry={drive.dry2} />
            <Bar label="Hull" value={hullPct} warn={hullPct < 0.8} />
            <Bar label="Hold" value={cap ? used / cap : 0} />
          </div>
        )}
        {tab === "hold" && (man || cargo.length > 0) && (
          <div className="hold-line">
            {man ? `${formatStop(man.job.from)} → ${formatStop(man.job.to)}` : lotLabel(cargo)}
            <span>
              {used}/{Math.round(cap)}
            </span>
          </div>
        )}
        <div className="mfd" data-ui>
          <button type="button" data-on={tab === "ship"} onClick={() => setTab("ship")}>
            Ship
          </button>
          <button type="button" data-on={tab === "hold"} onClick={() => setTab("hold")}>
            Hold
          </button>
          <button type="button" data-on={tab === "jump"} onClick={() => setTab("jump")}>
            Jump
          </button>
        </div>
        {tab === "jump" && (
          <button type="button" className="h-btn jump" data-ui disabled={!canJump} onClick={onJump}>
            {jumping ? "Spool" : "Jump"}
          </button>
        )}
        {tab === "ship" && (
          <div className="boost-row" data-ui>
            <BoostButton
              engine={engine}
              disabled={jumping || !drive.boostArmed || (drive.boostCharges <= 0 && !drive.boosting)}
              active={drive.boosting}
            />
          </div>
        )}
      </div>

      {(mode === "charging" || mode === "transit" || drive.surveying || drive.extracting) && (
        <div className={`charge-bar${mode === "transit" ? " cruise" : ""}`} aria-hidden="true">
          <span
            style={{
              width: `${Math.round(
                (mode === "charging" || mode === "transit"
                  ? charge01
                  : drive.extracting
                    ? drive.extract01
                    : drive.survey01) * 100,
              )}%`,
            }}
          />
        </div>
      )}

      {dossier && drive.atPlanetId && (
        <Dossier systemId={systemId} planetId={drive.atPlanetId} onClose={() => setDossier(false)} />
      )}

      {drive.docking && (
        <div className="dock-hud">
          <div className="dock-title">Threading gate {drive.gateIndex + 1} / 10</div>
          <div className="dock-gate" aria-hidden="true" />
          <div className="dock-meters">
            <div>
              <span>Offset</span>
              <i>
                <b style={{ width: `${Math.max(4, Math.min(100, (1 - drive.alignOff) * 100))}%` }} />
              </i>
            </div>
            <div>
              <span>Heading</span>
              <i>
                <b style={{ width: `${Math.max(4, Math.min(100, drive.alignHead * 100))}%` }} />
              </i>
            </div>
            <div>
              <span>Speed</span>
              <i>
                <b style={{ width: `${Math.max(4, Math.min(100, (1 - drive.alignSpd) * 100))}%` }} />
              </i>
            </div>
          </div>
          <p className="dock-hint">Slow. Center the gate. Fly through.</p>
        </div>
      )}

      {hit && (
        <div className="helion-confirm" role="dialog" aria-modal="true" aria-labelledby="intercept-title">
          <div className="helion-confirm-card">
            <div className="k">Intercept</div>
            <h2 id="intercept-title">A kite on the tape</h2>
            <p className="lede">
              Pay ₡{hit.ransom.toLocaleString()}, dump the haul, or boost. Ship stays.
            </p>
            {hitErr && <p className="survey-empty">{hitErr}</p>}
            <div className="gate-acts">
              <button type="button" className="engage" disabled={hitBusy} onClick={() => void onPayHit()}>
                Pay
              </button>
              <button type="button" className="engage ghost" disabled={hitBusy} onClick={onDumpHit}>
                Dump
              </button>
              <button type="button" className="engage ghost" disabled={hitBusy} onClick={onBoostHit}>
                Boost
              </button>
            </div>
          </div>
        </div>
      )}

      {drive.berthed && drive.atStationId && (
        <StationBay
          stationId={drive.atStationId}
          systemId={systemId}
          onUndock={() => engine?.undock()}
          onRefuel={() => engine?.refuel()}
          onHullRepaired={applyWear}
        />
      )}

      {opts && (
        <div className="opt-panel" data-ui>
          <div className="map-head">
            <span className="opt-title">Options</span>
            <button type="button" className="icon-btn" onClick={() => setOpts(false)} aria-label="Close">
              ×
            </button>
          </div>
          <label className="opt-row">
            <span>Reverse left / right</span>
            <input type="checkbox" checked={invertX} onChange={() => useStarwake.getState().toggleInvertX()} />
          </label>
          <label className="opt-row">
            <span>Reverse up / down</span>
            <input type="checkbox" checked={invertY} onChange={() => useStarwake.getState().toggleInvert()} />
          </label>
          <label className="opt-row">
            <span>Mute</span>
            <input type="checkbox" checked={muted} onChange={onMute} />
          </label>
          <label className="opt-row">
            <span>Planet orbit lines</span>
            <input type="checkbox" checked={showOrbits} onChange={() => useStarwake.getState().toggleOrbits()} />
          </label>
          <button type="button" className="h-btn" onClick={onSave}>
            {savedFlash ? "Saved" : "Save"}
          </button>
          <button type="button" className="h-btn" onClick={() => setLogOpen(true)}>
            Log
          </button>
          <button type="button" className="h-btn" onClick={leaveToMenu}>
            Menu
          </button>
          <SaveSlots compact />
          <div className="opt-keys" aria-label="Key bindings">
            <div>
              <kbd>A</kbd> <kbd>Z</kbd>
              <span>throttle · hold Z reverse</span>
            </div>
            <div>
              <kbd>Q</kbd> <kbd>E</kbd>
              <span>roll</span>
            </div>
            <div>
              <kbd>W</kbd> <kbd>S</kbd>
              <span>pitch</span>
            </div>
            <div>
              <kbd>←</kbd> <kbd>→</kbd>
              <span>yaw</span>
            </div>
            <div>
              <kbd>Space</kbd>
              <span>boost</span>
            </div>
            <div>
              <kbd>C</kbd>
              <span>charts</span>
            </div>
            <div>
              <kbd>Tab</kbd>
              <span>system / galaxy</span>
            </div>
            <div>
              <kbd>X</kbd> <kbd>J</kbd>
              <span>jump</span>
            </div>
            <div>
              <kbd>D</kbd>
              <span>dock</span>
            </div>
            <div>
              <kbd>Esc</kbd>
              <span>menu</span>
            </div>
          </div>
        </div>
      )}
      {logOpen && <LogBook onClose={() => setLogOpen(false)} />}
    </div>
  );
}

function Bar({
  label,
  value,
  teal,
  warn,
  dry,
}: {
  label: string;
  value: number;
  teal?: boolean;
  warn?: boolean;
  dry?: boolean;
}) {
  const pct = Math.max(0, Math.min(100, value * 100));
  return (
    <div className="bar">
      <span>{label}</span>
      <i>
        <b
          className={dry || warn ? "warn" : teal ? "teal" : ""}
          style={{ ["--fill" as string]: `${pct}%` }}
        />
      </i>
      <span>{Math.round(pct)}</span>
    </div>
  );
}

function Radar({ blips }: { blips: RadarBlip[] }) {
  return (
    <svg className="helion-radar" viewBox="0 0 160 160" aria-hidden="true">
      <circle cx="80" cy="80" r="70" fill="none" stroke="rgba(216,208,192,0.2)" strokeWidth="1" />
      <circle cx="80" cy="80" r="46" fill="none" stroke="rgba(111,191,182,0.28)" strokeWidth="1" />
      <circle cx="80" cy="80" r="22" fill="none" stroke="rgba(216,208,192,0.18)" strokeWidth="1" />
      <line x1="80" y1="10" x2="80" y2="150" stroke="rgba(216,208,192,0.12)" />
      <line x1="10" y1="80" x2="150" y2="80" stroke="rgba(216,208,192,0.12)" />
      <g className="sweep">
        <path d="M80 80 L80 12 A68 68 0 0 1 128 36 Z" fill="rgba(111,191,182,0.12)" />
      </g>
      {blips.map((b) => {
        const x = 80 + b.u * 66;
        const y = 80 - b.v * 66;
        const fill = b.lock ? "#6fbfb6" : b.kind === "station" ? "#c9b48a" : "#d8d0c0";
        if (b.h > 0.04) {
          return (
            <g key={b.id}>
              <line x1={x} y1={y} x2={x} y2={y - b.h * 10} stroke={fill} strokeWidth="1" opacity="0.55" />
              <circle cx={x} cy={y} r={b.lock ? 3.4 : b.kind === "star" ? 2.6 : 2.1} fill={fill} />
            </g>
          );
        }
        if (b.kind === "station") {
          return <rect key={b.id} x={x - 2} y={y - 2} width="4" height="4" fill={fill} />;
        }
        return <circle key={b.id} cx={x} cy={y} r={b.lock ? 3.4 : b.kind === "star" ? 2.6 : 2.1} fill={fill} />;
      })}
      <polygon points="80,72 84,88 80,84 76,88" fill="#d8d0c0" />
    </svg>
  );
}

function formatEta(sec: number | null | undefined) {
  if (sec == null || !Number.isFinite(sec) || sec < 0) return "hold";
  if (sec < 1) return "<1s";
  if (sec < 90) return sec < 10 ? `${sec.toFixed(1)}s` : `${Math.round(sec)}s`;
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  if (m < 120) return `${m}m ${String(s).padStart(2, "0")}s`;
  return `${Math.floor(m / 60)}h ${m % 60}m`;
}

function BoostButton({
  engine,
  disabled,
  active,
}: {
  engine: EngineHandle | null;
  disabled: boolean;
  active: boolean;
}) {
  const ref = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const down = (e: PointerEvent) => {
      if (el.disabled) return;
      e.preventDefault();
      el.setPointerCapture(e.pointerId);
      engine?.setBoost(true);
    };
    const up = () => {
      engine?.setBoost(false);
    };
    el.addEventListener("pointerdown", down);
    el.addEventListener("pointerup", up);
    el.addEventListener("pointercancel", up);
    return () => {
      el.removeEventListener("pointerdown", down);
      el.removeEventListener("pointerup", up);
      el.removeEventListener("pointercancel", up);
    };
  }, [engine]);
  return (
    <button ref={ref} type="button" className={`h-btn boost${active ? " on" : ""}`} disabled={disabled}>
      Boost
    </button>
  );
}
