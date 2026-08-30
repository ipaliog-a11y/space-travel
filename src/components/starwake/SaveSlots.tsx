import { SHIPS } from "@/lib/starwake/catalog";
import { SAVE_SLOT_IDS } from "@/lib/starwake/saves";
import { useStarwake } from "@/lib/starwake/store";

type Props = {
  compact?: boolean;
};

export function SaveSlots({ compact }: Props) {
  const activeSlotId = useStarwake((s) => s.activeSlotId);
  const slots = useStarwake((s) => s.slots);
  const setActiveSlot = useStarwake((s) => s.setActiveSlot);
  const copySlot = useStarwake((s) => s.copySlot);
  const activeHasSave = slots[activeSlotId]?.hasSave;

  return (
    <div className={`save-slots${compact ? " compact" : ""}`} aria-label="Save slots">
      {SAVE_SLOT_IDS.map((id) => {
        const slot = slots[id];
        const on = id === activeSlotId;
        const occupied = slot.hasSave || Boolean(slot.career);
        const label = slot.career?.callSign ?? slot.name;
        return (
          <div key={id} className={`save-slot${on ? " on" : ""}`}>
            <button
              type="button"
              className="save-slot-pick"
              disabled={!occupied}
              onClick={() => occupied && setActiveSlot(id)}
            >
              <strong>{label}</strong>
              <span>
                {occupied
                  ? `${slot.career?.displayName ? `${slot.career.displayName} · ` : ""}${SHIPS[slot.shipId].name}`
                  : "Empty"}
              </span>
            </button>
            <div className="save-slot-acts">
              {id !== activeSlotId && activeHasSave && (
                <button type="button" className="save-slot-act" onClick={() => copySlot(activeSlotId, id)}>
                  Copy in
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
