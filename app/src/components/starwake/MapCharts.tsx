import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { formatEcc, formatPeriod, formatPeriodLine, GALAXY, distLy, plotRoute } from "@/lib/starwake/galaxy";
import { keplerPlane } from "@/lib/starwake/orbit";
import type { LocalTarget } from "@/lib/starwake/engine";
import type { Planet, StarSystem, StationKind } from "@/lib/starwake/types";

function rgb(c: [number, number, number], a = 1) {
  const r = Math.round(c[0] * 255);
  const g = Math.round(c[1] * 255);
  const b = Math.round(c[2] * 255);
  return a < 1 ? `rgb(${r} ${g} ${b} / ${a})` : `rgb(${r} ${g} ${b})`;
}

function ringRadius(orbit: number, maxOrbit: number) {
  const t = Math.sqrt(Math.max(0.04, orbit / Math.max(maxOrbit, 1)));
  return 42 + t * 108;
}

function PortMark({
  x, y, kind, on, onPick, id, interactive,
}: {
  x: number; y: number; kind: StationKind; on: boolean; id: string;
  interactive?: boolean; onPick: (t: LocalTarget) => void;
}) {
  const cls = on ? "sys-port on" : "sys-port";
  const click = interactive
    ? (e: { stopPropagation: () => void }) => {
      e.stopPropagation();
      onPick({ kind: "station", id });
    }
    : undefined;
  if (kind === "cylinder") {
    return <rect x={x - 1.6} y={y - 3.4} width="3.2" height="6.8" rx="1.2" className={cls} onClick={click} />;
  }
  if (kind === "sphere") {
    return (
      <g className={cls} onClick={click}>
        <circle cx={x} cy={y} r="2.8" fill="none" />
        <circle cx={x} cy={y} r="1.1" />
      </g>
    );
  }
  if (kind === "truss") {
    return (
      <g className={cls} onClick={click}>
        <rect x={x - 3.4} y={y - 0.7} width="6.8" height="1.4" />
        <rect x={x - 0.7} y={y - 2.6} width="1.4" height="5.2" />
      </g>
    );
  }
  if (kind === "yard") {
    return <rect x={x - 2.6} y={y - 2.6} width="5.2" height="5.2" className={cls} onClick={click} />;
  }
  return (
    <g className={cls} onClick={click}>
      <circle cx={x} cy={y} r="3.1" fill="none" />
      <circle cx={x} cy={y} r="1.05" />
    </g>
  );
}

function planetDot(p: Planet) {
  const gas = p.kind === "gas" || p.kind === "ringed" || p.kind === "icegiant";
  return gas ? 6.2 : 3.6 + Math.min(2.4, p.radius * 0.05);
}

function mapPlane(x: number, y: number, sma: number, maxOrbit: number, cx: number, cy: number) {
  const rr = ringRadius(sma, maxOrbit);
  const s = rr / Math.max(sma, 1);
  return {
    x: cx + x * s,
    y: cy + y * s,
    rr,
    ang: Math.atan2(y, x),
    dist: Math.hypot(x, y),
  };
}

function buildOrbit(p: Planet, maxOrbit: number, cx: number, cy: number, pang: number) {
  const n = p.meanN || 1e-4;
  const samples = 80;
  const parts: string[] = [];
  let label = { x: cx, y: cy };
  let labelDiff = Math.PI * 2;
  let peri = { x: cx, y: cy };
  let periR = Infinity;
  for (let i = 0; i <= samples; i++) {
    const t = ((Math.PI * 2 * i) / samples - p.m0) / n;
    const [px, py] = keplerPlane(p, t);
    const pt = mapPlane(px, py, p.orbit, maxOrbit, cx, cy);
    parts.push(`${i === 0 ? "M" : "L"}${pt.x.toFixed(2)} ${pt.y.toFixed(2)}`);
    if (i === samples) continue;
    if (pt.dist < periR) {
      periR = pt.dist;
      peri = pt;
    }
    let d = Math.abs(pt.ang - pang);
    if (d > Math.PI) d = Math.PI * 2 - d;
    if (d < labelDiff) {
      labelDiff = d;
      label = pt;
    }
  }
  parts.push("Z");
  const dx = label.x - cx;
  const dy = label.y - cy;
  const len = Math.hypot(dx, dy) || 1;
  const out = 9;
  return {
    d: parts.join(""),
    label: { x: cx + (dx / len) * (len + out), y: cy + (dy / len) * (len + out) },
    peri,
  };
}

