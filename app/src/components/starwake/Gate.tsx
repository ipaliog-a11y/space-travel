import { SHIP_ORDER, SHIPS, fittedShip } from "@/lib/starwake/catalog";
import { holdUsed } from "@/lib/starwake/jobs";
import { useStarwake } from "@/lib/starwake/store";
import type { ShipId } from "@/lib/starwake/types";

type Props = {
  shipId: ShipId;
  onPick: (id: ShipId) => void;
  onHangar: () => void;
  onEngage: () => void;
  onContinue?: () => void;
  hasSave?: boolean;
};

export function Gate({ shipId, onPick, onHangar, onEngage, onContinue, hasSave }: Props) {
  const loadout = useStarwake((s) => s.loadout);
  const manifests = useStarwake((s) => s.manifests);
  const completed = useStarwake((s) => s.completed);

  return (
    <div className="gate menu" data-ui>
      <header className="hangar-head">
        <h1>Starwake</h1>
        <p className="lede">Ships live in the hangar. Haul lock to lock, or survey a wild world from orbit.</p>
        <p className="keys-hint">
          <kbd>A</kbd>/<kbd>Z</kbd> throttle
          <kbd>Q</kbd>/<kbd>E</kbd> roll
          <kbd>R</kbd> boosts
          <kbd>F</kbd> refuel
          <kbd>Esc</kbd> menu
        </p>
      </header>

      <div className="ship-pick">
        {SHIP_ORDER.map((id) => {
          const fit = fittedShip(id, loadout);
          const used = holdUsed(manifests[id]);
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
              <img src={`/ships/${id}.png`} alt="" className="hull-art" />
              <h2>{SHIPS[id].name}</h2>
              <p>{SHIPS[id].blurb}</p>
              <span className="ship-meta">
                {fit.jumpRangeLy.toFixed(0)} ly · {used}/{Math.round(fit.cargoCap)} u
                {manifests[id] ? " · job" : ""}
              </span>
            </button>
          );
        })}
      </div>

      <div className="gate-acts">
        <button type="button" className="engage" onClick={onHangar}>
          Hangar
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
      {completed > 0 && <p className="menu-runs">{completed} run{completed === 1 ? "" : "s"} logged</p>}
    </div>
  );
}
