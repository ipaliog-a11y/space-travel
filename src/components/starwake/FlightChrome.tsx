import { useCallback, useEffect, useRef, useState } from "react";
import { BookMarked, Map as MapIcon, Settings, Volume2, VolumeX } from "lucide-react";
import type { DriveHud, EngineHandle } from "@/lib/starwake/engine";
import { getCatalog, getSystem } from "@/lib/starwake/galaxy";
import { formatStop, holdUsed } from "@/lib/starwake/jobs";
import { lotLabel } from "@/lib/starwake/market";
import { fittedShip } from "@/lib/starwake/catalog";
import { useStarwake } from "@/lib/starwake/store";
import { isJumpMode, type FlightMode } from "@/lib/starwake/types";
import { useFlightWear } from "@/lib/starwake/use-flight-wear";
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

  const syncThr = useCallback((t: number, heat = 0) => {
    const el = thrRef.current;
    if (!el || !thrKnobRef.current || !fillRef.current) return;
    const trackH = Math.max(40, el.clientHeight - 36);
    const y = 28 + (1 - t) * trackH;
    thrKnobRef.current.style.top = `${y - 9}px`;
    fillRef.current.style.height = `${Math.max(0, t * 100)}%`;
    if (heatRef.current) heatRef.current.style.height = `${Math.max(0, heat * 25)}%`;
  }, []);

  useEffect(() => {
    if (!engine) return;
    return engine.subscribeDrive((d) => {
      setDrive(d);
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
      if (!dossier && !opts && !logOpen) return;
      e.preventDefault();
      e.stopPropagation();
      if (dossier) setDossier(false);
      else if (logOpen) setLogOpen(false);
      else setOpts(false);
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [dossier, opts, logOpen]);

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
      const t = 1 - Math.max(0, Math.min(1, (e.clientY - r.top - pad) / Math.max(1, r.height - pad * 2)));
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
  const cargo = useStarwake((s) => s.cargo[s.shipId] ?? []);

  useEffect(() => {
    setWearPenalty(
      wear ? calculateWearPenalty(wear.wearPoints, wear.maxWearPool) : 0,
    );
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
  const thrClass = `throttle${drive.overheated ? " hot" : ""}${drive.overdrive ? " od" : ""}`;
  const cap = fittedShip(shipId, loadout).cargoCap;
  const used = holdUsed(man, cargo);
  const canDock = Boolean(drive.atStationId && !drive.docking && !drive.berthed && !jumping);
  const logged = Boolean(body && surveys[body.id]);
  const canSurvey = Boolean(
    body &&
      body.wild &&
      body.prospect &&
      known &&
      !logged &&
      drive.well &&
      !jumping &&
      !drive.docking &&
      !drive.berthed,
  );

  return (
    <div className={`hud${mapOpen || opts ? " mapped" : ""}${logOpen ? " logged" : ""}`}>
      <div className={`crosshair${tagName ? " locked" : ""}`} aria-hidden="true">
        <span />
        <span />
      </div>
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

      <div className="lock-line">
        <div>{here.name}</div>
        {mode === "transit" && tagName ? (
          <div>
            Transit <strong>{tagName}</strong>
          </div>
        ) : tagName && (
          <div>
            {drive.navName ? "Look" : "On"} <strong>{tagName}</strong>
            {dist != null && (
              <span className="tag-dist">
                {" "}
                {dist < 10 ? dist.toFixed(1) : dist.toFixed(0)}
                {eta ? ` · ${eta}` : ""}
              </span>
            )}
          </div>
        )}
        <div className={drive.well ? "well on" : "well"}>
          {drive.well ? <>Well <strong>{drive.well}</strong></> : "Free"}
        </div>
        {drive.surveying && (
          <div className={drive.surveyPaused ? "well" : "well on"}>
            {drive.surveyPaused
              ? "Survey hold — reenter well"
              : <>Survey <strong>{Math.round(drive.survey01 * 100)}</strong></>}
          </div>
        )}
        {drive.atPlanet && !drive.navName && !drive.well && (
          <div>
            At <strong>{drive.atPlanet}</strong>
          </div>
        )}
        {locked && (
          <div>
            Locked <strong>{locked.name}</strong>
          </div>
        )}
      </div>

      <div className="speed-read" aria-label="Speed">
        <strong>{Math.round(drive.speed)}</strong>
        <span>{drive.coasting ? "orb" : "spd"}</span>
      </div>
      <div className={`fuel-read${drive.dry ? " dry" : ""}`} aria-label="Type one fuel">
        <strong>{Math.max(0, Math.round(drive.fuel))}</strong>
        <span>t1</span>
      </div>
      <div className={`fuel-read t2${drive.dry2 ? " dry" : ""}`} aria-label="Type two fuel">
        <strong>{Math.max(0, Math.round(drive.fuel2))}</strong>
        <span>t2</span>
      </div>
      {wear && (
        <div
          className={`wear-read${wear.wearPercentage > 20 ? " worn" : ""}`}
          aria-label="Hull condition"
        >
          <strong>{Math.max(0, 100 - wear.wearPercentage).toFixed(2)}</strong>
          <span>
            {wear.activity === "jump" || wear.activity === "dock"
              ? `${wear.ratePerMin.toFixed(1)}/evt`
              : `${wear.ratePerMin.toFixed(2)}/min`}
          </span>
          {wear.wearPercentage > 20 && (
            <span>
              -{Math.round(calculateWearPenalty(wear.wearPoints, wear.maxWearPool) * 100)}%
            </span>
          )}
        </div>
      )}
      {wear && (
        <div className="wear-debug" aria-label="Wear rate debug">
          <span>{wear.activity}</span>
          <strong>
            {wear.activity === "jump" || wear.activity === "dock"
              ? `${wear.ratePerMin.toFixed(1)}/evt`
              : `${wear.ratePerMin.toFixed(2)}/min`}
          </strong>
          <span>+{wear.pendingPoints.toFixed(3)} pend</span>
          <span>
            {wear.wearPoints.toFixed(2)}/{Math.round(wear.maxWearPool)}
          </span>
        </div>
      )}

      {(man || cargo.length > 0) && (
        <div className="job-chip" data-ui>
          <span className="job-chip-kind">
            {man ? `${man.loaded ? "hold" : "pickup"} · ${man.job.qty}u` : "own"}
          </span>
          <span className="job-chip-title">{man ? man.job.cargo : "owned"}</span>
          <span className="job-chip-route">
            {man ? `${formatStop(man.job.from)} → ${formatStop(man.job.to)}` : lotLabel(cargo)}
          </span>
          <span className="job-chip-hold">{used}/{Math.round(cap)}</span>
        </div>
      )}

      <div className="top-right" data-ui>
        <button type="button" className="icon-btn" onClick={onSave} aria-label="Save">
          {savedFlash ? "Ok" : "Save"}
        </button>
        <button type="button" className={`icon-btn${opts ? " on" : ""}`} onClick={() => setOpts((v) => !v)} aria-label="Options">
          <Settings size={16} strokeWidth={1.75} />
        </button>
        <button type="button" className={`icon-btn${logOpen ? " on" : ""}`} onClick={() => setLogOpen((v) => !v)} aria-label="Log">
          <BookMarked size={16} strokeWidth={1.75} />
        </button>
        <button type="button" className={`icon-btn${mapOpen ? " on" : ""}`} onClick={onMap} aria-label="Map">
          <MapIcon size={16} strokeWidth={1.75} />
        </button>
        <button type="button" className="icon-btn" onClick={onMute} aria-label={muted ? "Unmute" : "Mute"}>
          {muted ? <VolumeX size={16} strokeWidth={1.75} /> : <Volume2 size={16} strokeWidth={1.75} />}
        </button>
      </div>

      <div className="stick" ref={stickRef} data-ui aria-label="Ship stick">
        <label>Stick</label>
        <div className="stick-knob" ref={knobRef} />
      </div>

      <div className="drive-dock">
      <div className={thrClass} ref={thrRef} data-ui aria-label="Throttle">
        <label>{drive.overheated ? "Heat" : drive.overdrive ? "Od" : "Thr"}</label>
        <div className="throttle-track">
          <div className="throttle-od-zone" />
          <div className="throttle-heat" ref={heatRef} />
          <div className="throttle-fill" ref={fillRef} />
          <div className="throttle-notch" />
        </div>
        <div className="throttle-knob" ref={thrKnobRef} />
      </div>

      <div className="flight-actions" data-ui>
        {body && (
          <button
            type="button"
            className="act-btn scan"
            onClick={() => (known ? setDossier(true) : onScan())}
          >
            {known ? "Dossier" : "Scan"}
          </button>
        )}
        {canSurvey && !drive.surveying && (
          <button
            type="button"
            className="act-btn scan"
            onClick={() => engine?.requestSurvey()}
          >
            Survey
          </button>
        )}
        {drive.surveying && !drive.surveyPaused && (
          <button type="button" className="act-btn scan active" disabled>
            Surveying
          </button>
        )}
        {canDock && (
          <button
            type="button"
            className="act-btn scan"
            onClick={() => engine?.requestDock()}
          >
            Dock
          </button>
        )}
        {drive.docking && (
          <button
            type="button"
            className="act-btn scan"
            onClick={() => engine?.cancelDock()}
          >
            Abort
          </button>
        )}
        <button
          type="button"
          className="act-btn jump"
          disabled={!canJump}
          onClick={onJump}
        >
          Jump
        </button>
        <div className="boost-col">
          <div className="boost-pips" aria-label={`${drive.boostCharges} boosts`}>
            {Array.from({ length: drive.boostMax }, (_, i) => (
              <span key={i} className={i < drive.boostCharges ? "on" : ""} />
            ))}
          </div>
          <BoostButton
            engine={engine}
            disabled={jumping || !drive.boostArmed || (drive.boostCharges <= 0 && !drive.boosting)}
            active={drive.boosting}
          />
          <button
            type="button"
            className="refill"
            onClick={() => engine?.refillBoosts()}
          >
            Refill
          </button>
          <button
            type="button"
            className={`refill${drive.dry || drive.dry2 ? " dry" : ""}`}
            disabled
            title="Fill at a lock"
          >
            Pump
          </button>
        </div>
      </div>
      </div>

      {(mode === "charging" || mode === "transit" || drive.surveying) && (
        <div className={`charge-bar${mode === "transit" ? " cruise" : ""}`} aria-hidden="true">
          <span style={{ width: `${Math.round((mode === "charging" || mode === "transit" ? charge01 : drive.survey01) * 100)}%` }} />
        </div>
      )}

      {dossier && drive.atPlanetId && (
        <Dossier
          systemId={systemId}
          planetId={drive.atPlanetId}
          onClose={() => setDossier(false)}
        />
      )}

      {drive.docking && (
        <div className="dock-hud">
          <div className="dock-title">Threading gate {drive.gateIndex + 1} / 10</div>
          <div className="dock-gate" aria-hidden="true" />
          <div className="dock-meters">
            <div><span>Offset</span><i><b style={{ width: `${Math.max(4, Math.min(100, (1 - drive.alignOff) * 100))}%` }} /></i></div>
            <div><span>Heading</span><i><b style={{ width: `${Math.max(4, Math.min(100, drive.alignHead * 100))}%` }} /></i></div>
            <div><span>Speed</span><i><b style={{ width: `${Math.max(4, Math.min(100, (1 - drive.alignSpd) * 100))}%` }} /></i></div>
          </div>
          <p className="dock-hint">Slow. Center the gate. Fly through.</p>
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
          <SaveSlots compact />
          <div className="opt-keys" aria-label="Key bindings">
            <div><kbd>A</kbd> <kbd>Z</kbd><span>throttle</span></div>
            <div><kbd>Q</kbd> <kbd>E</kbd><span>roll</span></div>
            <div><kbd>W</kbd> <kbd>S</kbd><span>pitch</span></div>
            <div><kbd>←</kbd> <kbd>→</kbd><span>yaw</span></div>
            <div><kbd>Space</kbd><span>boost</span></div>
            <div><kbd>R</kbd><span>boosts</span></div>
            <div><kbd>N</kbd><span>map</span></div>
            <div><kbd>J</kbd><span>jump</span></div>
            <div><kbd>Esc</kbd><span>menu</span></div>
          </div>
        </div>
      )}
      {logOpen && <LogBook onClose={() => setLogOpen(false)} />}
    </div>
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
    <button ref={ref} type="button" className={`act-btn boost${active ? " active" : ""}`} disabled={disabled}>
      Boost
    </button>
  );
}