const ZOOM_MIN = 0.35;
const ZOOM_MAX = 10;
const VIS_Z = 2.6;
const GRID_LY = [10, 20, 30, 40];

type ZoomFrameProps = {
  enabled: boolean;
  label: string;
  children: ReactNode;
};

function ZoomRail({
  zoom,
  label,
  onZoom,
  onReset,
  extra,
}: {
  zoom: number;
  label: string;
  onZoom: (z: number) => void;
  onReset: () => void;
  extra?: ReactNode;
}) {
  return (
    <div className="zoom-tools" data-ui>
      <div className="zoom-rail">
        <button type="button" aria-label={`Zoom in ${label}`} onClick={() => onZoom(Math.min(ZOOM_MAX, zoom * 1.28))}>+</button>
        <input
          type="range"
          min={ZOOM_MIN}
          max={ZOOM_MAX}
          step={0.05}
          value={zoom}
          aria-label={`${label} scale`}
          onChange={(e) => onZoom(Number(e.target.value))}
        />
        <button type="button" aria-label={`Zoom out ${label}`} onClick={() => onZoom(Math.max(ZOOM_MIN, zoom / 1.28))}>−</button>
      </div>
      <button type="button" aria-label={`Reset ${label} map`} onClick={onReset}>
        {Math.round(zoom * 100)}%
      </button>
      {extra}
    </div>
  );
}

