import { useCallback, useEffect, useState } from "react";
import { hireCrewBond, loadHangar, loadRepairStatus, payCrewRun, serviceCrewPad } from "@/lib/hangar/api";
import type { HangarShip } from "@/lib/hangar/types";
import { PilotGlyph } from "@/lib/player-profile/glyphs";
import {
  CREW_BOND,
  FLEET_CAP,
  crewGlyphId,
  spareShips,
  type Crew,
  type CrewHull,
} from "@/lib/starwake/fleet";
import { crewArms, crewGrade, crewXpInto } from "@/lib/starwake/crew-grade";
import { rollCrewPirate } from "@/lib/starwake/fleet-run";
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

function crewCut(c: Crew) {
  return c.earned || diaryEarnings(c.log);
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
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [spareId, setSpareId] = useState<string | null>(null);
  const [hireHull, setHireHull] = useState<CrewHull | null>(null);
  const [pendingHire, setPendingHire] = useState(false);
  const [assignFor, setAssignFor] = useState<string | null>(null);
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
      if (assignFor) {
        setAssignFor(null);
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
  }, [onBack, pendingHire, focusId, assignFor]);

  const spares = spareShips(ships, crew);
  const open = FLEET_CAP - crew.length;
  const focused = crew.find((c) => c.id === focusId) ?? null;
  const office = crew.filter((c) => !c.shipKey);
  const line = crew.filter((c) => c.shipKey);
  const assignSpares = assignFor
    ? spares.filter((s) => {
        const row = crew.find((c) => c.id === assignFor);
        return row && s.shipType === row.hull;
      })
    : [];

  async function onHire() {
    if (!hireHull || crew.length >= FLEET_CAP || busy) return;
    setErr(null);
    setBusy(hireHull);
    try {
      const r = await hireCrewBond({ data: { hull: hireHull } });
      setCredits(r.credits);
      useStarwake.getState().hireCrew(hireHull);
      setPendingHire(false);
      setHireHull(null);
      await refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Bond failed");
    } finally {
      setBusy(null);
    }
  }

  function onAssign(crewId: string, shipKey: string) {
    const row = crew.find((c) => c.id === crewId);
    if (!row || busy) return;
    if (!useStarwake.getState().assignCrew(crewId, shipKey)) {
      setErr("Cannot assign while they are on a hop.");
      return;
    }
    setAssignFor(null);
    setSpareId(null);
  }

  async function onCollect(id: string) {
    const row = crew.find((c) => c.id === id);
    if (!row?.run?.job || row.run.phase !== "flight" || busy) return;
    setErr(null);
    setBusy(id);
    try {
      const pirate = rollCrewPirate(row, Date.now());
      if (row.shipKey) {
        useStarwake.getState().topOffCrewHull(row.hull);
        void serviceCrewPad({ data: { shipKey: row.shipKey } }).catch(() => {});
      }
      if (pirate.lost) {
        useStarwake.getState().claimCrewRun(id, -1);
        useStarwake.getState().pushNotice({
          kicker: "Intercept",
          title: `${row.name} stopped`,
          body: row.hull === "extractor" ? "Pull gone." : "Packet gone.",
        });
        setErr(`${row.name} lost the ${row.hull === "extractor" ? "pull" : "packet"}.`);
        return;
      }
      if (row.hull === "extractor") {
        const job = row.run.job;
        useStarwake.getState().claimCrewRun(id, 0);
        const annex = useStarwake.getState().outpost;
        const pad = annex && annex.systemId === job.to.systemId ? annex.name : "the pad";
        useStarwake.getState().pushNotice({
          kicker: "Pull",
          title: `${row.name} dumped`,
          body: `${job.qty} u ${job.cargo} on ${pad}. Rel + tanks.`,
        });
        return;
      }
      const r = await payCrewRun({ data: { hull: row.hull, job: row.run.job } });
      setCredits(r.credits);
      useStarwake.getState().claimCrewRun(id, r.paid);
      useStarwake.getState().pushNotice({
        kicker: "Line",
        title: `${row.name} docked`,
        body: `Cut ₡${r.paid.toLocaleString()}. Rel + tanks.`,
      });
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Cut failed");
    } finally {
      setBusy(null);
    }
  }

  if (focused && !assignFor) {
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
        onPark={() => {
          if (!useStarwake.getState().parkCrew(focused.id)) setErr("Wait until they dock.");
        }}
        onAssign={() => setAssignFor(focused.id)}
      />
    );
  }

  return (
    <div className="gate hangar tape-page helion-dock" data-ui>
      <header className="hangar-head">
        <div className="k">Crew</div>
        <h1>Line office</h1>
        <p className="lede">
          Bond a hand first. Then assign a spare hull. Park them and they wait here — not fired. Green hands take local film, sit the hop, and cannot hold a pirate.
        </p>
        {credits != null && <p className="bay-caption">Wallet ₡{credits.toLocaleString()}</p>}
      </header>

      <section className="job-board" aria-label="Office">
        <div className="job-board-head">
          <h2>Office</h2>
          <span>
            {crew.length}/{FLEET_CAP} bonded
          </span>
        </div>
        {office.length === 0 ? (
          <p className="survey-empty">Empty benches. Bond a Courier, Hauler, or Extractor hand.</p>
        ) : (
          <div className="job-grid">
            {office.map((c) => {
              const grade = crewGrade(c.xp ?? 0);
              return (
                <article key={c.id} className="job-card watch-card">
                  <span className="job-kind">
                    {SHIPS[c.hull].name}
                    <em>
                      {grade.name} · {crewArms(c.xp ?? 0)}
                    </em>
                  </span>
                  <span className="job-title">{c.name}</span>
                  <p>Waiting. Assign a spare {SHIPS[c.hull].name}.</p>
                  <p className="bay-caption">Cut ₡{Math.round(crewCut(c)).toLocaleString()}</p>
                  <div className="watch-acts">
                    <button type="button" className="job-take" onClick={() => setAssignFor(c.id)}>
                      Assign
                    </button>
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

      <section className="job-board" aria-label="On the line">
        <div className="job-board-head">
          <h2>On the line</h2>
          <span>{line.length} flying</span>
        </div>
        {line.length === 0 ? (
          <p className="survey-empty">No assigned hulls. Office hands stay on the bench.</p>
        ) : (
          <div className="job-grid">
            {line.map((c) => {
              const due = c.run && c.run.phase === "flight" && !c.run.claimed && now >= c.run.endsAt;
              const rest = c.run?.phase === "rest";
              const grade = crewGrade(c.xp ?? 0);
              return (
                <article key={c.id} className="job-card watch-card">
                  <span className="job-kind">
                    {SHIPS[c.hull].name}
                    <em>
                      {grade.name} · {crewArms(c.xp ?? 0)}
                    </em>
                  </span>
                  <span className="job-title">{c.name}</span>
                  {rest ? (
                    <p>Pad rest · Rel + tanks · {etaLabel(c.run!.endsAt, now)}</p>
                  ) : c.run?.job ? (
                    <p>
                      {c.run.job.cargo} · {c.run.job.qty}u · {formatStop(c.run.job.from)} → {formatStop(c.run.job.to)}
                    </p>
                  ) : (
                    <p>Assigned. Idle.</p>
                  )}
                  <p className="bay-caption">Cut ₡{Math.round(crewCut(c)).toLocaleString()}</p>
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
                    <button
                      type="button"
                      className="job-drop"
                      disabled={c.run?.phase === "flight"}
                      onClick={() => {
                        if (!useStarwake.getState().parkCrew(c.id)) setErr("Wait until they dock.");
                      }}
                    >
                      Park
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
            <h2>Bond</h2>
            <span>Hire to the office. Assign a hull after.</span>
          </div>
          <div className="ship-rail" role="listbox" aria-label="Crew line">
            {(["courier", "hauler", "extractor"] as CrewHull[]).map((h) => (
              <button
                key={h}
                type="button"
                role="option"
                aria-selected={hireHull === h}
                className={`ship-rail-card${hireHull === h ? " on" : ""}`}
                onClick={() => setHireHull(h)}
              >
                <img src={`/ships/${h}-thumb.png`} alt="" className="ship-rail-art" />
                <span className="ship-rail-name">{SHIPS[h].name}</span>
                <span className="ship-rail-role">{SHIPS[h].role}</span>
                <span className="ship-rail-data">bond ₡{CREW_BOND[h].toLocaleString()}</span>
              </button>
            ))}
          </div>
          {hireHull && (
            <div className="gate-acts">
              <button
                type="button"
                className="engage"
                disabled={Boolean(busy) || (credits != null && credits < CREW_BOND[hireHull])}
                onClick={() => setPendingHire(true)}
              >
                Bond {SHIPS[hireHull].name} · ₡{CREW_BOND[hireHull].toLocaleString()}
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

      {pendingHire && hireHull && (
        <HelionConfirm
          kicker="Line office"
          title={`Bond ${SHIPS[hireHull].name} hand`}
          body={`Pay ₡${CREW_BOND[hireHull].toLocaleString()} to hire a green ${SHIPS[hireHull].name} crew into the office. They wait here until you assign a spare hull. No refund on dismiss.`}
          confirmLabel="Bond"
          busy={Boolean(busy)}
          onConfirm={() => void onHire()}
          onCancel={() => setPendingHire(false)}
        />
      )}

      {assignFor && (
        <HelionConfirm
          kicker="Line office"
          title="Assign hull"
          body={
            assignSpares.length === 0
              ? "No spare matching hull. Buy another in Market, and keep one bay for yourself."
              : "They take this bay. You cannot fly it while they hold it. Park returns them to the office."
          }
          confirmLabel={spareId ? "Assign" : "Assign"}
          confirmDisabled={!spareId || assignSpares.length === 0}
          busy={Boolean(busy)}
          onConfirm={() => {
            if (spareId) onAssign(assignFor, spareId);
          }}
          onCancel={() => {
            setAssignFor(null);
            setSpareId(null);
          }}
        >
          {assignSpares.length > 0 && (
            <div className="ship-rail" role="listbox" aria-label="Spare hull">
              {assignSpares.map((s) => (
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
                  <span className="ship-rail-data">{s.id.slice(-4)}</span>
                </button>
              ))}
            </div>
          )}
        </HelionConfirm>
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
  onPark,
  onAssign,
}: {
  crew: Crew;
  now: number;
  busy: string | null;
  ship?: HangarShip;
  onBack: () => void;
  onCollect: () => void;
  onDismiss: () => void;
  onPark: () => void;
  onAssign: () => void;
}) {
  const due = crew.run && crew.run.phase === "flight" && !crew.run.claimed && now >= crew.run.endsAt;
  const rest = crew.run?.phase === "rest";
  const earned = crew.earned || diaryEarnings(crew.log);
  const into = crewXpInto(crew.xp ?? 0);
  const job = crew.run?.job;

  return (
    <div className="gate hangar tape-page helion-dock" data-ui>
      <header className="hangar-head">
        <div className="k">Crew</div>
        <h1>{crew.name}</h1>
        <p className="lede">
          {SHIPS[crew.hull].name}
          {crew.shipKey ? (ship ? ` · ${ship.hardpointTier}` : " · assigned") : " · office"}
          {crew.hiredAt ? ` · hired ${hiredWhen(crew.hiredAt)}` : ""}
        </p>
      </header>

      <div className="pilot-card">
        <div className="pilot-glyph" aria-hidden="true">
          <PilotGlyph id={crewGlyphId(crew.name)} />
        </div>
        <div>
          <p className="hull-dossier-kicker">
            {into.grade.name}
            <span className="dot">·</span>
            {crewArms(crew.xp ?? 0)}
          </p>
          <h2 className="pilot-name">{crew.name}</h2>
          <ul className="hull-chips">
            <li>
              <em>Cut</em>
              <strong>₡{Math.round(earned).toLocaleString()}</strong>
            </li>
            <li>
              <em>XP</em>
              <strong>
                {into.next ? `${into.have}/${into.need}` : "cap"}
              </strong>
            </li>
            <li>
              <em>Pad</em>
              <strong>{Math.round(into.grade.restMul * 100)}%</strong>
            </li>
          </ul>
        </div>
      </div>

      <p className="bay-caption">{into.grade.note}</p>

      {crew.run && (
        <section className="job-board">
          <div className="job-board-head">
            <h2>Now</h2>
            <span>{due ? "Docked" : rest ? "Pad" : etaLabel(crew.run.endsAt, now)}</span>
          </div>
          {rest ? (
            <p className="survey-empty">Rel and tanks every dock. Rest equals the last hop until they learn the pad. {etaLabel(crew.run.endsAt, now)} left.</p>
          ) : job ? (
            <article className="job-card">
              <span className="job-kind">
                {job.kind}
                <em>
                  {job.qty} u · {formatHaul(job)}
                </em>
              </span>
              <span className="job-title">{job.cargo}</span>
              <span className="job-route">
                {formatStop(job.from)} → {formatStop(job.to)}
              </span>
            </article>
          ) : (
            <p className="survey-empty">Idle.</p>
          )}
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
                  {row.pay <= 0 ? "Lost" : `${row.qty} u`} · ₡{row.pay.toLocaleString()}
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
        {crew.shipKey ? (
          <button type="button" className="engage ghost" onClick={onPark} disabled={crew.run?.phase === "flight"}>
            Park
          </button>
        ) : (
          <button type="button" className="engage" onClick={onAssign}>
            Assign
          </button>
        )}
        <button type="button" className="engage ghost" onClick={onDismiss}>
          Dismiss
        </button>
      </div>
    </div>
  );
}
