import { useEffect, useState } from "react";
import { debugSetMyPilot, getMyProfile } from "@/lib/player-profile/api";
import { clampDebugPilot } from "@/lib/player-profile/types";
import { HelionConfirm } from "./HelionConfirm";

type Props = { onClose: () => void };

export function DebugBench({ onClose }: Props) {
  const [xp, setXp] = useState("0");
  const [credits, setCredits] = useState("0");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const p = await getMyProfile();
        if (!p) return;
        setXp(String(p.totalXp));
        setCredits(String(Math.round(p.credits)));
      } catch {
        /* leave zeros */
      }
    })();
  }, []);

  async function apply() {
    setErr(null);
    setBusy(true);
    try {
      const next = clampDebugPilot(xp, credits);
      const p = await debugSetMyPilot({ data: { xp: next.xp, credits: next.credits } });
      setXp(String(p.totalXp));
      setCredits(String(Math.round(p.credits)));
      setNote(`Rank ${p.currentRank} · ₡${Math.round(p.credits).toLocaleString()}`);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Bench failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <HelionConfirm
      kicker="Bench"
      title="Set the career"
      body="XP and credits on this account. Rank follows XP. Hangar and market read the new wallet."
      confirmLabel={busy ? "Writing" : "Set"}
      busy={busy}
      onConfirm={() => void apply()}
      onCancel={onClose}
    >
      <label className="bench-row">
        <span>XP</span>
        <input
          inputMode="numeric"
          value={xp}
          onChange={(e) => setXp(e.target.value)}
          aria-label="XP"
        />
      </label>
      <label className="bench-row">
        <span>Credits</span>
        <input
          inputMode="numeric"
          value={credits}
          onChange={(e) => setCredits(e.target.value)}
          aria-label="Credits"
        />
      </label>
      {note && <p className="bay-caption">{note}</p>}
      {err && <p className="survey-empty">{err}</p>}
    </HelionConfirm>
  );
}
