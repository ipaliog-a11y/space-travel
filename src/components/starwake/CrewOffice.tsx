import { useCallback, useEffect, useState } from "react";
import { hireCrewBond, loadHangar, loadRepairStatus, payCrewRun } from "@/lib/hangar/api";
import type { HangarShip } from "@/lib/hangar/types";
import { PilotGlyph } from "@/lib/player-profile/glyphs";
import {
  CREW_BOND,
  CREW_UPKEEP,
  FLEET_CAP,
  crewGlyphId,
  isCrewHull,
  spareShips,
  type Crew,
  type CrewHull,
} from "@/lib/starwake/fleet";
import { diaryEarnings, formatHaul, formatStop } from "@/lib/starwake/jobs";
import { SHIPS } from "@/lib/starwake/catalog";
import { useStarwake } from "@/lib/starwake/store";
import { HelionConfirm } from "./HelionConfirm";

type Props = { onBack: () => void };

function etaLabel(endsAt: number, now: number) {
  const s = Math.max(0, Math.ceil((endsAt - now) / 1000));
  if (s <= 0) return "Docked";
  if (s < 60) return `${s}s`;
  return `${Math.floor(s / 60)}m ${s % 60}s`;
}

function hiredWhen(at: number) {
  if (!at) return "";
  return new Date(at).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function CrewOffice({ onBack }: Props) {
  const crew = useStarwake((s) => s.crew);
  const shipId = useStarwake((s) => s.shipId);
  const [now, setNow] = useState(() => Date.now());
  const [credits, setCredits] = useState<number | null>(null);
  const [ships, setShips] = useState<HangarShip[]>([]);
  const [hangarReady, setHangarReady] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [spareId, setSpareId] = useState<string | null>(null);
  const [pendingHire, setPendingHire] = useState(false);
  const [focusId, setFocusId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const [st, hangar] = await Promise.all([
        loadRepairStatus({ data: { shipType: shipId } }),
        loadHangar(),
      ]);
      setCredits(st.credits);
      setShips(hangar.ships);
    } catch {
      /* hangar stats optional */
    } finally {
      setHangarReady(true);
    }
  }, [shipId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 500);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== "Escape") return;
      e.preventDefault();
      e.stopPropagation();
      if (pendingHire) {
        setPendingHire(false);
        return;
      }
      if (focusId) {
        setFocusId(null);
        return;
      }
      onBack();
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [onBack, pendingHire, focusId]);

  const spares = spareShips(ships, crew);
  const spare = spares.find((s) => s.id === spareId) ?? null;
  const spareHull: CrewHull | null = spare && isCrewHull(spare.shipType) ? spare.shipType : null;
  const open = FLEET_CAP - crew.length;
  const focused = crew.find((c) => c.id === focusId) ?? null;

  useEffect(() => {
    if (spareId && !spares.some((s) => s.id === spareId)) setSpareId(null);
  }, [spareId, spares]);

  async function onHire() {
    if (!spare || !spareHull || crew.length >= FLEET_CAP || busy) return;
    setErr(null);
    setBusy(spare.id);
    try {
      const r = await hireCrewBond({ data: { hull: spareHull, shipKey: spare.id } });
      setCredits(r.credits);
      useStarwake.getState().hireCrew(spareHull, spare.id);
      setPendingHire(false);
      setSpareId(null);
      await refresh();
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

  if (focused) {
    return (
      <CrewDossier
        crew={focused}
        now={now}
        busy={busy}
        ship={ships.find((s) => s.id === focused.shipKey)}
        onBack={() => setFocusId(null)}
        onCollect={() => void onCollect(focused.id)}
        onDismiss={() => {
          useStarwake.getState().dismissCrew(focused.id);
          setFocusId(null);
        }}
      />
    );
  }

  return (
    <div className="gate hangar tape-page helion-dock" data-ui>
      <header className="hangar-head">
        <div className="k">Crew</div>
        <h1>Line office</h1>
        <p className="lede">
          A crew flies a spare hull, not the one you sit in. Bond, then they loop contracts. Open a name for their
          file and diary.
        </p>
        {credits != null && <p className="bay-caption">Wallet ₡{credits.toLocaleString()}</p>}
      </header>

      <section className="job-board" aria-label="Hired crews">
        <div className="job-board-head">
          <h2>On the line</h2>
          <span>
            {crew.length}/{FLEET_CAP} crews
          </span>
        </div>
        {crew.length === 0 ? (
          <p className="survey-empty">No crews. Assign a spare Courier or Hauler, then bond.</p>
        ) : (
          <div className="job-grid">
            {crew.map((c) => {
              const due = c.run && !c.run.claimed && now >= c.run.endsAt;
              return (
                <article key={c.id} className="job-card watch-card">
                  <span className="job-kind">
                    {SHIPS[c.hull].name}
                    <em>
                      {c.completed} haul{c.completed === 1 ? "" : "s"} · ₡{c.earned.toLocaleString()}
                    </em>
                  </span>
                  <span className="job-title">{c.name}</span>
                  {c.run ? (
                    <p>
                      {c.run.job.cargo} · {c.run.job.qty}u · {formatStop(c.run.job.from)} → {formatStop(c.run.job.to)}
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
                    <button type="button" className="job-take" onClick={() => setFocusId(c.id)}>
                      File
                    </button>
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
            <h2>Spare hull</h2>
            <span>They take one bay. You keep one hull to fly.</span>
          </div>
          { !hangarReady ? (
            <p className="survey-empty">Reading the bay…</p>
          ) : spares.length === 0 ? (
            <p className="survey-empty">
              No spare Courier or Hauler. Buy another hull in Market, then come back to bond a crew to it.
            </p>
          ) : (
            <div className="ship-rail" role="listbox" aria-label="Spare hull">
              {spares.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  role="option"
                  aria-selected={spareId === s.id}
                  className={`ship-rail-card${spareId === s.id ? " on" : ""}`}
                  onClick={() => setSpareId(s.id)}
                >
                  <img src={`/ships/${s.shipType}-thumb.png`} alt="" className="ship-rail-art" />
                  <span className="ship-rail-name">{SHIPS[s.shipType as CrewHull].name}</span>
                  <span className="ship-rail-role">{SHIPS[s.shipType as CrewHull].role}</span>
                  <span className="ship-rail-data">
                    bond ₡{CREW_BOND[s.shipType as CrewHull].toLocaleString()}
                  </span>
                </button>
              ))}
            </div>
          )}
          {spareHull && (
            <div className="gate-acts">
              <button
                type="button"
                className="engage"
                disabled={Boolean(busy) || (credits != null && credits < CREW_BOND[spareHull])}
                onClick={() => setPendingHire(true)}
              >
                Bond {SHIPS[spareHull].name} · ₡{CREW_BOND[spareHull].toLocaleString()}
              </button>
            </div>
          )}
        </section>
      )}

      {err && <p className="survey-empty">{err}</p>}

      <div className="gate-acts">
        <button type="button" className="engage ghost" onClick={onBack}>
          Menu
        </button>
      </div>

      {pendingHire && spare && spareHull && (
        <HelionConfirm
          kicker="Line office"
          title={`Bond ${SHIPS[spareHull].name}`}
          body={`Assign this spare ${SHIPS[spareHull].name} to a crew for ₡${CREW_BOND[spareHull].toLocaleString()}. No refund on dismiss. Upkeep ₡${CREW_UPKEEP[spareHull]} a run.`}
          confirmLabel="Bond"
          busy={Boolean(busy)}
          onConfirm={() => void onHire()}
          onCancel={() => setPendingHire(false)}
        />
      )}
    </div>
  );
}

function CrewDossier({
  crew,
  now,
  busy,
  ship,
  onBack,
  onCollect,
  onDismiss,
}: {
  crew: Crew;
  now: number;
  busy: string | null;
  ship?: HangarShip;
  onBack: () => void;
  onCollect: () => void;
  onDismiss: () => void;
}) {
  const due = crew.run && !crew.run.claimed && now >= crew.run.endsAt;
  const earned = crew.earned || diaryEarnings(crew.log);

  return (
    <div className="gate hangar tape-page helion-dock" data-ui>
      <header className="hangar-head">
        <div className="k">Crew</div>
        <h1>{crew.name}</h1>
        <p className="lede">
          {SHIPS[crew.hull].name}
          {ship ? ` · ${ship.hardpointTier}` : ""}
          {crew.hiredAt ? ` · hired ${hiredWhen(crew.hiredAt)}` : ""}
        </p>
      </header>

      <div className="pilot-card">
        <div className="pilot-glyph" aria-hidden="true">
          <PilotGlyph id={crewGlyphId(crew.name)} />
        </div>
        <div>
          <p className="hull-dossier-kicker">
            {SHIPS[crew.hull].role}
            <span className="dot">·</span>
            {crew.name.toUpperCase()}
          </p>
          <h2 className="pilot-name">{crew.name}</h2>
          <ul className="hull-chips">
            <li>
              <em>Cut</em>
              <strong>₡{Math.round(earned).toLocaleString()}</strong>
            </li>
            <li>
              <em>Hauls</em>
              <strong>{crew.completed}</strong>
            </li>
            <li>
              <em>Hull</em>
              <strong>{ship ? SHIPS[crew.hull].name : "Unassigned"}</strong>
            </li>
          </ul>
        </div>
      </div>

      {crew.run && (
        <section className="job-board">
          <div className="job-board-head">
            <h2>Now</h2>
            <span>{due ? "Docked" : etaLabel(crew.run.endsAt, now)}</span>
          </div>
          <article className="job-card">
            <span className="job-kind">
              {crew.run.job.kind}
              <em>
                {crew.run.job.qty} u · {formatHaul(crew.run.job)}
              </em>
            </span>
            <span className="job-title">{crew.run.job.cargo}</span>
            <span className="job-route">
              {formatStop(crew.run.job.from)} → {formatStop(crew.run.job.to)}
            </span>
          </article>
        </section>
      )}

      <section className="job-board" aria-label={`${crew.name} diary`}>
        <div className="job-board-head">
          <h2>Diary</h2>
          <span>
            {crew.log.length} logged
            {earned > 0 ? ` · ₡${earned.toLocaleString()}` : ""}
          </span>
        </div>
        {crew.log.length === 0 ? (
          <p className="survey-empty">Collect a cut and it lands in this file, not the pilot diary.</p>
        ) : (
          <div className="job-grid">
            {crew.log.map((row) => (
              <article key={`${row.id}-${row.at}`} className="job-card">
                <span className="job-kind">
                  {row.qty} u · ₡{row.pay.toLocaleString()}
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

      <div className="gate-acts">
        <button type="button" className="engage ghost" onClick={onBack}>
          Office
        </button>
        {due && (
          <button type="button" className="engage" onClick={onCollect} disabled={busy === crew.id}>
            {busy === crew.id ? "Paying" : "Collect"}
          </button>
        )}
        <button type="button" className="engage ghost" onClick={onDismiss}>
          Dismiss
        </button>
      </div>
    </div>
  );
}
