type Props = {
  velOn: boolean;
  velNdcX: number;
  velNdcY: number;
  locked?: boolean;
};

/** One amber nose pip. Velocity tick only when path ≠ nose. */
export function HudSight({ velOn, velNdcX, velNdcY, locked }: Props) {
  const slip = Math.hypot(velNdcX, velNdcY);
  const showVel = velOn && slip > 0.08 && Math.abs(velNdcX) < 1.15 && Math.abs(velNdcY) < 1.15;
  const vx = 40 + velNdcX * 36;
  const vy = 40 - velNdcY * 36;
  return (
    <div className={`crosshair hud-sight${locked ? " locked" : ""}`} aria-hidden="true">
      <svg viewBox="0 0 80 80">
        <g className="sight-marks">
          <path d="M40 31 V36 M40 44 V49 M31 40 H36 M44 40 H49" />
          <rect x="39.2" y="39.2" width="1.6" height="1.6" />
        </g>
        {showVel && (
          <g className="vel-tick" transform={`translate(${vx} ${vy})`}>
            <path d="M0 -3.2 L2.4 0 L0 3.2 L-2.4 0 Z" />
          </g>
        )}
      </svg>
    </div>
  );
}
