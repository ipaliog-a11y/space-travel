import { useState } from "react";
import { BOARD_JOBS, WATCH, type Telemetry } from "./telemetry";

type Props = {
  t: Telemetry;
  board: boolean;
  onBoard: () => void;
};

export function DispatchGlass({ t, board, onBoard }: Props) {
  const job = t.job;
  const [charge, setCharge] = useState<"idle" | "charging" | "blocked">("idle");

  function onJump() {
    if (charge === "charging") return;
    setCharge("charging");
    window.setTimeout(() => setCharge("blocked"), 900);
    window.setTimeout(() => setCharge("idle"), 2800);
  }

  return (
    <div className="hud hud-a">
      <div className="sys">
        System
        <strong>
          {t.system}
          {t.well ? ` · well ${t.well}` : " · free"}
        </strong>
      </div>
      <button type="button" className="board-btn" data-ui data-on={board} onClick={onBoard}>
        Board
      </button>

      <div className="cross" aria-hidden="true" />
      <div className="tag">
        <b>{t.lock}</b>
        <span>
          {t.dist} · {t.eta}
        </span>
      </div>

      <div className="wake">
        <WakeSvg throttle={t.throttle} t1={t.t1 / t.t1cap} t2={t.t2 / t.t2cap} heat={t.heat} />
        <div className="wake-read">
          <div>
            <em>T1</em>
            {t.t1}/{t.t1cap}
          </div>
          <div>
            <em>T2</em>
            {t.t2}/{t.t2cap}
          </div>
          <div>
            <em>Spd</em>
            {t.speed}
          </div>
          <div>
            <em>Hull</em>
            {100 - t.wear}%
          </div>
        </div>
      </div>

      {job && (
        <div className="job" data-ui>
          <div className="k">Hold · {job.qty}u</div>
          <div className="title">{job.cargo}</div>
          <div className="route">
            {job.from} → {job.to}
          </div>
          <div className="hold">
            <span>
              {job.hold}/{job.cap} u
            </span>
            <button
              type="button"
              className={`jump${charge !== "idle" ? " on" : ""}`}
              onClick={onJump}
            >
              {charge === "charging" ? "Charge" : charge === "blocked" ? "Align" : "Jump"}
            </button>
          </div>
        </div>
      )}

      {charge !== "idle" && (
        <div className={`charge-note${charge === "blocked" ? " blocked" : ""}`} data-ui>
          {charge === "charging"
            ? "FSD spooling"
            : "Heading off — line up Vesper to jump"}
          <i className={charge === "charging" ? "fill" : ""} />
        </div>
      )}

      {board && (
        <aside className="sheet" data-ui>
          <h3>Dispatch</h3>
          <ul className="tape">
            {BOARD_JOBS.map((j) => (
              <li key={j.cargo + j.to}>
                <b>
                  {j.qty}u {j.cargo}
                </b>
                <span>{j.pay}</span>
                <em>
                  {j.from} → {j.to}
                  {j.live ? " · loaded" : ""}
                </em>
              </li>
            ))}
          </ul>
          <h3>Watch</h3>
          <Sparkline />
          <ul className="tape">
            {WATCH.map((w) => (
              <li key={w.name}>
                <b>{w.name}</b>
                <span>
                  {w.val} {w.d}
                </span>
              </li>
            ))}
          </ul>
        </aside>
      )}
    </div>
  );
}

function WakeSvg({
  throttle,
  t1,
  t2,
  heat,
}: {
  throttle: number;
  t1: number;
  t2: number;
  heat: number;
}) {
  const w = 260;
  const y = 58;
  const arc = (r: number, a0: number, a1: number) => {
    const p = (a: number, rad: number) => {
      const x = 28 + rad + Math.cos(a) * rad;
      const yy = y - Math.sin(a) * rad * 0.55;
      return `${x.toFixed(1)},${yy.toFixed(1)}`;
    };
    return `M ${p(a0, r)} A ${r} ${r * 0.55} 0 0 1 ${p(a1, r)}`;
  };
  const tEnd = Math.PI * (0.12 + Math.max(0, throttle) * 0.76);
  return (
    <svg viewBox={`0 0 ${w} 72`} aria-hidden="true">
      <path d={arc(92, Math.PI, 0)} fill="none" stroke="rgba(216,208,192,0.22)" strokeWidth="1" />
      <path d={arc(92, Math.PI, Math.PI - tEnd)} fill="none" stroke="#c9b48a" strokeWidth="2" />
      <path d={arc(78, Math.PI, Math.PI - Math.PI * t1)} fill="none" stroke="#6fbfb6" strokeWidth="1.5" />
      <path d={arc(66, Math.PI, Math.PI - Math.PI * t2)} fill="none" stroke="#d8d0c0" strokeWidth="1.5" />
      {heat > 0.05 && (
        <path
          d={arc(104, Math.PI * 0.15, Math.PI * 0.15 + heat * 0.4)}
          fill="none"
          stroke="#c47a4a"
          strokeWidth="1"
        />
      )}
    </svg>
  );
}

function Sparkline() {
  const d = "M0 28 C 18 26, 28 12, 44 14 S 72 34, 90 22 S 130 8, 160 16 S 200 30, 240 18";
  return (
    <svg className="spark" viewBox="0 0 240 40" aria-hidden="true">
      <path d={d} fill="none" stroke="#6fbfb6" strokeWidth="1.2" />
    </svg>
  );
}
