import { useMemo } from "react";
import { hopsForGood, type ListedPad } from "@/lib/starwake/market-hubs";
import {
  addCargo,
  goodById,
  KIND_LABEL,
  markHold,
  markTotal,
  type CargoHold,
  type GoodId,
} from "@/lib/starwake/market";
import { tapeMovers, waitDumpHint, waitOrDump, type TapeMove } from "@/lib/starwake/market-analysis";

type TapeRow = TapeMove & { name: string };

type Props = {
  tick: number;
  systemId: string;
  cargo: CargoHold;
  pads: ListedPad[];
  rows: TapeRow[];
  onFocus: (id: GoodId) => void;
};

function ownedHold(cargo: CargoHold, pads: ListedPad[]): CargoHold {
  let hold: CargoHold = [];
  for (const lot of cargo) hold = addCargo(hold, lot.goodId, lot.qty, lot.paid);
  for (const pad of pads) {
    for (const lot of pad.hold) hold = addCargo(hold, lot.goodId, lot.qty, lot.paid);
  }
  return hold;
}

function hopLine(hop: ReturnType<typeof hopsForGood>[number]) {
  if (hop.ly < 0.05) return `${hop.station} · this system`;
  return `${hop.station} · ${hop.ly < 10 ? hop.ly.toFixed(1) : hop.ly.toFixed(0)} ly`;
}

export function WatchAnalysis({ tick, systemId, cargo, pads, rows, onFocus }: Props) {
  const { up, down } = tapeMovers(rows);
  const owned = useMemo(() => markHold(ownedHold(cargo, pads), tick), [cargo, pads, tick]);
  const tot = markTotal(owned);
  const deltas = useMemo(() => Object.fromEntries(rows.map((r) => [r.goodId, r.delta])), [rows]);
  const hopsByGood = useMemo(
    () => Object.fromEntries(owned.map((lot) => [lot.goodId, hopsForGood(lot.goodId, systemId)])),
    [owned, systemId],
  );

  return (
    <>
      <section className="job-board hangar-pads" aria-label="Movers">
        <div className="job-board-head">
          <h2>Movers</h2>
          <span>Same tape everywhere. Biggest walks this window.</span>
        </div>
        {up.length === 0 && down.length === 0 ? (
          <p className="survey-empty">Tape is still.</p>
        ) : (
          <div className="tape-grid" role="list">
            {up.map((row) => (
              <button
                key={`up-${row.goodId}`}
                type="button"
                className="job-card watch-card tape-row"
                onClick={() => onFocus(row.goodId)}
              >
                <span className="job-kind">
                  ₡{row.unit}
                  <em className="up">+{row.delta}</em>
                </span>
                <span className="job-title">{goodById(row.goodId).name}</span>
              </button>
            ))}
            {down.map((row) => (
              <button
                key={`dn-${row.goodId}`}
                type="button"
                className="job-card watch-card tape-row"
                onClick={() => onFocus(row.goodId)}
              >
                <span className="job-kind">
                  ₡{row.unit}
                  <em className="down">{row.delta}</em>
                </span>
                <span className="job-title">{goodById(row.goodId).name}</span>
              </button>
            ))}
          </div>
        )}
      </section>

      <section className="job-board hangar-pads" aria-label="Your lots">
        <div className="job-board-head">
          <h2>Your lots</h2>
          <span>
            {tot.qty} u · mark ₡{tot.mark.toLocaleString()} · {tot.pnl >= 0 ? "+" : "−"}₡
            {Math.abs(tot.pnl).toLocaleString()}
          </span>
        </div>
        {owned.length === 0 ? (
          <p className="survey-empty">Nothing in hold or pads. Buy or pull, then Store on a dock.</p>
        ) : (
          <ul className="survey-list pad-list">
            {owned.map((lot) => {
              const good = goodById(lot.goodId);
              const call = waitOrDump(deltas[lot.goodId] ?? 0, lot.qty);
              const hops = hopsByGood[lot.goodId] ?? [];
              const hop = hops[0] ?? null;
              return (
                <li key={lot.goodId}>
                  <button type="button" className="pad-jump" onClick={() => onFocus(lot.goodId)}>
                    <strong>{good.name}</strong>
                    <span>
                      {lot.qty} u · {KIND_LABEL[good.kind]} · tape ₡{lot.unit}
                    </span>
                    <em>{call === "hold" ? "sit" : call === "dump" ? "dump" : "flat"}</em>
                  </button>
                  <p className="bay-caption">{waitDumpHint(call, hop)}</p>
                  {hops.length > 0 && (
                    <p className="bay-caption">
                      Lists: {hops.slice(0, 3).map(hopLine).join(" · ")}
                      {hops.length > 3 ? ` · +${hops.length - 3}` : ""}
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </>
  );
}
