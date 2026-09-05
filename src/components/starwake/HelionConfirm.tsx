import { useEffect } from "react";

type Props = {
  kicker?: string;
  title: string;
  body: string;
  confirmLabel: string;
  busy?: boolean;
  confirmDisabled?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export function HelionConfirm({
  kicker = "Confirm",
  title,
  body,
  confirmLabel,
  busy,
  confirmDisabled,
  onConfirm,
  onCancel,
}: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== "Escape") return;
      e.preventDefault();
      e.stopPropagation();
      if (!busy) onCancel();
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [busy, onCancel]);

  return (
    <div className="helion-confirm" role="dialog" aria-modal="true" aria-labelledby="helion-confirm-title">
      <div className="helion-confirm-card">
        <div className="k">{kicker}</div>
        <h2 id="helion-confirm-title">{title}</h2>
        <p className="lede">{body}</p>
        <div className="gate-acts">
          <button type="button" className="engage" disabled={busy || confirmDisabled} onClick={onConfirm}>
            {busy ? "Working…" : confirmLabel}
          </button>
          <button type="button" className="engage ghost" disabled={busy} onClick={onCancel}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
