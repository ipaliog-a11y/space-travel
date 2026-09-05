import { useEffect } from "react";
import { useStarwake } from "@/lib/starwake/store";

export function NoticeStack() {
  const notices = useStarwake((s) => s.notices);
  const pruneNotices = useStarwake((s) => s.pruneNotices);

  useEffect(() => {
    const id = window.setInterval(() => pruneNotices(), 250);
    return () => window.clearInterval(id);
  }, [pruneNotices]);

  if (!notices.length) return null;
  return (
    <div className="flight-notes" aria-live="polite">
      {notices.map((n) => (
        <article key={n.id} className="flight-note">
          <div className="k">{n.kicker}</div>
          <strong>{n.title}</strong>
          <p>{n.body}</p>
        </article>
      ))}
    </div>
  );
}
