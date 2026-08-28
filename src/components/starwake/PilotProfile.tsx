import { useEffect, useState, type FormEvent } from "react";
import { getMyProfile, saveMyProfile } from "@/lib/player-profile/api";
import {
  PILOT_ICONS,
  getStarterIcons,
  type PilotIconId,
  type PlayerProfile,
} from "@/lib/player-profile/types";
import { hangarSlotCapacity } from "@/lib/ship-ownership/types";

type Props = {
  onBack: () => void;
};

export function PilotProfile({ onBack }: Props) {
  const [profile, setProfile] = useState<PlayerProfile | null>(null);
  const [editing, setEditing] = useState(false);
  const [iconId, setIconId] = useState<PilotIconId>("pilot-01");
  const [displayName, setDisplayName] = useState("");
  const [callSign, setCallSign] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const starters = getStarterIcons();

  useEffect(() => {
    let cancelled = false;
    getMyProfile()
      .then((loaded) => {
        if (cancelled) return;
        setProfile(loaded);
        if (loaded) {
          setIconId(loaded.iconId);
          setDisplayName(loaded.displayName);
          setCallSign(loaded.callSign);
          setEditing(!loaded.callSign || loaded.callSign === "PILOT");
        } else {
          setEditing(true);
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
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== "Escape") return;
      e.preventDefault();
      e.stopPropagation();
      onBack();
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [onBack]);

  async function onSave(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const next = await saveMyProfile({
        data: { displayName: displayName.trim(), callSign: callSign.trim(), iconId },
      });
      setProfile(next);
      setEditing(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  const glyph = PILOT_ICONS.find((i) => i.id === (profile?.iconId ?? iconId))?.svg ?? "👨‍✈️";

  return (
    <div className="gate hangar" data-ui>
      <header className="hangar-head">
        <h1>Pilot</h1>
        <p className="lede">Name, call sign, and rank. Credits live here and on the hangar rail.</p>
      </header>

      {error && <p className="station-repair-err">{error}</p>}

      {!editing && profile ? (
        <div className="pilot-card">
          <div className="pilot-glyph" aria-hidden="true">
            {glyph}
          </div>
          <div>
            <p className="hull-dossier-kicker">
              Rank {profile.currentRank}
              <span className="dot">·</span>
              {profile.callSign}
            </p>
            <h2 className="pilot-name">{profile.displayName}</h2>
            <ul className="hull-chips">
              <li>
                <em>Credits</em>
                <strong>₡{Math.round(profile.credits).toLocaleString()}</strong>
              </li>
              <li>
                <em>XP</em>
                <strong>{Math.round(profile.totalXp).toLocaleString()}</strong>
              </li>
              <li>
                <em>Bays</em>
                <strong>{hangarSlotCapacity(profile.currentRank, profile.hangarBonusSlots)}</strong>
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
                <span aria-hidden="true">{icon.svg}</span>
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
              {busy ? "Saving…" : profile ? "Save" : "Create"}
            </button>
            {profile && (
              <button type="button" className="engage ghost" onClick={() => setEditing(false)}>
                Cancel
              </button>
            )}
          </div>
        </form>
      )}

      <div className="gate-acts">
        <button type="button" className="engage ghost" onClick={onBack}>
          Menu
        </button>
        {!editing && profile && (
          <button type="button" className="engage" onClick={() => setEditing(true)}>
            Edit
          </button>
        )}
      </div>
    </div>
  );
}
