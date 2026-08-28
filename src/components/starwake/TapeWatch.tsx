import { useEffect, useMemo, useState } from "react";
import { hubsForGood, listedPads, padsHolding } from "@/lib/starwake/market-hubs";
import {
  cargoAvg,
  cargoOf,
  cargoQty,
  GOODS,
  lotLabel,
  KINDS,
  KIND_LABEL,
  MARKET_TICK_MS,
  quoteGood,
  quoteHistory,
  sparkPath,
  trendDelta,
  type GoodId,
  type GoodKind,
} from "@/lib/starwake/market";
import { useStarwake } from "@/lib/starwake/store";

type Props = {
  onBack: () => void;
};

const KIND_BLURB: Record<GoodKind, string> = {
  raw: "Dirt and gas off the worlds. Cheap hold filler until mining lands.",
  refined: "Smelted and pressed. Beats the ore it came from.",
  consumable: "Tanks, rations, meds. Stations burn these.",
  tech: "Parts and sealed kits. Fat ₡, fat jitter.",
};

export function TapeWatch({ onBack }: Props) {
  const [tick, setTick] = useState(() => Math.floor(Date.now() / MARKET_TICK_MS));
  const [focus, setFocus] = useState<GoodId>("ore");
  const shipId = useStarwake((s) => s.shipId);
  const cargo = useStarwake((s) => s.cargo[s.shipId] ?? []);
  const warehouses = useStarwake((s) => s.warehouses);
  const pads = listedPads(warehouses);

  useEffect(() => {
    const id = window.setInterval(() => setTick(Math.floor(Date.now() / MARKET_TICK_MS)), 1000);
    return () => window.clearInterval(id);
  }, []);

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

  const rows = useMemo(
    () =>
      GOODS.map((good) => {
        const hist = quoteHistory(good.id, tick);
        return {
          good,
          unit: hist[hist.length - 1] ?? quoteGood(good.id, tick),
          hist,
          delta: trendDelta(hist),
          spark: sparkPath(hist, 88, 22),
        };
      }),
    [tick],
  );

  const focused = rows.find((r) => r.good.id === focus) ?? rows[0];
  const hubs = useMemo(() => hubsForGood(focused.good.id), [focused.good.id]);
  const stored = useMemo(() => padsHolding(warehouses, focused.good.id), [warehouses, focused.good.id]);
  const onShip = cargoOf(cargo, focused.good.id);
  const shipAvg = cargoAvg(cargo, focused.good.id);
  const storedAt = Object.fromEntries(stored.map((pad) => [pad.key, pad.qty]));
  const bigSpark = sparkPath(focused.hist, 520, 120);
  const groups = useMemo(
    () =>
      KINDS.map((kind) => ({
        kind,
        label: KIND_LABEL[kind],
        rows: rows.filter((row) => row.good.kind === kind),
      })),
    [rows],
  );

  function tapeRow(row: (typeof rows)[number]) {
    const on = row.good.id === focused.good.id;
    const up = row.delta > 0;
    const down = row.delta < 0;
    return (
      <button
        key={row.good.id}
        type="button"
        role="listitem"
        className={`job-card watch-card tape-row${on ? " on" : ""}`}
        aria-pressed={on}
        onClick={() => setFocus(row.good.id)}
      >
        <span className="job-kind">
          ₡{row.unit}
          <em className={up ? "up" : down ? "down" : ""}>
            {up ? "+" : ""}
            {row.delta}
          </em>
        </span>
        <span className="job-title">{row.good.name}</span>
        <svg className="watch-spark" viewBox="0 0 88 22" aria-hidden="true">
          <path d={row.spark} />
        </svg>
      </button>
    );
  }

  return (
    <div className="gate hangar tape-page" data-ui>
      <header className="hangar-head">
        <h1>Watch</h1>
        <p className="lede">
          Forty goods, one galaxy tape. Your hold and pads sit at the top. Click a lot or a row to focus it.
        </p>
      </header>

      <section className="job-board hangar-pads" aria-label="Your cargo">
        <div className="job-board-head">
          <h2>Your cargo</h2>
          <span>Hold and pads. Fly to a pad, dock, Load pad on Watch.</span>
        </div>
        {cargo.length === 0 && pads.length === 0 ? (
          <p className="survey-empty">Empty. Buy on a docked Watch, then Store to leave it on that pad.</p>
        ) : (
          <>
            {cargo.length > 0 && (
              <p className="bay-caption">
                {shipId} hold {lotLabel(cargo)}
              </p>
            )}
            {pads.length > 0 && (
              <ul className="survey-list pad-list">
                {pads.map((pad) => (
                  <li key={pad.key}>
                    <button
                      type="button"
                      className="pad-jump"
                      onClick={() => setFocus(pad.hold[0]?.goodId ?? focus)}
                    >
                      <strong>{pad.station}</strong>
                      <span>{pad.system}</span>
                      <em>{cargoQty(pad.hold)} u</em>
                    </button>
                    <p className="bay-caption">{lotLabel(pad.hold)}</p>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </section>

      <section className="tape-focus" aria-label={`${focused.good.name} detail`}>
        <div className="tape-focus-head">
          <span className="job-kind">
            {KIND_LABEL[focused.good.kind]} · ₡{focused.unit}
            <em className={focused.delta > 0 ? "up" : focused.delta < 0 ? "down" : ""}>
              {focused.delta > 0 ? "+" : ""}
              {focused.delta}
            </em>
          </span>
          <h2>{focused.good.name}</h2>
          <p className="bay-caption">
            {shipId} hold {onShip} u{shipAvg > 0 ? ` @₡${shipAvg}` : ""} · tape ₡{focused.unit}
            {stored.length
              ? ` · pad ${stored
                  .map((pad) => {
                    const avg = cargoAvg(pad.hold, focused.good.id);
                    return `${pad.qty} at ${pad.station}${avg > 0 ? ` @₡${avg}` : ""}`;
                  })
                  .join(" · ")}`
              : " · none on pads"}
          </p>
        </div>
        <svg className="tape-chart" viewBox="0 0 520 120" role="img" aria-label={`${focused.good.name} price history`}>
          <path d={bigSpark} />
        </svg>
        <div className="tape-hubs">
          <h3>Traded at {hubs.length} lock{hubs.length === 1 ? "" : "s"}</h3>
          {hubs.length === 0 ? (
            <p className="bay-caption">No lock lists this good.</p>
          ) : (
            <ul>
              {hubs.map((h) => (
                <li key={h.key}>
                  <strong>{h.station}</strong>
                  <span>
                    {h.system}
                    {storedAt[h.key] ? ` · you ${storedAt[h.key]} u` : ""}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {groups.map((group) => (
        <section key={group.kind} className={`tape-kind tape-kind-${group.kind}`} aria-label={group.label}>
          <div className="ship-set-head">
            <h2>{group.label}</h2>
            <p>{KIND_BLURB[group.kind]}</p>
          </div>
          <div className="tape-grid" role="list">
            {group.rows.map(tapeRow)}
          </div>
        </section>
      ))}

      <div className="gate-acts">
        <button type="button" className="engage ghost" onClick={onBack}>
          Menu
        </button>
      </div>
    </div>
  );
}
