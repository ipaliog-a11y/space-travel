import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PilotGlyph } from "@/lib/player-profile/glyphs";
import {
  TRACK_PAD,
  TRACK_RANKS,
  getProgressBetween,
  layoutNodes,
  markerX as markerAlong,
  trackWidth,
  xpIntoNext,
  type LaidNode,
  type TrackRank,
} from "@/lib/player-profile/rank-track";

type Props = {
  /** Live (or preview) XP. Parent owns persistence. */
  xp: number;
  ranks?: TrackRank[];
  /** +100 / +1000 / set-rank for the prototype. Strip when XP awards are live. */
  sandbox?: boolean;
  onXpChange?: (xp: number) => void;
};

function BayMark() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <rect x="2.5" y="4" width="11" height="9" fill="none" stroke="currentColor" strokeWidth="1.2" />
      <path d="M5 13 V8 H11 V13" fill="none" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  );
}

function CheckMark() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <path d="M3.5 8.5 L6.5 11.5 L12.5 4.5" fill="none" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

export function RankTrack({ xp, ranks = TRACK_RANKS, sandbox, onXpChange }: Props) {
  const viewRef = useRef<HTMLDivElement>(null);
  const railRef = useRef<HTMLDivElement>(null);
  const nodes = useMemo(() => layoutNodes(ranks), [ranks]);
  const width = useMemo(() => trackWidth(nodes), [nodes]);
  const span = useMemo(() => getProgressBetween(xp, ranks), [xp, ranks]);
  const into = useMemo(() => xpIntoNext(xp, ranks), [xp, ranks]);
  const mx = useMemo(() => markerAlong(span, nodes), [span, nodes]);
  const current = into.rank;
  const next = into.next;
  const [picked, setPicked] = useState<string | null>(null);
  const [flareId, setFlareId] = useState<string | null>(null);
  const [scroll, setScroll] = useState(0);
  const [viewW, setViewW] = useState(0);
  const prevRank = useRef(current.id);
  const didCenter = useRef(false);
  const drag = useRef({
    on: false,
    moved: false,
    startX: 0,
    startScroll: 0,
    lastX: 0,
    lastT: 0,
    vx: 0,
    raf: 0,
  });

  const centerOn = useCallback((x: number, smooth = true) => {
    const el = viewRef.current;
    if (!el) return;
    el.scrollTo({ left: Math.max(0, x - el.clientWidth / 2), behavior: smooth ? "smooth" : "auto" });
  }, []);

  useEffect(() => {
    if (didCenter.current) return;
    const id = requestAnimationFrame(() => {
      didCenter.current = true;
      const node = nodes[span.index] ?? nodes[0];
      if (node) centerOn(node.x, true);
    });
    return () => cancelAnimationFrame(id);
  }, [centerOn, nodes, span.index]);

  useEffect(() => {
    if (prevRank.current === current.id) return;
    const rose = ranks.findIndex((r) => r.id === current.id) > ranks.findIndex((r) => r.id === prevRank.current);
    prevRank.current = current.id;
    if (!rose) return;
    setFlareId(current.id);
    const t = window.setTimeout(() => setFlareId(null), 700);
    const node = nodes.find((n) => n.id === current.id);
    if (node) centerOn(node.x, true);
    return () => window.clearTimeout(t);
  }, [centerOn, current.id, nodes, ranks]);

  useEffect(() => {
    const el = viewRef.current;
    if (!el) return;
    const sync = () => {
      setScroll(el.scrollLeft);
      setViewW(el.clientWidth);
    };
    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaY) < 1 && Math.abs(e.deltaX) < 1) return;
      e.preventDefault();
      el.scrollLeft += Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
    };
    sync();
    el.addEventListener("scroll", sync, { passive: true });
    el.addEventListener("wheel", onWheel, { passive: false });
    const ro = new ResizeObserver(sync);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", sync);
      el.removeEventListener("wheel", onWheel);
      ro.disconnect();
    };
  }, []);

  const stopInertia = useCallback(() => {
    if (drag.current.raf) cancelAnimationFrame(drag.current.raf);
    drag.current.raf = 0;
  }, []);

  const snapNearCenter = useCallback(() => {
    const el = viewRef.current;
    if (!el) return;
    const mid = el.scrollLeft + el.clientWidth / 2;
    let best = nodes[0];
    let dist = Infinity;
    for (const n of nodes) {
      const d = Math.abs(n.x - mid);
      if (d < dist) {
        dist = d;
        best = n;
      }
    }
    if (best && dist < 56) centerOn(best.x, true);
  }, [centerOn, nodes]);

  const inertia = useCallback(() => {
    const el = viewRef.current;
    if (!el) return;
    const step = () => {
      drag.current.vx *= 0.92;
      if (Math.abs(drag.current.vx) < 0.08) {
        drag.current.raf = 0;
        snapNearCenter();
        return;
      }
      el.scrollLeft -= drag.current.vx * 16;
      drag.current.raf = requestAnimationFrame(step);
    };
    drag.current.raf = requestAnimationFrame(step);
  }, [snapNearCenter]);

  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (e.button !== 0) return;
    const el = viewRef.current;
    if (!el) return;
    stopInertia();
    el.setPointerCapture(e.pointerId);
    drag.current = {
      on: true,
      moved: false,
      startX: e.clientX,
      startScroll: el.scrollLeft,
      lastX: e.clientX,
      lastT: performance.now(),
      vx: 0,
      raf: 0,
    };
  }

  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!drag.current.on) return;
    const el = viewRef.current;
    if (!el) return;
    const dx = e.clientX - drag.current.startX;
    if (Math.abs(dx) > 8) drag.current.moved = true;
    if (!drag.current.moved) return;
    el.scrollLeft = drag.current.startScroll - dx;
    const now = performance.now();
    const dt = Math.max(1, now - drag.current.lastT);
    drag.current.vx = (e.clientX - drag.current.lastX) / dt;
    drag.current.lastX = e.clientX;
    drag.current.lastT = now;
  }

  function onPointerUp(e: React.PointerEvent<HTMLDivElement>) {
    if (!drag.current.on) return;
    drag.current.on = false;
    try {
      viewRef.current?.releasePointerCapture(e.pointerId);
    } catch {
      /* already released */
    }
    if (drag.current.moved) inertia();
  }

  function pickNode(node: LaidNode) {
    if (drag.current.moved) return;
    setPicked(node.id);
    requestAnimationFrame(() => centerOn(node.x, true));
  }

  function onKey(e: React.KeyboardEvent<HTMLDivElement>) {
    if (e.key === "Escape" && picked) {
      e.preventDefault();
      e.stopPropagation();
      setPicked(null);
      return;
    }
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    e.preventDefault();
    const i = nodes.findIndex((n) => n.id === (picked ?? current.id));
    const nextI = e.key === "ArrowRight" ? Math.min(nodes.length - 1, i + 1) : Math.max(0, i - 1);
    const node = nodes[nextI];
    if (!node) return;
    setPicked(node.id);
    centerOn(node.x, true);
  }

  const selected = nodes.find((n) => n.id === picked) ?? null;
  const nextX = next ? (nodes.find((n) => n.id === next.id)?.x ?? 0) : 0;
  const nextOff = Boolean(next) && viewW > 0 && nextX > scroll + viewW - 64;

  const capXp = ranks[ranks.length - 1]?.xpRequired ?? 0;
  const readout =
    next && into.need > 0
      ? `${current.name}  ·  ${Math.round(into.have).toLocaleString()} / ${into.need.toLocaleString()} XP`
      : `${current.name}  ·  cap`;

  return (
    <section className="rank-track" aria-label="Rank progress">
      <div className="rank-track-head">
        <h2>Line</h2>
        <span>{readout}</span>
      </div>

      <div className="rank-track-frame">
        {next && nextOff && (
          <button
            type="button"
            className="rank-track-peek"
            onClick={() => {
              const n = nodes.find((row) => row.id === next.id);
              if (n) centerOn(n.x, true);
            }}
          >
            Next: {next.name} →
          </button>
        )}
        <div
          ref={viewRef}
          className="rank-track-view"
          tabIndex={0}
          role="listbox"
          aria-label="Ranks"
          aria-activedescendant={current.id}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onKeyDown={onKey}
        >
          <div ref={railRef} className="rank-track-rail" style={{ width }}>
          <div className="rank-track-bed" style={{ left: TRACK_PAD, width: Math.max(0, width - TRACK_PAD * 2) }} />
          <div className="rank-track-fill" style={{ left: TRACK_PAD, width: Math.max(0, mx - TRACK_PAD) }} />
          <div className="rank-track-marker" style={{ left: mx }} aria-hidden="true">
            <span />
          </div>
          {nodes.map((node) => (
            <RankNode
              key={node.id}
              node={node}
              currentId={current.id}
              currentIndex={span.index}
              flare={flareId === node.id}
              selected={picked === node.id}
              onPick={() => pickNode(node)}
            />
          ))}
        </div>
        </div>
      </div>

      {selected && (
        <article className="rank-track-detail">
          <p className="rank-track-detail-k">
            Rank {selected.tier}
            {selected.reward ? <em>{selected.reward.label}</em> : <em>{selected.band}</em>}
          </p>
          <h3>{selected.name}</h3>
          <p>{selected.note}</p>
          <p className="rank-track-detail-xp">
            {selected.xpRequired.toLocaleString()} XP to enter
            {selected.reward ? ` · ${selected.reward.label}` : ""}
          </p>
        </article>
      )}

      {sandbox && (
        <div className="rank-track-sandbox" aria-label="Preview XP">
          <button type="button" onClick={() => onXpChange?.(Math.max(0, xp - 100))}>
            −100
          </button>
          <button type="button" onClick={() => onXpChange?.(xp + 100)}>
            +100 XP
          </button>
          <button type="button" onClick={() => onXpChange?.(xp + 1000)}>
            +1000 XP
          </button>
          <label>
            Set rank
            <select
              value={current.id}
              onChange={(e) => {
                const rank = ranks.find((r) => r.id === e.target.value);
                if (rank) onXpChange?.(rank.xpRequired);
              }}
            >
              {ranks.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.tier}. {r.name}
                </option>
              ))}
            </select>
          </label>
          <input
            type="range"
            min={0}
            max={capXp}
            step={50}
            value={Math.min(xp, capXp)}
            aria-label="Preview XP"
            onChange={(e) => onXpChange?.(Number(e.target.value))}
          />
        </div>
      )}
    </section>
  );
}

function RankNode({
  node,
  currentId,
  currentIndex,
  flare,
  selected,
  onPick,
}: {
  node: LaidNode;
  currentId: string;
  currentIndex: number;
  flare: boolean;
  selected: boolean;
  onPick: () => void;
}) {
  const done = node.index < currentIndex;
  const here = node.id === currentId;
  const locked = node.index > currentIndex;
  const cls = [
    "rank-node",
    done ? "done" : "",
    here ? "here" : "",
    locked ? "locked" : "",
    flare ? "flare" : "",
    selected ? "picked" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button
      type="button"
      id={node.id}
      role="option"
      aria-selected={here || selected}
      className={cls}
      style={{ left: node.x, color: node.color }}
      onClick={onPick}
    >
      <span className="rank-node-badge">
        <PilotGlyph id={node.icon} />
        {done && (
          <em className="rank-node-check">
            <CheckMark />
          </em>
        )}
      </span>
      <strong>{node.name}</strong>
      {node.reward && (
        <span className="rank-node-reward">
          {locked ? "?" : <><BayMark /> {node.reward.label}</>}
        </span>
      )}
    </button>
  );
}
