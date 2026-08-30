import { useState } from "react";
import { SHIPS, STARTER_HULLS, fittedShip } from "@/lib/starwake/catalog";
import { HOME_SYSTEM_NAME } from "@/lib/starwake/galaxy";
import { useStarwake } from "@/lib/starwake/store";
import type { ShipId } from "@/lib/starwake/types";

type Props = {
  shipId: ShipId;
  onPick: (id: ShipId) => void;
  onClaim: (id: ShipId) => Promise<void>;
};

export function StarterPick({ shipId, onPick, onClaim }: Props) {
  const loadout = useStarwake((s) => s.loadout);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pick = STARTER_HULLS.includes(shipId) ? shipId : STARTER_HULLS[0];

  async function claim() {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await onClaim(pick);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Claim failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="gate hangar" data-ui>
      <header className="hangar-head">
        <h1>First hull</h1>
        <p className="lede">
          One free stock ship. Rank 1 has one bay. You start in {HOME_SYSTEM_NAME}.
        </p>
      </header>

      {error && <p className="station-repair-err">{error}</p>}

      <div className="ship-pick starter-pick">
        {STARTER_HULLS.map((id) => {
          const fit = fittedShip(id, loadout);
          return (
            <button
              key={id}
              type="button"
              className={`ship-card${pick === id ? " on" : ""}`}
              onClick={() => onPick(id)}
            >
              <img src={`/ships/${id}-thumb.png`} alt="" className="hull-art" />
              <h2>{SHIPS[id].name}</h2>
              <span className="ship-role">{SHIPS[id].role}</span>
              <p>{SHIPS[id].blurb}</p>
              <span className="ship-meta">
                {fit.jumpRangeLy.toFixed(0)} ly · {Math.round(fit.cargoCap)} u · t1 {Math.round(fit.fuelCap)} · t2{" "}
                {Math.round(fit.fuelCap2)}
              </span>
            </button>
          );
        })}
      </div>

      <div className="gate-acts">
        <button type="button" className="engage" onClick={() => void claim()} disabled={busy}>
          {busy ? "Claiming…" : `Claim ${SHIPS[pick].name}`}
        </button>
      </div>
    </div>
  );
}
