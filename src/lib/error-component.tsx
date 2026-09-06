import type { ErrorComponentProps } from "@tanstack/react-router";

export function AppErrorComponent({ error }: ErrorComponentProps) {
  return (
    <div className="gate hangar helion-dock" data-ui>
      <div className="k">Gate</div>
      <h1>Bay dropped</h1>
      <p className="lede">{error.message || "The bay dropped."}</p>
      <div className="gate-acts">
        <button type="button" className="engage" onClick={() => window.location.assign("/")}>
          Pad
        </button>
      </div>
    </div>
  );
}
