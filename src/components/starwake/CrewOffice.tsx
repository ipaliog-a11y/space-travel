import { useCallback, useEffect, useState } from "react";
import { hireCrewBond, loadRepairStatus, payCrewRun } from "@/lib/hangar/api";
import { CREW_BOND, CREW_UPKEEP, FLEET_CAP, type CrewHull } from "@/lib/starwake/fleet";
import { formatHaul, formatStop } from "@/lib/starwake/jobs";
import { SHIPS } from "@/lib/starwake/catalog";
import { useStarwake } from "@/lib/starwake/store";

type Props = { onBack: () => void };

function etaLabel(endsAt: number, now: number) {
  const s = Math.max(0, Math.ceil((endsAt - now) / 1000));
  if (s <= 0) return "Docked";
  if (s < 60) return `${s}s`;
  return `${Math.floor(s / 60)}m ${s % 60}s`;
}

export function CrewOffice({ onBack }: Props) {
  const crew = useStarwake((s) => s.crew);
  const shipId = useStarwake((s) => s.shipId);
  const [now, setNow] = useState(() => Date.now());
  const [credits, setCredits] = useState<number | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const refreshCredits = useCallback(async () => {
    try {
      const st = await loadRepairStatus({ data: { shipType: shipId } });
      setCredits(st.credits);
    } catch {
      /* hangar stats optional */
    }
  }, [shipId]);

  useEffect(() => {
    void refreshCredits();
  }, [refreshCredits]);

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 500);
    return () => window.clearInterval(id);
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

  async function onHire(hull: CrewHull) {
    if (crew.length >= FLEET_CAP || busy) return;
    setErr(null);
    setBusy(hull);
    try {
      const r = await hireCrewBond({ data: { hull } });
      setCredits(r.credits);
      useStarwake.getState().hireCrew(hull);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Bond failed");
    } finally {
      setBusy(null);
    }
  }

  async function onCollect(id: string) {
    const row = crew.find((c) => c.id === id);
    if (!row?.run || busy) return;
    setErr(null);
    setBusy(id);
    try {
      const r = await payCrewRun({ data: { hull: row.hull, job: row.run.job } });
      setCredits(r.credits);
      useStarwake.getState().claimCrewRun(id, r.paid);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Cut failed");
    } finally {
      setBusy(null);
    }
  }

  const open = FLEET_CAP - crew.length;

  return (
    <div className="gate hangar tape-page helion-dock" data-ui>
      <header className="hangar-head">
        <div className="k">Crew</div>
        <h1>Line office</h1>
        <p className="lede">
          Hire up to two crews. They fly contracts only — packets, not the tape. You take a cut after upkeep. Fly your
          own jobs at the same time.
        </p>
        {credits != null && <p className="bay-caption">Wallet ₡{credits.toLocaleString()}</p>}
      </header>

      <section className="job-board" aria-label="Hired crews">
        <div className="job-board-head">
          <h2>On the line</h2>
          <span>
            {crew.length}/{FLEET_CAP} crews · courier bond ₡{CREW_BOND.courier.toLocaleString()} · hauler ₡
            {CREW_BOND.hauler.toLocaleString()}
          </span>
        </div>
        {crew.length === 0 ? (
          <p className="survey-empty">No crews. Bond a Courier or a Hauler. They loop until you dismiss them.</p>
        ) : (
          <div className="job-grid">
            {crew.map((c) => {
              const due = c.run && !c.run.claimed && now >= c.run.endsAt;
              return (
                <article key={c.id} className="job-card watch-card">
                  <span className="job-kind">
                    {SHIPS[c.hull].name}
                    <em>upkeep ₡{CREW_UPKEEP[c.hull]}</em>
                  </span>
                  <span className="job-title">{c.name}</span>
                  {c.run ? (
                    <p>
                      {c.run.job.cargo} · {c.run.job.qty}u · {formatStop(c.run.job.from)} → {formatStop(c.run.job.to)} ·{" "}
                      {formatHaul(c.run.job)}
                    </p>
                  ) : (
                    <p>Idle.</p>
                  )}
                  <div className="watch-acts">
                    {due ? (
                      <button type="button" className="job-take" onClick={() => void onCollect(c.id)} disabled={busy === c.id}>
                        {busy === c.id ? "Paying" : "Collect"}
                      </button>
                    ) : (
                      <span className="bay-caption">{c.run ? etaLabel(c.run.endsAt, now) : "—"}</span>
                    )}
                    <button type="button" className="job-drop" onClick={() => useStarwake.getState().dismissCrew(c.id)}>
                      Dismiss
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {open > 0 && (
        <section className="job-board">
          <div className="job-board-head">
            <h2>Hire</h2>
            <span>Bond is spent. No refund on dismiss. Cut is 42% of the packet minus upkeep.</span>
          </div>
          <div className="gate-acts">
            <button
              type="button"
              className="engage"
              disabled={Boolean(busy) || (credits != null && credits < CREW_BOND.courier)}
              onClick={() => void onHire("courier")}
            >
              Bond Courier · ₡{CREW_BOND.courier.toLocaleString()}
            </button>
            <button
              type="button"
              className="engage ghost"
              disabled={Boolean(busy) || (credits != null && credits < CREW_BOND.hauler)}
              onClick={() => void onHire("hauler")}
            >
              Bond Hauler · ₡{CREW_BOND.hauler.toLocaleString()}
            </button>
          </div>
        </section>
      )}

      {err && <p className="survey-empty">{err}</p>}

      <div className="gate-acts">
        <button type="button" className="engage ghost" onClick={onBack}>
          Menu
        </button>
      </div>
    </div>
  );
}
