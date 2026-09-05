import { useState } from "react";
import type { Telemetry } from "./telemetry";

type Props = { t: Telemetry };

export function HelionCluster({ t }: Props) {
  const [tab, setTab] = useState<"ship" | "hold" | "jump">("hold");
  const t1 = t.t1 / t.t1cap;
  const t2 = t.t2 / t.t2cap;
  const hull = (100 - t.wear) / 100;
  const job = t.job;

  return (
    <div className="hud hud-b">
      <div className="sys-top">
        System
        <strong>{t.system}</strong>
      </div>
      <div className="speed">
        <strong>{t.speed}</strong>
        <span>spd · {t.well ? "well" : "free"}</span>
      </div>

      <div className="plate left">
        <div className="k">Lock</div>
        <div className="name">{t.lock}</div>
        <div className="meta">
          {t.dist} u · eta {t.eta}
        </div>
        <Radar heading={0.62} lock={0.22} />
      </div>

      <div className="plate right">
        <div className="k">{tab === "jump" ? "Fsd" : tab === "ship" ? "Hull" : "Own"}</div>
        <div className="name">{tab === "jump" ? "Jump" : "Hauler"}</div>
        <div className="meta">
          {tab === "jump"
            ? "Heading off · lock Vesper"
            : tab === "ship"
              ? `wear ${t.wear}% · boost ${t.boost}/${t.boostMax}`
              : job
                ? `${job.cargo} · ${job.qty}u`
                : "empty hold"}
        </div>
        {tab === "jump" ? (
          <div className="bars">
            <Bar label="T2" value={t2} teal />
            <Bar label="Head" value={0.34} warn />
            <Bar label="Lock" value={0.72} />
          </div>
        ) : tab === "ship" ? (
          <div className="bars">
            <Bar label="Hull" value={hull} warn={hull < 0.8} />
            <Bar label="Heat" value={t.heat} warn />
            <Bar label="Thr" value={Math.max(0, t.throttle)} />
            <Bar label="Bst" value={t.boost / t.boostMax} teal />
          </div>
        ) : (
          <div className="bars">
            <Bar label="T1" value={t1} teal />
            <Bar label="T2" value={t2} />
            <Bar label="Hull" value={hull} warn={hull < 0.8} />
            <Bar label="Thr" value={Math.max(0, t.throttle)} />
          </div>
        )}
        <div className="mfd" data-ui>
          <button type="button" data-on={tab === "ship"} onClick={() => setTab("ship")}>
            Ship
          </button>
          <button type="button" data-on={tab === "hold"} onClick={() => setTab("hold")}>
            Hold
          </button>
          <button type="button" data-on={tab === "jump"} onClick={() => setTab("jump")}>
            Jump
          </button>
        </div>
      </div>
    </div>
  );
}

function Bar({
  label,
  value,
  teal,
  warn,
}: {
  label: string;
  value: number;
  teal?: boolean;
  warn?: boolean;
}) {
  const pct = Math.max(0, Math.min(100, value * 100));
  return (
    <div className="bar">
      <span>{label}</span>
      <i>
        <b
          className={warn ? "warn" : teal ? "teal" : ""}
          style={{ ["--fill" as string]: `${pct}%` }}
        />
      </i>
      <span>{Math.round(pct)}</span>
    </div>
  );
}

function Radar({ heading, lock }: { heading: number; lock: number }) {
  const hx = 80 + Math.cos(heading * Math.PI * 2) * 48;
  const hy = 80 + Math.sin(heading * Math.PI * 2) * 48;
  const lx = 80 + Math.cos(lock * Math.PI * 2) * 36;
  const ly = 80 + Math.sin(lock * Math.PI * 2) * 36;
  return (
    <svg className="radar" viewBox="0 0 160 160" aria-hidden="true">
      <circle cx="80" cy="80" r="70" fill="none" stroke="rgba(216,208,192,0.2)" strokeWidth="1" />
      <circle cx="80" cy="80" r="46" fill="none" stroke="rgba(111,191,182,0.28)" strokeWidth="1" />
      <circle cx="80" cy="80" r="22" fill="none" stroke="rgba(216,208,192,0.18)" strokeWidth="1" />
      <line x1="80" y1="10" x2="80" y2="150" stroke="rgba(216,208,192,0.12)" />
      <line x1="10" y1="80" x2="150" y2="80" stroke="rgba(216,208,192,0.12)" />
      <g className="sweep">
        <path d="M80 80 L80 12 A68 68 0 0 1 128 36 Z" fill="rgba(111,191,182,0.12)" />
      </g>
      <circle cx={lx} cy={ly} r="3.2" fill="#6fbfb6" />
      <circle cx={hx} cy={hy} r="2.2" fill="#d8d0c0" />
      <polygon points="80,72 84,88 80,84 76,88" fill="#d8d0c0" />
    </svg>
  );
}
