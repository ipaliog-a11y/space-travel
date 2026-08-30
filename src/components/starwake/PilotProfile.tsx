import { useEffect, useState, type FormEvent } from "react";
import { getMyProfile, saveMyProfile } from "@/lib/player-profile/api";
import { PilotGlyph } from "@/lib/player-profile/glyphs";
import {
  getStarterIcons,
  isProfileComplete,
  type PilotIconId,
  type PlayerProfile,
} from "@/lib/player-profile/types";
import { hangarSlotCapacity } from "@/lib/ship-ownership/types";
import { diaryEarnings, formatHaul, formatStop } from "@/lib/starwake/jobs";
import { firstEmptySlotId, firstOccupiedSlotId } from "@/lib/starwake/saves";
import { useStarwake } from "@/lib/starwake/store";

type Props = {
  onBack: () => void;
  /** First-run or new career: no Menu / Esc until the profile is saved. */
  required?: boolean;
  onSaved?: () => void;
  onCreateNew?: () => void;
};

export function PilotProfile({ onBack, required, onSaved, onCreateNew }: Props) {
  const [profile, setProfile] = useState<PlayerProfile | null>(null);
  const [editing, setEditing] = useState(Boolean(required));
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [iconId, setIconId] = useState<PilotIconId>("pilot-01");
  const [displayName, setDisplayName] = useState("");
  const [callSign, setCallSign] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const starters = getStarterIcons();
  const jobLog = useStarwake((s) => s.jobLog);
  const completed = useStarwake((s) => s.completed);
  const career = useStarwake((s) => s.career);
  const slots = useStarwake((s) => s.slots);
  const earned = diaryEarnings(jobLog);
  const slotFree = Boolean(firstEmptySlotId(slots));
  const creating = !career;
  const shownName = career?.displayName ?? profile?.displayName ?? "";
  const shownCall = career?.callSign ?? profile?.callSign ?? "";
  const glyphId = career?.iconId ?? profile?.iconId ?? iconId;

  useEffect(() => {
    let cancelled = false;
    getMyProfile()
      .then((loaded) => {
        if (cancelled) return;
        setProfile(loaded);
        const st = useStarwake.getState();
        if (!st.career && !firstOccupiedSlotId(st.slots) && loaded && isProfileComplete(loaded)) {
          setDisplayName(loaded.displayName);
          setCallSign(loaded.callSign);
          setIconId(loaded.iconId);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Profile failed to load");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!career) {
      setDisplayName("");
      setCallSign("");
      setIconId("pilot-01");
      setEditing(true);
      setConfirmDelete(false);
      return;
    }
    setDisplayName(career.displayName);
    setCallSign(career.callSign);
    setIconId(career.iconId);
    if (!required) setEditing(false);
  }, [career, required]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== "Escape") return;
      if (required && editing) return;
      e.preventDefault();
      e.stopPropagation();
      onBack();
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [onBack, required, editing]);

  async function onSave(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const name = displayName.trim();
      const call = callSign.trim().toUpperCase();
      if (name === "Pilot" && call === "PILOT") {
        setError("Pick a name and call sign of your own");
        setBusy(false);
        return;
      }
      const next = await saveMyProfile({
        data: { displayName: name, callSign: call, iconId },
      });
      setProfile(next);
      useStarwake.getState().setCareer({ displayName: name, callSign: call, iconId });
      setEditing(false);
      onSaved?.();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  function onDelete() {
    const st = useStarwake.getState();
    st.deleteCareerSlot(st.activeSlotId);
    setConfirmDelete(false);
  }

  return (
    <div className="gate hangar" data-ui>
      <header className="hangar-head">
        <h1>{required || creating ? "Call sign" : "Pilot"}</h1>
        <p className="lede">
          {required || creating
            ? "Name and call sign occupy a save slot. Then you pick a hull and wake in Helios."
            : "This slot holds the pilot and the hauls. Create another profile to occupy an empty slot."}
        </p>
      </header>

      {error && <p className="station-repair-err">{error}</p>}

      {!editing && career ? (
        <div className="pilot-card">
          <div className="pilot-glyph" aria-hidden="true">
            <PilotGlyph id={glyphId} />
          </div>
          <div>
            <p className="hull-dossier-kicker">
              Rank {profile?.currentRank ?? 1}
              <span className="dot">·</span>
              {shownCall}
            </p>
            <h2 className="pilot-name">{shownName}</h2>
            <ul className="hull-chips">
              <li>
                <em>Credits</em>
                <strong>₡{Math.round(profile?.credits ?? 0).toLocaleString()}</strong>
              </li>
              <li>
                <em>XP</em>
                <strong>{Math.round(profile?.totalXp ?? 0).toLocaleString()}</strong>
              </li>
              <li>
                <em>Bays</em>
                <strong>
                  {hangarSlotCapacity(profile?.currentRank ?? 1, profile?.hangarBonusSlots ?? 0)}
                </strong>
              </li>
            </ul>
          </div>
        </div>
      ) : (
        <form className="pilot-form" onSubmit={(e) => void onSave(e)}>
          <p className="ship-set-head">
            <span>Icon</span>
          </p>
          <div className="pilot-icons" role="listbox" aria-label="Pilot icon">
            {starters.map((icon) => (
              <button
                key={icon.id}
                type="button"
                role="option"
                aria-selected={iconId === icon.id}
                className={`pilot-icon${iconId === icon.id ? " on" : ""}`}
                onClick={() => setIconId(icon.id)}
              >
                <span className="pilot-icon-mark" aria-hidden="true">
                  <PilotGlyph id={icon.id} />
                </span>
                <em>{icon.name}</em>
              </button>
            ))}
          </div>
          <label className="pilot-field">
            Display name
            <input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              maxLength={100}
              required
              autoComplete="nickname"
            />
          </label>
          <label className="pilot-field">
            Call sign
            <input
              value={callSign}
              onChange={(e) => setCallSign(e.target.value.toUpperCase())}
              maxLength={20}
              minLength={3}
              required
              autoComplete="off"
            />
          </label>
          <div className="gate-acts">
            <button type="submit" className="engage" disabled={busy}>
              {busy ? "Saving…" : career ? "Save" : "Create"}
            </button>
            {career && !required && (
              <button type="button" className="engage ghost" onClick={() => setEditing(false)}>
                Cancel
              </button>
            )}
            {creating && !required && (
              <button type="button" className="engage ghost" onClick={onBack}>
                Cancel
              </button>
            )}
          </div>
        </form>
      )}

      {!required && career && (
        <section className="job-board pilot-diary" aria-label="Job diary">
          <div className="job-board-head">
            <h2>Diary</h2>
            <span>
              {completed} haul{completed === 1 ? "" : "s"} · ₡{earned.toLocaleString()} earned
            </span>
          </div>
          {jobLog.length === 0 ? (
            <p className="bay-caption">Deliver a hub contract and it lands here with the payout.</p>
          ) : (
            <div className="job-grid">
              {jobLog.map((row) => (
                <article key={`${row.id}-${row.at}`} className="job-card">
                  <span className="job-kind">
                    {row.kind} · {row.qty} u · ₡{row.pay.toLocaleString()}
                  </span>
                  <span className="job-title">{row.cargo}</span>
                  <span className="job-route">
                    {formatStop(row.from)} → {formatStop(row.to)} · {formatHaul(row)}
                  </span>
                </article>
              ))}
            </div>
          )}
        </section>
      )}

      {!required && career && (
        <div className="gate-acts">
          <button type="button" className="engage ghost" onClick={onBack}>
            Menu
          </button>
          {!editing && career && (
            <button type="button" className="engage" onClick={() => setEditing(true)}>
              Edit
            </button>
          )}
          {!editing && onCreateNew && (
            <button
              type="button"
              className="engage ghost"
              disabled={!slotFree}
              onClick={() => {
                if (!slotFree) {
                  setError("All three slots are occupied. Delete a profile first.");
                  return;
                }
                onCreateNew();
              }}
            >
              Create new profile
            </button>
          )}
          {!editing && career && !confirmDelete && (
            <button type="button" className="engage ghost" onClick={() => setConfirmDelete(true)}>
              Delete profile
            </button>
          )}
        </div>
      )}

      {!required && confirmDelete && career && (
        <div className="pilot-delete">
          <p className="lede">
            Delete {career.callSign} and the progress in this slot? This cannot be undone.
          </p>
          <div className="gate-acts">
            <button type="button" className="engage" onClick={onDelete}>
              Delete
            </button>
            <button type="button" className="engage ghost" onClick={() => setConfirmDelete(false)}>
              Keep
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
