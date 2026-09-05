import { useEffect, useState } from "react";
import { buyMarketShip, loadShipMarket, type MarketView } from "@/lib/hangar/api";
import { SHIP_SETS, SHIPS } from "@/lib/starwake/catalog";
import { occupiedShipKeys } from "@/lib/starwake/fleet";
import { useStarwake } from "@/lib/starwake/store";
import type { ShipId } from "@/lib/starwake/types";
import type { HangarShip } from "@/lib/hangar/types";
import { HelionConfirm } from "./HelionConfirm";

type Props = {
  onBack: () => void;
  onOwned: (hulls: ShipId[], fly: ShipId) => void;
};

export function ShipMarket({ onBack, onOwned }: Props) {
  const crew = useStarwake((s) => s.crew);
  const [view, setView] = useState<MarketView | null>(null);
  const [tradeInId, setTradeInId] = useState<string | null>(null);
  const [buying, setBuying] = useState<ShipId | null>(null);
  const [pending, setPending] = useState<ShipId | null>(null);
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
      if (pending) {
        setPending(null);
        return;
      }
      onBack();
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [onBack, pending]);

  const assigned = view ? occupiedShipKeys(crew, view.ships) : new Set<string>();
  const full = view ? view.slotsUsed >= view.slotCap : false;
  const outgoing = view?.ships.find((s) => s.id === tradeInId);
  const tradeBlocked = Boolean(outgoing && assigned.has(outgoing.id));

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
      setPending(null);
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

  function due(price: number, sold: HangarShip | undefined) {
    if (!full || !sold) return price;
    return price - sold.resaleValue;
  }

  const listing = pending && view ? view.listings.find((l) => l.shipType === pending) : null;
  const cost = listing ? due(listing.price, outgoing) : 0;
  const short = Boolean(pending && view && cost > 0 && view.credits < cost);
  const confirmBody = pending
    ? [
        full && outgoing
          ? `Trade ${SHIPS[outgoing.shipType].name} (resale ₡${outgoing.resaleValue.toLocaleString()}) for a ${SHIPS[pending].name}. Net ${
              cost >= 0 ? `₡${cost.toLocaleString()}` : `+₡${(-cost).toLocaleString()} back`
            }.`
          : `Buy a ${SHIPS[pending].name} for ₡${cost.toLocaleString()}. It docks in an open bay.`,
        short ? `Need ₡${cost.toLocaleString()} — wallet is short.` : "",
      ]
        .filter(Boolean)
        .join(" ")
    : "";

  return (
    <div className="gate hangar helion-dock" data-ui>
      <header className="hangar-head">
        <div className="k">Market</div>
        <h1>Hulls</h1>
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
            <p>Hangar is full. Pick a hull to sell at resale, then buy. Hulls on the line stay put.</p>
          </div>
          <div className="ship-rail" role="listbox" aria-label="Trade-in hull">
            {view.ships.map((ship) => {
              const onLine = assigned.has(ship.id);
              return (
                <button
                  key={ship.id}
                  type="button"
                  role="option"
                  aria-selected={tradeInId === ship.id}
                  disabled={onLine}
                  className={`ship-rail-card${tradeInId === ship.id ? " on" : ""}`}
                  onClick={() => !onLine && setTradeInId(ship.id)}
                >
                  <img src={`/ships/${ship.shipType}-thumb.png`} alt="" className="ship-rail-art" />
                  <span className="ship-rail-name">{SHIPS[ship.shipType].name}</span>
                  <span className="ship-rail-role">{onLine ? "On the line" : ship.hardpointTier}</span>
                  <span className="ship-rail-data">resale ₡{ship.resaleValue.toLocaleString()}</span>
                </button>
              );
            })}
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
              const item = view?.listings.find((l) => l.shipType === id);
              const price = item?.price ?? 0;
              const net = due(price, outgoing);
              const owned = item?.ownedCount ?? 0;
              const blocked = buying !== null || !view || (full && (!tradeInId || tradeBlocked));
              return (
                <button
                  key={id}
                  type="button"
                  className={`ship-rail-card${pending === id ? " on" : ""}`}
                  disabled={blocked}
                  onClick={() => setPending(id)}
                >
                  <img src={`/ships/${id}-thumb.png`} alt="" className="ship-rail-art" />
                  <span className="ship-rail-name">{SHIPS[id].name}</span>
                  <span className="ship-rail-role">{SHIPS[id].role}</span>
                  <span className="ship-rail-blurb">{SHIPS[id].blurb}</span>
                  <span className="ship-rail-data">
                    {net >= 0 ? `₡${net.toLocaleString()}` : `+₡${(-net).toLocaleString()} back`}
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

      {pending && (
        <HelionConfirm
          kicker="Market"
          title={full ? "Trade hull" : "Buy hull"}
          body={confirmBody}
          confirmLabel={full ? "Trade" : "Buy"}
          busy={Boolean(buying)}
          confirmDisabled={short}
          onConfirm={() => void onBuy(pending)}
          onCancel={() => setPending(null)}
        />
      )}
    </div>
  );
}
