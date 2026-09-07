import { useEffect } from "react";
import { planetLog } from "@/lib/starwake/galaxy";
import { diaryTape, stampWhen } from "@/lib/starwake/diary";
import { diaryEarnings, formatStop } from "@/lib/starwake/jobs";
import { useStarwake } from "@/lib/starwake/store";

type Props = { onBack: () => void };

export function PilotDiary({ onBack }: Props) {
  const jobLog = useStarwake((s) => s.jobLog);
  const completed = useStarwake((s) => s.completed);
  const earned = diaryEarnings(jobLog);
  const visits = useStarwake((s) => s.visitedPlanets);
  const scanned = useStarwake((s) => s.scanned);
  const surveys = useStarwake((s) => s.surveys);
  const tape = diaryTape(jobLog, planetLog(visits, scanned, surveys));

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
          {tape.length ? ` · ${tape.length} stamp${tape.length === 1 ? "" : "s"}` : ""}
        </p>
      </header>

      <section className="job-board diary-board" aria-label="Pilot tape">
        <div className="job-board-head">
          <h2>Tape</h2>
          <span>This save only. Hauls and worlds, newest first.</span>
        </div>
        {tape.length === 0 ? (
          <p className="survey-empty">No stamps. Deliver a packet, or arrive and scan a world.</p>
        ) : (
          <ol className="diary-tape">
            {tape.map((row) => (
              <li key={row.id} className={`diary-stamp ${row.kind}`}>
                <time dateTime={row.at ? new Date(row.at).toISOString() : undefined}>{stampWhen(row.at)}</time>
                <div className="diary-body">
                  <span className="diary-kicker">{row.kicker}</span>
                  <strong>{row.title}</strong>
                  <span className="diary-meta">
                    {row.kind === "haul" && row.from && row.to
                      ? `${formatStop(row.from)} → ${formatStop(row.to)} · ${row.meta}`
                      : row.meta}
                  </span>
                </div>
                {row.kind === "haul" && row.pay != null ? (
                  <span className="diary-pay">₡{row.pay.toLocaleString()}</span>
                ) : (
                  <span className="diary-pay mute" />
                )}
              </li>
            ))}
          </ol>
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
