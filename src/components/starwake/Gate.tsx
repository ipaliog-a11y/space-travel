import { useState } from "react";
import { SHIPS } from "@/lib/starwake/catalog";
import { useStarwake } from "@/lib/starwake/store";
import type { ShipId } from "@/lib/starwake/types";
import { DebugBench } from "./DebugBench";

type Props = {
  shipId: ShipId;
  onHangar: () => void;
  onProfile: () => void;
  onMarket: () => void;
  onWatch: () => void;
  onCrew: () => void;
  onEngage: () => void;
  onContinue?: () => void;
  hasSave?: boolean;
};

export function Gate({
  shipId,
  onHangar,
  onProfile,
  onMarket,
  onWatch,
  onCrew,
  onEngage,
  onContinue,
  hasSave,
}: Props) {
  const career = useStarwake((s) => s.career);
  const [bench, setBench] = useState(false);

  return (
    <div className="gate menu helion-dock" data-ui>
      <header className="hangar-head">
        <div className="k">Gate</div>
        <h1>Starwake</h1>
        <p className="lede">
          {career?.callSign ? `${career.callSign} · ` : ""}
          {SHIPS[shipId]?.name ?? "Hull"} on the pad. Hangar for the bay. Fly to undock.
        </p>
      </header>

      <div className="gate-acts">
        <button type="button" className="engage" onClick={onHangar}>
          Hangar
        </button>
        <button type="button" className="engage" onClick={hasSave && onContinue ? onContinue : onEngage}>
          Fly
        </button>
        <button type="button" className="engage ghost" onClick={onMarket}>
          Market
        </button>
        <button type="button" className="engage ghost" onClick={onWatch}>
          Watch
        </button>
        <button type="button" className="engage ghost" onClick={onCrew}>
          Crew
        </button>
        <button type="button" className="engage ghost" onClick={onProfile}>
          Pilot
        </button>
        <button type="button" className="engage ghost" onClick={() => setBench(true)}>
          Bench
        </button>
      </div>
      {bench && <DebugBench onClose={() => setBench(false)} />}
    </div>
  );
}
