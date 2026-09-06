import { useEffect } from "react";
import { SHIPS } from "@/lib/starwake/catalog";
import { planetLog } from "@/lib/starwake/galaxy";
import { diaryEarnings, formatHaul, formatStop } from "@/lib/starwake/jobs";
import { useStarwake } from "@/lib/starwake/store";

type Props = { onBack: () => void };

function when(at: number) {
  if (!at) return "";
  return new Date(at).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function PilotDiary({ onBack }: Props) {
  const jobLog = useStarwake((s) => s.jobLog);
  const completed = useStarwake((s) => s.completed);
  const earned = diaryEarnings(jobLog);
  const visits = useStarwake((s) => s.visitedPlanets);
  const scanned = useStarwake((s) => s.scanned);
  const surveys = useStarwake((s) => s.surveys);
  const worlds = planetLog(visits, scanned, surveys);

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

  return (
    <div className="gate hangar tape-page helion-dock" data-ui>
      <header className="hangar-head">
        <div className="k">Pilot</div>
        <h1>Diary</h1>
        <p className="lede">
          {completed} haul{completed === 1 ? "" : "s"}
          {earned > 0 ? ` · ₡${earned.toLocaleString()} earned` : ""}
        </p>
      </header>

      <section className="job-board" aria-label="Job diary">
        <div className="job-board-head">
          <h2>Logged runs</h2>
          <span>Your packets and crew cuts. Newest first.</span>
        </div>
        {jobLog.length === 0 ? (
          <p className="survey-empty">Deliver a hub contract, or collect a crew cut, and it lands here.</p>
        ) : (
          <div className="job-grid">
            {jobLog.map((row) => (
              <article key={`${row.id}-${row.at}`} className="job-card">
                <span className="job-kind">
                  {SHIPS[row.shipId]?.name ?? row.kind}
                  <em>
                    {row.qty} u · ₡{row.pay.toLocaleString()}
                  </em>
                </span>
                <span className="job-title">{row.cargo}</span>
                <span className="job-route">
                  {formatStop(row.from)} → {formatStop(row.to)} · {formatHaul(row)}
                  {row.at ? ` · ${when(row.at)}` : ""}
                </span>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="job-board survey-log" aria-label="Worlds log">
        <div className="job-board-head">
          <h2>Worlds</h2>
          <span>Arrivals and scans. Same book as the flight log.</span>
        </div>
        {worlds.length === 0 ? (
          <p className="survey-empty">Empty. Arrive, then scan from the well.</p>
        ) : (
          <ul className="survey-list">
            {worlds.map((row) => (
              <li key={row.id}>
                <strong>{row.name}</strong>
                <span>{row.system}</span>
                <em>
                  {row.surveyed ? "survey" : row.scanned ? row.kindLabel : "visited"}
                </em>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="gate-acts">
        <button type="button" className="engage ghost" onClick={onBack}>
          Pilot
        </button>
      </div>
    </div>
  );
}
