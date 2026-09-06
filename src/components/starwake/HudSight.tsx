import { HEAT_RING, type SightId } from "@/lib/starwake/hud-sight";

type Props = {
  sight: SightId;
  heat01: number;
  overheated: boolean;
  overdrive: boolean;
  locked?: boolean;
};

export function HudSight({ sight, heat01, overheated, overdrive, locked }: Props) {
  const heat = Math.max(0, Math.min(1, heat01));
  const offset = HEAT_RING * (1 - heat);
  const cls = [
    "crosshair",
    "hud-sight",
    `sight-${sight}`,
    locked ? "locked" : "",
    overheated ? "hot" : "",
    overdrive ? "od" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={cls} aria-hidden="true">
      <svg viewBox="0 0 80 80">
        <circle className="sight-heat-bed" cx="40" cy="40" r="34" />
        <circle
          className="sight-heat"
          cx="40"
          cy="40"
          r="34"
          strokeDasharray={HEAT_RING}
          strokeDashoffset={offset}
          transform="rotate(-90 40 40)"
        />
        {sight === "pip" && (
          <g className="sight-marks">
            <path d="M40 28 V34 M40 46 V52 M28 40 H34 M46 40 H52" />
            <rect x="39.2" y="39.2" width="1.6" height="1.6" />
          </g>
        )}
        {sight === "ladder" && (
          <g className="sight-marks">
            <path d="M18 40 H30 M50 40 H62 M40 18 V28 M40 52 V62" />
            <path d="M22 34 H18 V46 H22 M58 34 H62 V46 H58" />
            <path d="M36 40 H38.4 M41.6 40 H44 M40 36 V38.4 M40 41.6 V44" />
            <circle cx="40" cy="40" r="1.1" />
          </g>
        )}
        {sight === "ring" && (
          <g className="sight-marks">
            <path d="M28 24 H24 V28 M52 24 H56 V28 M24 52 V56 H28 M52 56 H56 V52" />
            <path d="M34 28 L40 24 L46 28 M28 34 L24 40 L28 46 M34 52 L40 56 L46 52 M52 34 L56 40 L52 46" />
            <circle cx="40" cy="40" r="3.2" />
            <circle cx="40" cy="40" r="0.9" />
          </g>
        )}
      </svg>
    </div>
  );
}
