import { useEffect, useMemo, useState } from "react";
import { fittedShip } from "@/lib/starwake/catalog";
import {
  catalogSystems,
  distLy,
  formatPeriodLine,
  getMoon,
  getPlanet,
  getStation,
  getSystem,
  nextHop,
  plotRoute,
  planetOfStation,
  routeLengthLy,
  NEBULA_LABEL,
} from "@/lib/starwake/galaxy";
import type { LocalTarget } from "@/lib/starwake/engine";
import { useStarwake } from "@/lib/starwake/store";
import type { MapLayer, ShipId } from "@/lib/starwake/types";
import { Dossier } from "./Dossier";
import { GalaxyChart, SystemDiagram } from "./MapCharts";

type Props = {
  systemId: string;
  lockedId: string | null;
  shipId: ShipId;
  layer: MapLayer;
  jumping: boolean;
  onLayer: (l: MapLayer) => void;
  onLock: (id: string) => void;
  onJump: () => void;
  onGoBody: (target: LocalTarget) => void;
  onLookBody: (target: LocalTarget, keepMap?: boolean) => void;
  onClose: () => void;
};

export function MapPanel({
  systemId,
  lockedId,
  shipId,
  layer,
  jumping,
  onLayer,
  onLock,
  onJump,
  onGoBody,
  onLookBody,
  onClose,
}: Props) {
  const loadout = useStarwake((s) => s.loadout);
  const here = getSystem(systemId);
  const range = fittedShip(shipId, loadout).jumpRangeLy;
  const catalog = catalogSystems(here);
  const dest = lockedId ? getSystem(lockedId) : null;
  const route = dest && dest.id !== here.id ? plotRoute(here, dest, range) : null;
  const hop = dest && dest.id !== here.id ? nextHop(here, dest, range) : null;
  const canJump = Boolean(hop && !jumping);
  const hops = route ? route.length - 1 : 0;
  const plotLy = route ? routeLengthLy(route) : 0;
  const scanned = useStarwake((s) => s.scanned);
  const surveys = useStarwake((s) => s.surveys);
  const [fileId, setFileId] = useState<string | null>(null);
  const [pick, setPick] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "reach" | "plot">("all");
  const [query, setQuery] = useState("");

  const pickPlanet = pick && pick !== "star"
    ? (getPlanet(systemId, pick) ?? planetOfStation(systemId, pick))
    : null;
  const pickStation = pick && pick !== "star" ? getStation(systemId, pick) : null;

  const listed = useMemo(() => {
    let rows = catalog;
    if (filter === "reach") rows = rows.filter((n) => n.ly <= range + 1e-4);
    if (filter === "plot" && route) {
      const ids = new Set(route.map((s) => s.id));
      rows = rows.filter((n) => ids.has(n.system.id));
    }
    const q = query.trim().toLowerCase();
    if (q) rows = rows.filter((n) => n.system.name.toLowerCase().includes(q));
    return rows;
  }, [catalog, filter, range, route, query]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== "Escape") return;
      if (!fileId) return;
      e.preventDefault();
      e.stopPropagation();
      setFileId(null);
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [fileId]);

  function pickBody(target: LocalTarget) {
    const id = target.kind === "star" ? "star" : target.kind === "belt" ? (here.belt?.id ?? "belt") : target.id;
    setPick(id);
    onLookBody(target, true);
  }

  function targetOfPick(): LocalTarget {
    if (!pick || pick === "star") return { kind: "star" };
    if (here.belt && pick === here.belt.id) return { kind: "belt" };
    if (here.comets.some((c) => c.id === pick)) return { kind: "comet", id: pick };
    if (getMoon(systemId, pick)) return { kind: "moon", id: pick };
    if (getStation(systemId, pick)) return { kind: "station", id: pick };
    const p = getPlanet(systemId, pick);
    if (p?.stationId && pick === p.stationId) return { kind: "station", id: pick };
    return { kind: "planet", id: pick };
  }

  function selectStar(id: string) {
    if (jumping) return;
    onLock(id);
  }

  const pickLabel = pick === "star"
    ? `${here.name} star`
    : pickStation
      ? pickStation.name
      : pickPlanet
        ? pickPlanet.name
        : here.name;

  const destLine = dest && dest.id !== here.id
    ? hops > 1
      ? `${distLy(here, dest).toFixed(1)} ly · ${hops} hops · ${plotLy.toFixed(1)} ly plot`
      : hop
        ? `${distLy(here, dest).toFixed(1)} ly · direct`
        : `${distLy(here, dest).toFixed(1)} ly · no route`
    : `${NEBULA_LABEL[here.nebula?.kind ?? "arm"]} · ${range.toFixed(0)} ly reach`;

  return (
    <>
      <div className="map-panel nav-console" data-ui>
        <div className="map-head">
          <div className="nav-kicker">Nav</div>
          <div className="map-tabs">
            <button type="button" className={layer === "system" ? "on" : ""} onClick={() => onLayer("system")}>
              System
            </button>
            <button type="button" className={layer === "galaxy" ? "on" : ""} onClick={() => onLayer("galaxy")}>
              Galaxy
            </button>
          </div>
          <span className="nav-range">{range.toFixed(0)} ly jump</span>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close map">
            <CloseIcon />
          </button>
        </div>

        <div className="map-body">
          <div className="map-view">
            <div className="map-frame" aria-hidden="true">
              <i className="tick tl" />
              <i className="tick tr" />
              <i className="tick bl" />
              <i className="tick br" />
            </div>
            <div className="map-chart">
              {layer === "system" ? (
                <SystemDiagram system={here} selectedId={pick} onPick={pickBody} />
              ) : (
                <GalaxyChart
                  here={here}
                  range={range}
                  lockedId={lockedId}
                  jumping={jumping}
                  onPick={selectStar}
                />
              )}
            </div>
          </div>

          <div className="map-rail">
            {layer === "galaxy" && dest && dest.id !== here.id && (
              <div className="nav-route">
                <div className="nav-route-head">
                  {route
                    ? `Plot · ${hops} hop${hops === 1 ? "" : "s"} · ${plotLy.toFixed(1)} ly`
                    : "No FSD plot"}
                </div>
                {route ? (
                  <ol>
                    {route.map((s, i) => (
                      <li key={s.id} className={i === 0 ? "here" : i === 1 ? "next" : i === route.length - 1 ? "dest" : ""}>
                        <span>{i === 0 ? "Here" : i === 1 ? "Next" : String(i).padStart(2, "0")} · {s.name}</span>
                        <span>{i === 0 ? "0.0 ly" : `${distLy(route[i - 1], s).toFixed(1)} ly`}</span>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p className="nav-route-empty">No chain of jumps within {range.toFixed(0)} ly reaches {dest.name}.</p>
                )}
              </div>
            )}
            {layer === "galaxy" && (
              <div className="map-filter">
                <button type="button" className={filter === "all" ? "on" : ""} onClick={() => setFilter("all")}>All</button>
                <button type="button" className={filter === "reach" ? "on" : ""} onClick={() => setFilter("reach")}>Reach</button>
                <button type="button" className={filter === "plot" ? "on" : ""} disabled={!route} onClick={() => setFilter("plot")}>Plot</button>
              </div>
            )}
            {layer === "galaxy" && (
              <input
                className="map-search"
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Find a star"
                aria-label="Find a star"
              />
            )}
            <div className="map-list">
              {layer === "system" ? (
                <>
                  <div className={`map-row${pick === "star" ? " locked" : ""}`}>
                    <span>{here.name} (star)</span>
                    <span className="row-acts">
                      <button type="button" disabled={jumping} onClick={() => pickBody({ kind: "star" })}>look</button>
                      <button type="button" disabled={jumping} onClick={() => onGoBody({ kind: "star" })}>arrive</button>
                    </span>
                  </div>
                  {here.planets.map((p) => (
                    <div key={p.id}>
                      <div className={`map-row${pick === p.id || pick === p.stationId ? " locked" : ""}`}>
                        <button
                          type="button"
                          className="map-name"
                          disabled={!scanned[p.id]}
                          onClick={() => setFileId(p.id)}
                          title={scanned[p.id] ? "Open dossier" : "Scan to unlock"}
                        >
                          {p.name}
                          <em className="map-port">{p.interest === "port" ? (here.stations.find((s) => s.id === p.stationId)?.kind ?? "port") : surveys[p.id] ? "logged" : p.kind === "icegiant" ? "ice giant" : "wild"}</em>
                        </button>
                        <span className="map-period" title={formatPeriodLine(p, "long")}>
                          {formatPeriodLine(p)}
                        </span>
                        <span className="row-acts">
                          <button type="button" disabled={jumping} onClick={() => pickBody({ kind: "planet", id: p.id })}>look</button>
                          <button type="button" disabled={jumping} onClick={() => onGoBody({ kind: "planet", id: p.id })}>arrive</button>
                          {p.stationId && (
                            <button type="button" disabled={jumping} onClick={() => onGoBody({ kind: "station", id: p.stationId! })}>port</button>
                          )}
                        </span>
                      </div>
                      {p.moons.map((m) => (
                        <div key={m.id} className={`map-row moon${pick === m.id ? " locked" : ""}`}>
                          <button type="button" className="map-name" disabled={!scanned[m.id]} onClick={() => setFileId(m.id)}>
                            {m.name}
                            <em className="map-port">moon</em>
                          </button>
                          <span className="row-acts">
                            <button type="button" disabled={jumping} onClick={() => pickBody({ kind: "moon", id: m.id })}>look</button>
                            <button type="button" disabled={jumping} onClick={() => onGoBody({ kind: "moon", id: m.id })}>arrive</button>
                          </span>
                        </div>
                      ))}
                    </div>
                  ))}
                  {here.belt && (
                    <div className={`map-row${pick === here.belt.id ? " locked" : ""}`}>
                      <button type="button" className="map-name" disabled={!scanned[here.belt.id]} onClick={() => setFileId(here.belt!.id)}>
                        {here.belt.name}
                        <em className="map-port">{here.belt.icy ? "ice belt" : "belt"}</em>
                      </button>
                      <span className="row-acts">
                        <button type="button" disabled={jumping} onClick={() => pickBody({ kind: "belt" })}>look</button>
                        <button type="button" disabled={jumping} onClick={() => onGoBody({ kind: "belt" })}>arrive</button>
                      </span>
                    </div>
                  )}
                  {here.comets.map((c) => (
                    <div key={c.id} className={`map-row${pick === c.id ? " locked" : ""}`}>
                      <button type="button" className="map-name" disabled={!scanned[c.id]} onClick={() => setFileId(c.id)}>
                        {c.name}
                        <em className="map-port">comet</em>
                      </button>
                      <span className="row-acts">
                        <button type="button" disabled={jumping} onClick={() => pickBody({ kind: "comet", id: c.id })}>look</button>
                        <button type="button" disabled={jumping} onClick={() => onGoBody({ kind: "comet", id: c.id })}>arrive</button>
                      </span>
                    </div>
                  ))}
                </>
              ) : (
                <>
                  <div className="map-row here">
                    <span>{here.name}<em className="map-port">here</em></span>
                    <span className="ly">0.0 ly</span>
                  </div>
                  {listed.map(({ system, ly }) => {
                    const inRange = ly <= range + 1e-4;
                    const locked = lockedId === system.id;
                    const hopIndex = route ? route.findIndex((s) => s.id === system.id) : -1;
                    return (
                      <button
                        key={system.id}
                        type="button"
                        className={`map-row${locked ? " locked" : ""}${inRange ? "" : " oor"}`}
                        onClick={() => selectStar(system.id)}
                        disabled={jumping}
                      >
                        <span>
                          {system.name}
                          {hopIndex > 0 ? <em className="map-port">hop {hopIndex}/{hops}</em> : null}
                        </span>
                        <span className="ly">
                          {ly.toFixed(1)} ly
                          {inRange ? "" : route && locked ? " · plot" : " · far"}
                        </span>
                      </button>
                    );
                  })}
                </>
              )}
            </div>
          </div>
        </div>

        <div className="map-foot">
          {layer === "system" ? (
            <>
              <div className="map-caption">
                <span>{pickLabel}</span>
                {pickPlanet && (
                  <span className="map-sub" title={formatPeriodLine(pickPlanet, "long")}>
                    {pickPlanet.au} AU · {formatPeriodLine(pickPlanet)}
                  </span>
                )}
              </div>
              <span className="row-acts">
                <button type="button" disabled={jumping} onClick={() => onLookBody(targetOfPick(), true)}>look</button>
                <button
                  type="button"
                  disabled={jumping}
                  onClick={() => onGoBody(pickPlanet ? { kind: "planet", id: pickPlanet.id } : targetOfPick())}
                >
                  arrive
                </button>
                {pickPlanet?.stationId && (
                  <button type="button" disabled={jumping} onClick={() => onGoBody({ kind: "station", id: pickPlanet.stationId! })}>
                    port
                  </button>
                )}
              </span>
            </>
          ) : (
            <>
              <div className="map-caption">
                <span>{dest && dest.id !== here.id ? dest.name : here.name}</span>
                <span className="map-sub">
                  {dest && dest.id !== here.id && hop && hops > 1
                    ? `${destLine} · next ${hop.name}`
                    : destLine}
                </span>
              </div>
              <button type="button" className="act-btn jump" disabled={!canJump} onClick={onJump}>
                {hops > 1 ? `Jump · ${hop?.name ?? ""}` : "Jump"}
              </button>
            </>
          )}
        </div>
      </div>
      {fileId && (
        <Dossier systemId={systemId} planetId={fileId} onClose={() => setFileId(null)} />
      )}
    </>
  );
}

function CloseIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <path d="M3 3l8 8M11 3L3 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
