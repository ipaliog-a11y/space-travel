import { SHIP_SETS, SHIPS, fittedShip } from "@/lib/starwake/catalog";
import { diaryEarnings, holdUsed } from "@/lib/starwake/jobs";
import { useStarwake } from "@/lib/starwake/store";
import type { ShipId } from "@/lib/starwake/types";
import { SaveSlots } from "./SaveSlots";

type Props = {
  shipId: ShipId;
  onPick: (id: ShipId) => void;
  onHangar: () => void;
  onProfile: () => void;
  onMarket: () => void;
  onWatch: () => void;
  onEngage: () => void;
  onContinue?: () => void;
  hasSave?: boolean;
  ownedHulls: ShipId[] | null;
};

export function Gate({
  shipId,
  onPick,
  onHangar,
  onProfile,
  onMarket,
  onWatch,
  onEngage,
  onContinue,
  hasSave,
  ownedHulls,
}: Props) {
  const loadout = useStarwake((s) => s.loadout);
  const manifests = useStarwake((s) => s.manifests);
  const cargoHolds = useStarwake((s) => s.cargo);
  const completed = useStarwake((s) => s.completed);
  const earned = diaryEarnings(useStarwake((s) => s.jobLog));

  return (
    <div className="gate menu" data-ui>
      <header className="hangar-head">
        <h1>Starwake</h1>
        <p className="lede">Two hangar sets. Line flies the routes. Yard fuels and shoves. Home is Helios.</p>
        <p className="keys-hint">
          <kbd>A</kbd>/<kbd>Z</kbd> throttle
          <kbd>Q</kbd>/<kbd>E</kbd> roll
          <kbd>R</kbd> boosts
          <kbd>Esc</kbd> menu
        </p>
      </header>

      {SHIP_SETS.map((set) => {
        const hulls = ownedHulls?.filter((id) => set.hulls.includes(id)) ?? [];
        if (hulls.length === 0) return null;
        return (
        <section key={set.id} className={`ship-set ship-set-${set.id}`}>
          <div className="ship-set-head">
            <h2>{set.label}</h2>
            <p>{set.blurb}</p>
          </div>
          <div className="ship-pick">
            {hulls.map((id) => {
              const fit = fittedShip(id, loadout);
              const used = holdUsed(manifests[id], cargoHolds[id]);
              return (
                <button
                  key={id}
                  type="button"
                  className={`ship-card${shipId === id ? " on" : ""}`}
                  onClick={() => {
                    onPick(id);
                    onHangar();
                  }}
                >
                  <img src={`/ships/${id}-thumb.png`} alt="" className="hull-art" />
                  <h2>{SHIPS[id].name}</h2>
                  <span className="ship-role">{SHIPS[id].role}</span>
                  <p>{SHIPS[id].blurb}</p>
                  <span className="ship-meta">
                    {fit.jumpRangeLy.toFixed(0)} ly · {used}/{Math.round(fit.cargoCap)} u · t1 {Math.round(fit.fuelCap)} · t2 {Math.round(fit.fuelCap2)}
                    {manifests[id] ? " · job" : cargoHolds[id]?.length ? " · cargo" : ""}
                  </span>
                </button>
              );
            })}
          </div>
        </section>
        );
      })}

      <SaveSlots />

      <div className="gate-acts">
        <button type="button" className="engage" onClick={onHangar}>
          Hangar
        </button>
        <button type="button" className="engage ghost" onClick={onMarket}>
          Market
        </button>
        <button type="button" className="engage ghost" onClick={onWatch}>
          Watch
        </button>
        <button type="button" className="engage ghost" onClick={onProfile}>
          Pilot
        </button>
        {hasSave && onContinue && (
          <button type="button" className="engage ghost" onClick={onContinue}>
            Continue
          </button>
        )}
        <button type="button" className="engage ghost" onClick={onEngage}>
          {hasSave ? "New" : "Engage"}
        </button>
      </div>
      {completed > 0 && (
        <p className="menu-runs">
          {completed} run{completed === 1 ? "" : "s"} logged
          {earned > 0 ? ` · ₡${earned.toLocaleString()} earned` : ""}
        </p>
      )}
    </div>
  );
}
