import { useEffect, useState } from "react";
import { buyMarketShip, loadShipMarket, type MarketView } from "@/lib/hangar/api";
import { SHIP_SETS, SHIPS } from "@/lib/starwake/catalog";
import type { ShipId } from "@/lib/starwake/types";
import type { HangarShip } from "@/lib/hangar/types";

type Props = {
  onBack: () => void;
  onOwned: (hulls: ShipId[], fly: ShipId) => void;
};

export function ShipMarket({ onBack, onOwned }: Props) {
  const [view, setView] = useState<MarketView | null>(null);
  const [tradeInId, setTradeInId] = useState<string | null>(null);
  const [buying, setBuying] = useState<ShipId | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadShipMarket()
      .then((next) => {
        if (cancelled) return;
        setView(next);
        setTradeInId(next.ships[0]?.id ?? null);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Market failed to load");
      });
    return () => {
      cancelled = true;
    };
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

  const full = view ? view.slotsUsed >= view.slotCap : false;

  async function onBuy(shipType: ShipId) {
    if (buying || !view) return;
    setBuying(shipType);
    setError(null);
    try {
      const next = await buyMarketShip({
        data: {
          shipType,
          tradeInId: full ? (tradeInId ?? undefined) : undefined,
        },
      });
      setView(next);
      setTradeInId(next.ships[0]?.id ?? null);
      const types = [...new Set(next.ships.map((s) => s.shipType))] as ShipId[];
      const fly =
        next.ships.find((s) => s.shipType === shipType)?.shipType ?? types[0] ?? shipType;
      onOwned(types, fly);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Purchase failed");
    } finally {
      setBuying(null);
    }
  }

  function due(price: number, outgoing: HangarShip | undefined) {
    if (!full || !outgoing) return price;
    return price - outgoing.resaleValue;
  }

  const outgoing = view?.ships.find((s) => s.id === tradeInId);

  return (
    <div className="gate hangar" data-ui>
      <header className="hangar-head">
        <h1>Market</h1>
        <p className="lede">Stock hulls. Rank 1 is one bay — trade in to swap. Rel and slot fits stay in Hangar.</p>
        {view && (
          <p className="keys-hint">
            ₡{Math.round(view.credits).toLocaleString()}
            <span className="dot">·</span>
            {view.slotsUsed}/{view.slotCap} bay{view.slotCap === 1 ? "" : "s"}
            <span className="dot">·</span>
            Rank {view.rank}
          </p>
        )}
      </header>

      {error && <p className="station-repair-err">{error}</p>}

      {full && view && view.ships.length > 0 && (
        <section className="ship-set">
          <div className="ship-set-head">
            <h2>Trade-in</h2>
            <p>Hangar is full. Pick a hull to sell at resale, then buy.</p>
          </div>
          <div className="ship-rail" role="listbox" aria-label="Trade-in hull">
            {view.ships.map((ship) => (
              <button
                key={ship.id}
                type="button"
                role="option"
                aria-selected={tradeInId === ship.id}
                className={`ship-rail-card${tradeInId === ship.id ? " on" : ""}`}
                onClick={() => setTradeInId(ship.id)}
              >
                <img src={`/ships/${ship.shipType}-thumb.png`} alt="" className="ship-rail-art" />
                <span className="ship-rail-name">{SHIPS[ship.shipType].name}</span>
                <span className="ship-rail-role">{ship.hardpointTier}</span>
                <span className="ship-rail-data">resale ₡{ship.resaleValue.toLocaleString()}</span>
              </button>
            ))}
          </div>
        </section>
      )}

      {SHIP_SETS.map((set) => (
        <section key={set.id} className={`ship-set ship-set-${set.id}`}>
          <div className="ship-set-head">
            <h2>{set.label}</h2>
            <p>{set.blurb}</p>
          </div>
          <div className="ship-rail">
            {set.hulls.map((id) => {
              const listing = view?.listings.find((l) => l.shipType === id);
              const price = listing?.price ?? 0;
              const cost = due(price, outgoing);
              const short = view != null && cost > 0 && view.credits < cost;
              const owned = listing?.ownedCount ?? 0;
              return (
                <button
                  key={id}
                  type="button"
                  className="ship-rail-card"
                  disabled={buying !== null || !view || short || (full && !tradeInId)}
                  onClick={() => void onBuy(id)}
                >
                  <img src={`/ships/${id}-thumb.png`} alt="" className="ship-rail-art" />
                  <span className="ship-rail-name">{SHIPS[id].name}</span>
                  <span className="ship-rail-role">{SHIPS[id].role}</span>
                  <span className="ship-rail-blurb">{SHIPS[id].blurb}</span>
                  <span className="ship-rail-data">
                    {cost >= 0 ? `₡${cost.toLocaleString()}` : `+₡${(-cost).toLocaleString()} back`}
                    {full && outgoing ? " after trade-in" : ""}
                    {owned > 0 ? ` · ${owned} owned` : ""}
                  </span>
                </button>
              );
            })}
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
