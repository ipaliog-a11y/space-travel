import { useEffect, useMemo, useState } from "react";
import { fittedShip } from "@/lib/starwake/catalog";
import { holdUsed } from "@/lib/starwake/jobs";
import {
  cargoOf,
  EMPTY_HOLD,
  goodById,
  hubKey,
  hubListings,
  KIND_LABEL,
  lotBasis,
  lotLabel,
  MARKET_TICK_MS,
  quoteGood,
  quoteHistory,
  sparkPath,
  trendDelta,
  type GoodId,
} from "@/lib/starwake/market";
import { useStarwake } from "@/lib/starwake/store";
import { tradeCargo } from "@/lib/hangar/api";

type Props = {
  systemId: string;
  stationId: string;
  credits: number | null;
  onCredits: (n: number) => void;
  onError: (msg: string | null) => void;
};

export function MarketWatch({ systemId, stationId, credits, onCredits, onError }: Props) {
  const shipId = useStarwake((s) => s.shipId);
  const loadout = useStarwake((s) => s.loadout);
  const man = useStarwake((s) => s.manifests[s.shipId]);
  const cargo = useStarwake((s) => s.cargo[s.shipId] ?? EMPTY_HOLD);
  const warehouses = useStarwake((s) => s.warehouses);
  const stowBuy = useStarwake((s) => s.stowBuy);
  const dumpSell = useStarwake((s) => s.dumpSell);
  const storeCargo = useStarwake((s) => s.storeCargo);
  const retrieveCargo = useStarwake((s) => s.retrieveCargo);
  const [busy, setBusy] = useState<string | null>(null);
  const [tick, setTick] = useState(() => Math.floor(Date.now() / MARKET_TICK_MS));
  const hub = hubKey(systemId, stationId);
  const ware = warehouses[hub] ?? EMPTY_HOLD;
  const cap = fittedShip(shipId, loadout).cargoCap;
  const used = holdUsed(man, cargo);
  const free = Math.max(0, cap - used);

  useEffect(() => {
    const id = window.setInterval(() => setTick(Math.floor(Date.now() / MARKET_TICK_MS)), 1000);
    return () => window.clearInterval(id);
  }, []);

  const rows = useMemo(
    () =>
      hubListings(hub).map((id) => {
        const hist = quoteHistory(id, tick);
        return {
          good: goodById(id),
          unit: hist[hist.length - 1] ?? quoteGood(id, tick),
          hist,
          delta: trendDelta(hist),
          spark: sparkPath(hist),
        };
      }),
    [tick, hub],
  );

  async function onBuy(goodId: GoodId, qty: number) {
    if (busy || qty <= 0) return;
    const unit = quoteGood(goodId);
    const cost = unit * qty;
    if (credits != null && credits < cost) {
      onError(`Need ₡${cost.toLocaleString()} to buy`);
      return;
    }
    if (qty > free) {
      onError("Hold is full");
      return;
    }
    if (!stowBuy(goodId, qty, cost)) {
      onError("Hold is full");
      return;
    }
    setBusy(`buy-${goodId}`);
    onError(null);
    try {
      const result = await tradeCargo({
        data: { goodId, qty, side: "buy", systemId, stationId },
      });
      if (result.paid !== cost) {
        dumpSell(goodId, qty, cost);
        stowBuy(goodId, qty, result.paid);
      }
      onCredits(result.credits);
    } catch (err) {
      dumpSell(goodId, qty, cost);
      onError(err instanceof Error ? err.message : "Buy failed");
    } finally {
      setBusy(null);
    }
  }

  async function onSell(goodId: GoodId, qty: number) {
    if (busy || qty <= 0) return;
    const pulled = dumpSell(goodId, qty);
    if (!pulled) {
      onError("Nothing to sell");
      return;
    }
    setBusy(`sell-${goodId}`);
    onError(null);
    try {
      const result = await tradeCargo({
        data: { goodId, qty, side: "sell", systemId, stationId },
      });
      onCredits(result.credits);
    } catch (err) {
      stowBuy(goodId, qty, pulled.paid);
      onError(err instanceof Error ? err.message : "Sell failed");
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className="job-board station-board market-watch" aria-label="Market watch">
      <div className="job-board-head">
        <h2>Watch</h2>
        <span>This lock lists eight. Same ₡ on the galaxy tape. Jobs stay safe.</span>
      </div>
      <p className="bay-caption">
        Hold {lotLabel(cargo)} · pad {lotLabel(ware)} · {used}/{Math.round(cap)} u
      </p>
      {ware.length > 0 && (
        <div className="pad-now" aria-label="Cargo on this pad">
          <div className="job-board-head">
            <h2>This pad</h2>
            <span>Stored here. Load it even if this lock no longer lists the good.</span>
          </div>
          <div className="watch-grid">
            {ware.map((lot) => {
              const good = goodById(lot.goodId);
              return (
                <article key={lot.goodId} className="job-card watch-card">
                  <span className="job-kind">pad · {KIND_LABEL[good.kind]}</span>
                  <span className="job-title">{good.name}</span>
                  <span className="job-route">{lotBasis(ware, lot.goodId)}</span>
                  <div className="watch-acts">
                    <button
                      type="button"
                      className="job-take"
                      disabled={busy !== null || free <= 0}
                      onClick={() => retrieveCargo(lot.goodId, Math.min(lot.qty, free), systemId, stationId)}
                    >
                      Load pad
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      )}
      <div className="watch-grid">
        {rows.map((row) => {
          const have = cargoOf(cargo, row.good.id);
          const stored = cargoOf(ware, row.good.id);
          const up = row.delta > 0;
          const down = row.delta < 0;
          const buy1 = free >= 1 && (credits == null || credits >= row.unit);
          return (
            <article key={row.good.id} className="job-card watch-card">
              <span className="job-kind">
                {KIND_LABEL[row.good.kind]} · ₡{row.unit}
                <em className={up ? "up" : down ? "down" : ""}>
                  {up ? "+" : ""}
                  {row.delta}
                </em>
              </span>
              <span className="job-title">{row.good.name}</span>
              <svg className="watch-spark" viewBox="0 0 72 20" aria-hidden="true">
                <path d={row.spark} />
              </svg>
              <span className="job-route">
                ship {lotBasis(cargo, row.good.id)} · pad {lotBasis(ware, row.good.id)}
              </span>
              <div className="watch-acts">
                <button
                  type="button"
                  className="job-take"
                  disabled={busy !== null || !buy1}
                  onClick={() => void onBuy(row.good.id, 1)}
                >
                  Buy 1
                </button>
                {free >= 4 && (
                  <button
                    type="button"
                    className="job-take"
                    disabled={busy !== null || (credits != null && credits < row.unit * 4)}
                    onClick={() => void onBuy(row.good.id, 4)}
                  >
                    Buy 4
                  </button>
                )}
                {have > 0 && (
                  <button
                    type="button"
                    className="job-drop"
                    disabled={busy !== null}
                    onClick={() => void onSell(row.good.id, have)}
                  >
                    Sell
                  </button>
                )}
                {have > 0 && (
                  <button
                    type="button"
                    className="job-drop"
                    disabled={busy !== null}
                    onClick={() => storeCargo(row.good.id, have, systemId, stationId)}
                  >
                    Store
                  </button>
                )}
                {stored > 0 && (
                  <button
                    type="button"
                    className="job-drop"
                    disabled={busy !== null || free <= 0}
                    onClick={() => retrieveCargo(row.good.id, Math.min(stored, free), systemId, stationId)}
                  >
                    Load pad
                  </button>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