function ZoomFrame({ enabled, label, children }: ZoomFrameProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const drag = useRef<{ x: number; y: number; px: number; py: number } | null>(null);
  const pointers = useRef<Map<number, { x: number; y: number }>>(new Map());
  const pinch = useRef<{ dist: number; zoom: number } | null>(null);

  function clampZoom(z: number) {
    return Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, z));
  }

  function zoomAt(clientX: number, clientY: number, next: number) {
    const el = wrapRef.current;
    if (!el) {
      setZoom(clampZoom(next));
      return;
    }
    const rect = el.getBoundingClientRect();
    const mx = clientX - rect.left - rect.width / 2;
    const my = clientY - rect.top - rect.height / 2;
    setZoom((z) => {
      const n = clampZoom(next);
      const k = n / z;
      setPan((p) => ({ x: mx - (mx - p.x) * k, y: my - (my - p.y) * k }));
      return n;
    });
  }

  useEffect(() => {
    if (!enabled) return;
    const el = wrapRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const factor = e.deltaY > 0 ? 0.88 : 1.14;
      setZoom((z) => {
        const n = clampZoom(z * factor);
        const rect = el.getBoundingClientRect();
        const mx = e.clientX - rect.left - rect.width / 2;
        const my = e.clientY - rect.top - rect.height / 2;
        const k = n / z;
        setPan((p) => ({ x: mx - (mx - p.x) * k, y: my - (my - p.y) * k }));
        return n;
      });
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [enabled]);

  if (!enabled) return <>{children}</>;

  function reset() {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }

  return (
    <div
      ref={wrapRef}
      className="zoom-frame"
      onPointerDown={(e) => {
        if ((e.target as HTMLElement).closest(".zoom-tools")) return;
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
        pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
        if (pointers.current.size === 2) {
          const pts = [...pointers.current.values()];
          pinch.current = {
            dist: Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y),
            zoom,
          };
          drag.current = null;
          return;
        }
        drag.current = { x: e.clientX, y: e.clientY, px: pan.x, py: pan.y };
      }}
      onPointerMove={(e) => {
        if (pointers.current.has(e.pointerId)) pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
        if (pointers.current.size === 2 && pinch.current) {
          const pts = [...pointers.current.values()];
          const d = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
          const next = pinch.current.zoom * (d / Math.max(24, pinch.current.dist));
          zoomAt((pts[0].x + pts[1].x) / 2, (pts[0].y + pts[1].y) / 2, next);
          return;
        }
        if (!drag.current) return;
        setPan({
          x: drag.current.px + (e.clientX - drag.current.x),
          y: drag.current.py + (e.clientY - drag.current.y),
        });
      }}
      onPointerUp={(e) => {
        pointers.current.delete(e.pointerId);
        if (pointers.current.size < 2) pinch.current = null;
        drag.current = null;
      }}
      onPointerCancel={(e) => {
        pointers.current.delete(e.pointerId);
        pinch.current = null;
        drag.current = null;
      }}
      onDoubleClick={reset}
    >
      <div
        className="zoom-stage"
        style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})` }}
      >
        {children}
      </div>
      <ZoomRail zoom={zoom} label={label} onZoom={(z) => setZoom(clampZoom(z))} onReset={reset} />
    </div>
  );
}

type SystemDiagramProps = {
  system: StarSystem;
  selectedId: string | null;
  onPick: (t: LocalTarget) => void;
  showShip?: boolean;
  interactive?: boolean;
};

export function SystemDiagram({ system, selectedId, onPick, showShip = true, interactive = true }: SystemDiagramProps) {
  const [t, setT] = useState(0);
  const [ship, setShip] = useState<[number, number, number] | null>(null);

  useEffect(() => {
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    let raf = 0;
    let last = 0;
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      if (now - last < 220) return;
      last = now;
      if (!reduce) setT(now / 1000);
      if (showShip && window.__starwake?.getSystemId?.() === system.id) {
        const dbg = window.__starwake.getScaleDebug?.();
        setShip(dbg?.ship ?? null);
      } else {
        setShip(null);
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [system.id, showShip]);

  const maxOrbit = Math.max(
    ...system.planets.map((p) => p.orbit),
    system.belt?.outer ?? 0,
    ...system.comets.map((c) => c.orbit),
    1,
  );
  const cx = 160;
  const cy = 160;
  const starR = Math.min(15, 7 + system.starRadius * 0.07);
  const starOn = selectedId === "star";
  const pang = Math.PI * 0.32;
  const orbits = useMemo(
    () => system.planets.map((p) => ({ id: p.id, ...buildOrbit(p, maxOrbit, cx, cy, pang) })),
    [system, maxOrbit],
  );

  return (
    <ZoomFrame enabled={interactive} label={`${system.name} system`}>
    <svg
      className="sys-diagram"
      viewBox="0 0 320 320"
      role="img"
      aria-label={`${system.name} system diagram`}
    >
      <circle cx={cx} cy={cy} r={150} className="sys-void" />
      {orbits.map((orbit) => {
        const p = system.planets.find((pl) => pl.id === orbit.id);
        if (!p) return null;
        const on = selectedId === p.id;
        return (
          <g key={`${p.id}-orbit`}>
            <path
              d={orbit.d}
              className={on ? "sys-orbit on" : "sys-orbit"}
            />
            {on && (
              <circle
                cx={orbit.peri.x}
                cy={orbit.peri.y}
                r="1.7"
                className="sys-peri"
              />
            )}
            {interactive && (
              <text
                x={orbit.label.x}
                y={orbit.label.y}
                className={on ? "sys-period on" : "sys-period"}
                textAnchor="middle"
              >
                <tspan x={orbit.label.x} dy="0.15em">{formatPeriod(p.yearDays)}</tspan>
                <tspan x={orbit.label.x} dy="7">{formatEcc(p.ecc)}</tspan>
              </text>
            )}
          </g>
        );
      })}
      <g
        className={starOn ? "sys-body on" : "sys-body"}
        role={interactive ? "button" : undefined}
        tabIndex={interactive ? 0 : undefined}
        aria-label={`${system.name} star`}
        onClick={interactive ? () => onPick({ kind: "star" }) : undefined}
        onKeyDown={interactive ? (e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onPick({ kind: "star" });
          }
        } : undefined}
      >
        <circle cx={cx} cy={cy} r={starR + 4} className="sys-hit" />
        <circle cx={cx} cy={cy} r={starR} fill={rgb(system.starColor)} className="sys-star" />
      </g>
      {system.belt && (
        <g
          className={selectedId === system.belt.id ? "sys-belt on" : "sys-belt"}
          role={interactive ? "button" : undefined}
          tabIndex={interactive ? 0 : undefined}
          aria-label={system.belt.name}
          onClick={interactive ? () => onPick({ kind: "belt" }) : undefined}
        >
          <circle cx={cx} cy={cy} r={ringRadius(system.belt.inner, maxOrbit)} className="sys-belt-ring" />
          <circle cx={cx} cy={cy} r={ringRadius(system.belt.outer, maxOrbit)} className="sys-belt-ring" />
        </g>
      )}
      {system.planets.map((p) => {
        const [px, py] = keplerPlane(p, t);
        const { x, y } = mapPlane(px, py, p.orbit, maxOrbit, cx, cy);
        const pr = planetDot(p);
        const on = selectedId === p.id;
        const label = p.name.split(" ").pop() ?? p.name;
        const fromC = Math.hypot(x - cx, y - cy) || 1;
        const lx = cx + ((x - cx) / fromC) * (fromC + 11);
        const ly = cy + ((y - cy) / fromC) * (fromC + 11);
        return (
          <g
            key={p.id}
            className={on ? "sys-body on" : "sys-body"}
            role={interactive ? "button" : undefined}
            tabIndex={interactive ? 0 : undefined}
            aria-label={`${p.name}, period ${formatPeriodLine(p)}`}
            onClick={interactive ? () => onPick({ kind: "planet", id: p.id }) : undefined}
            onKeyDown={interactive ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onPick({ kind: "planet", id: p.id });
              }
            } : undefined}
          >
            <circle cx={x} cy={y} r={Math.max(9, pr + 5)} className="sys-hit" />
            {p.rings && (
              <ellipse
                cx={x}
                cy={y}
                rx={pr + 5}
                ry={pr * 0.45}
                className="sys-rings"
                fill="none"
              />
            )}
            <circle cx={x} cy={y} r={pr} fill={rgb(p.color)} />
            {p.moons.map((m, i) => {
              const a = m.phase + t * m.meanN;
              const md = pr + 4.2 + i * 2.1;
              return (
                <circle
                  key={m.id}
                  cx={x + Math.cos(a) * md}
                  cy={y + Math.sin(a) * md}
                  r="1.35"
                  fill={rgb(m.color)}
                  className="sys-moon"
                />
              );
            })}
            {p.stationId && (
              <PortMark
                x={x + pr + 4.4}
                y={y}
                kind={(system.stations.find((s) => s.id === p.stationId)?.kind ?? "wheel") as StationKind}
                on={selectedId === p.stationId}
                id={p.stationId}
                interactive={interactive}
                onPick={onPick}
              />
            )}
            <text x={lx} y={ly} className="sys-label" textAnchor="middle" dy="0.35em">
              {label}{p.interest === "wild" ? " ·" : ""}
            </text>
          </g>
        );
      })}
      {system.comets.map((c) => {
        const [px, py] = keplerPlane(c, t);
        const { x, y } = mapPlane(px, py, c.orbit, maxOrbit, cx, cy);
        const on = selectedId === c.id;
        return (
          <g
            key={c.id}
            className={on ? "sys-body on" : "sys-body"}
            role={interactive ? "button" : undefined}
            tabIndex={interactive ? 0 : undefined}
            aria-label={c.name}
            onClick={interactive ? () => onPick({ kind: "comet", id: c.id }) : undefined}
          >
            <circle cx={x} cy={y} r="8" className="sys-hit" />
            <circle cx={x} cy={y} r="2.1" fill={rgb(c.color)} className="sys-comet" />
            <text x={x + 6} y={y - 5} className="sys-label" textAnchor="start">{c.name}</text>
          </g>
        );
      })}
      {ship && (
        <ShipMark
          cx={cx}
          cy={cy}
          maxOrbit={maxOrbit}
          x={ship[0]}
          z={ship[2]}
        />
      )}
    </svg>
    </ZoomFrame>
  );
}

function ShipMark({
  cx, cy, maxOrbit, x, z,
}: {
  cx: number; cy: number; maxOrbit: number; x: number; z: number;
}) {
  const dist = Math.hypot(x, z);
  const rr = ringRadius(Math.max(dist, 1), maxOrbit);
  const ang = Math.atan2(z, x);
  const px = cx + Math.cos(ang) * rr;
  const py = cy + Math.sin(ang) * rr;
  return (
    <g className="sys-ship" aria-hidden="true">
      <circle cx={px} cy={py} r="3.2" />
    </g>
  );
}

type GalaxyChartProps = {
  here: StarSystem;
  range: number;
  lockedId: string | null;
  jumping: boolean;
  onPick: (id: string) => void;
};

function project3(
  x: number, y: number, z: number,
  yaw: number, pitch: number, zoom: number,
  cx: number, cy: number,
) {
  const cyw = Math.cos(yaw), syw = Math.sin(yaw);
  const x1 = x * cyw - y * syw;
  const y1 = x * syw + y * cyw;
  const cp = Math.cos(pitch), sp = Math.sin(pitch);
  const y2 = y1 * cp - z * sp;
  const z2 = y1 * sp + z * cp;
  const persp = 1.2 / (1.2 + z2 * 0.011);
  const s = 4.05 * zoom * persp;
  return { x: cx + x1 * s, y: cy - y2 * s, depth: z2, k: persp };
}

export function GalaxyChart({
  here,
  range,
  lockedId,
  jumping,
  onPick,
}: GalaxyChartProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [yaw, setYaw] = useState(0.62);
  const [pitch, setPitch] = useState(0.48);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [hoverId, setHoverId] = useState<string | null>(null);
  const drag = useRef<{
    kind: "orbit" | "pan";
    x: number;
    y: number;
    yaw: number;
    pitch: number;
    px: number;
    py: number;
  } | null>(null);
  const dest = lockedId ? GALAXY.find((s) => s.id === lockedId) ?? null : null;
  const route = dest && dest.id !== here.id ? plotRoute(here, dest, range) : null;
  const hopOf = useMemo(() => {
    const m = new Map<string, number>();
    route?.forEach((s, i) => m.set(s.id, i));
    return m;
  }, [route]);

  function clampZoom(z: number) {
    return Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, z));
  }

  function resetView() {
    setYaw(0.62);
    setPitch(0.48);
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }

  useEffect(() => {
    const el = wrapRef.current;
    if (!el || jumping) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setZoom((z) => clampZoom(z * (e.deltaY > 0 ? 0.88 : 1.14)));
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [jumping]);

  const cx = 210 + pan.x;
  const cy = 168 + pan.y;

  const ring = useMemo(() => {
    const pts: string[] = [];
    for (let i = 0; i <= 64; i++) {
      const a = (i / 64) * Math.PI * 2;
      const p = project3(
        here.x + Math.cos(a) * range,
        here.y + Math.sin(a) * range,
        (here.z ?? 0) * VIS_Z,
        yaw, pitch, zoom, cx, cy,
      );
      pts.push(`${i === 0 ? "M" : "L"}${p.x.toFixed(1)} ${p.y.toFixed(1)}`);
    }
    return pts.join("") + "Z";
  }, [here, range, yaw, pitch, zoom, cx, cy]);

  const grids = useMemo(() => {
    return GRID_LY.map((r) => {
      const pts: string[] = [];
      for (let i = 0; i <= 64; i++) {
        const a = (i / 64) * Math.PI * 2;
        const p = project3(Math.cos(a) * r, Math.sin(a) * r, 0, yaw, pitch, zoom, cx, cy);
        pts.push(`${i === 0 ? "M" : "L"}${p.x.toFixed(1)} ${p.y.toFixed(1)}`);
      }
      return { r, d: pts.join("") + "Z" };
    });
  }, [yaw, pitch, zoom, cx, cy]);

  const axis = useMemo(() => {
    const o = project3(0, 0, 0, yaw, pitch, zoom, cx, cy);
    const z = project3(0, 0, 8, yaw, pitch, zoom, cx, cy);
    const x = project3(8, 0, 0, yaw, pitch, zoom, cx, cy);
    return { o, z, x };
  }, [yaw, pitch, zoom, cx, cy]);

  const stars = useMemo(() => {
    return GALAXY.map((system) => {
      const vis = (system.z ?? 0) * VIS_Z;
      const p = project3(system.x, system.y, vis, yaw, pitch, zoom, cx, cy);
      const foot = project3(system.x, system.y, 0, yaw, pitch, zoom, cx, cy);
      const ly = system.id === here.id ? 0 : distLy(here, system);
      return { system, p, foot, ly };
    }).sort((a, b) => a.p.depth - b.p.depth);
  }, [here, yaw, pitch, zoom, cx, cy]);

  const routePath = useMemo(() => {
    if (!route || route.length < 2) return "";
    return route.map((s, i) => {
      const p = project3(s.x, s.y, (s.z ?? 0) * VIS_Z, yaw, pitch, zoom, cx, cy);
      return `${i === 0 ? "M" : "L"}${p.x.toFixed(1)} ${p.y.toFixed(1)}`;
    }).join(" ");
  }, [route, yaw, pitch, zoom, cx, cy]);

  const az = ((yaw * 180 / Math.PI) % 360 + 360) % 360;
  const el = pitch * 180 / Math.PI;

  return (
    <div
      ref={wrapRef}
      className="gal-view"
      onPointerDown={(e) => {
        if ((e.target as HTMLElement).closest(".zoom-tools, .gal-star")) return;
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
        const panMode = e.shiftKey || e.altKey || e.button === 1;
        drag.current = {
          kind: panMode ? "pan" : "orbit",
          x: e.clientX,
          y: e.clientY,
          yaw,
          pitch,
          px: pan.x,
          py: pan.y,
        };
      }}
      onPointerMove={(e) => {
        if (!drag.current) return;
        if (drag.current.kind === "pan") {
          setPan({
            x: drag.current.px + (e.clientX - drag.current.x),
            y: drag.current.py + (e.clientY - drag.current.y),
          });
          return;
        }
        setYaw(drag.current.yaw + (e.clientX - drag.current.x) * 0.008);
        setPitch(Math.max(-0.12, Math.min(1.22, drag.current.pitch + (e.clientY - drag.current.y) * 0.007)));
      }}
      onPointerUp={() => { drag.current = null; }}
      onPointerCancel={() => { drag.current = null; }}
      onDoubleClick={resetView}
    >
      <svg className="sys-diagram gal-diagram" viewBox="0 0 420 336" role="img" aria-label="Galaxy, 3D">
        {grids.map((g) => (
          <path key={g.r} d={g.d} className="gal-grid" />
        ))}
        <line x1={axis.o.x} y1={axis.o.y} x2={axis.z.x} y2={axis.z.y} className="gal-axis" />
        <line x1={axis.o.x} y1={axis.o.y} x2={axis.x.x} y2={axis.x.y} className="gal-axis dim" />
        <text x={axis.z.x} y={axis.z.y - 4} className="gal-axis-label" textAnchor="middle">z</text>
        <path d={ring} className="gal-range" />
        {stars.map(({ system, p, foot, ly }) => {
          const inRange = ly <= range + 1e-4;
          const locked = lockedId === system.id;
          const hereSys = system.id === here.id;
          const hopIndex = hopOf.get(system.id) ?? -1;
          const onRoute = hopIndex >= 0;
          const hovered = hoverId === system.id;
          const r = (hereSys ? 5.2 : 2.6 + Math.min(2.4, system.starRadius * 0.018)) * p.k;
          const fog = 0.42 + 0.58 * Math.min(1, Math.max(0, (p.depth + 36) / 72));
          const cls = `gal-star${hereSys ? " here" : ""}${locked ? " locked" : ""}${inRange ? "" : " oor"}${onRoute ? " via" : ""}`;
          const showName = hereSys || locked || hovered || (onRoute && (hopIndex === 1 || hopIndex === (route?.length ?? 0) - 1));
          return (
            <g
              key={system.id}
              className={cls}
              role={hereSys ? "img" : "button"}
              tabIndex={hereSys || jumping ? -1 : 0}
              aria-label={`${system.name}${hereSys ? " (here)" : ` ${ly.toFixed(1)} ly`}`}
              opacity={fog}
              onPointerEnter={() => setHoverId(system.id)}
              onPointerLeave={() => setHoverId((id) => id === system.id ? null : id)}
              onClick={() => {
                if (hereSys || jumping) return;
                onPick(system.id);
              }}
              onKeyDown={(e) => {
                if (hereSys || jumping) return;
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onPick(system.id);
                }
              }}
            >
              <line x1={foot.x} y1={foot.y} x2={p.x} y2={p.y} className="gal-stem" />
              <circle cx={p.x} cy={p.y} r={Math.max(8, r + 5)} className="sys-hit" />
              <circle cx={p.x} cy={p.y} r={r * 2.2} fill={rgb(system.starColor, 0.14)} />
              <circle cx={p.x} cy={p.y} r={r} fill={rgb(system.starColor)} />
              {onRoute && hopIndex > 0 && (
                <text x={p.x + r + 3} y={p.y + 3} className="gal-hop">{hopIndex}</text>
              )}
              {showName && (
                <text x={p.x} y={p.y - r - 6} className="sys-label" textAnchor="middle">
                  {system.name}
                </text>
              )}
            </g>
          );
        })}
        {routePath && <path d={routePath} className="gal-route" />}
      </svg>
      <div className="map-hud">
        <span>az {az.toFixed(0)}°</span>
        <span>el {el.toFixed(0)}°</span>
        <span>{zoom.toFixed(2)}×</span>
        <span className="map-hud-hint">drag orbit · shift pan</span>
      </div>
      <ZoomRail
        zoom={zoom}
        label="galaxy"
        onZoom={(z) => setZoom(clampZoom(z))}
        onReset={resetView}
        extra={(
          <button type="button" aria-label="Top-down galaxy" onClick={() => { setPitch(1.18); setYaw(0); setPan({ x: 0, y: 0 }); }}>
            Top
          </button>
        )}
      />
    </div>
  );
}

