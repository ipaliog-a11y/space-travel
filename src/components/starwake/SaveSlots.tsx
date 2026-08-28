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
  const deleteSlot = useStarwake((s) => s.deleteSlot);
  const activeHasSave = slots[activeSlotId]?.hasSave;

  return (
    <div className={`save-slots${compact ? " compact" : ""}`} aria-label="Save slots">
      {SAVE_SLOT_IDS.map((id) => {
        const slot = slots[id];
        const on = id === activeSlotId;
        return (
          <div key={id} className={`save-slot${on ? " on" : ""}`}>
            <button type="button" className="save-slot-pick" onClick={() => setActiveSlot(id)}>
              <strong>{slot.name}</strong>
              <span>
                {slot.hasSave
                  ? `${SHIPS[slot.shipId].name} · ${slot.systemId}`
                  : "Empty"}
              </span>
            </button>
            <div className="save-slot-acts">
              {id !== activeSlotId && activeHasSave && (
                <button type="button" className="save-slot-act" onClick={() => copySlot(activeSlotId, id)}>
                  Copy in
                </button>
              )}
              {slot.hasSave && (
                <button type="button" className="save-slot-act" onClick={() => deleteSlot(id)}>
                  Delete
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
