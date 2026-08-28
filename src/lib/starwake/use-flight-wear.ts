import { useEffect, useRef, useState } from "react";
import { loadHangar, recordFlightWear, type WearSnapshot } from "../hangar/api.ts";
import { WEAR_RATES } from "../ship-ownership/types.ts";
import type { FlightMode, ShipId } from "./types.ts";

const FLUSH_SEC = 5;

function flying(mode: FlightMode) {
  return (
    mode === "local" ||
    mode === "boosting" ||
    mode === "transit" ||
    mode === "charging" ||
    mode === "hyperspace" ||
    mode === "dropping"
  );
}

export type WearHud = WearSnapshot & { pendingPoints: number };

export function useFlightWear(shipId: ShipId, mode: FlightMode, boosting: boolean) {
  const [saved, setSaved] = useState<WearSnapshot | null>(null);
  const [pendingPoints, setPendingPoints] = useState(0);
  const shipRef = useRef(shipId);
  const modeRef = useRef(mode);
  const boostingRef = useRef(boosting);
  const cruiseSec = useRef(0);
  const boostSec = useRef(0);
  const jumps = useRef(0);
  const docks = useRef(0);
  const lastMode = useRef(mode);
  const lastTick = useRef(
    typeof performance !== "undefined" ? performance.now() : Date.now(),
  );
  const flushing = useRef(false);

  shipRef.current = shipId;
  modeRef.current = mode;
  boostingRef.current = boosting;

  function pendingNow() {
    return (
      (cruiseSec.current / 60) * WEAR_RATES.normal_flight +
      (boostSec.current / 60) * WEAR_RATES.boosting +
      jumps.current * WEAR_RATES.hyperspace +
      docks.current * WEAR_RATES.docking
    );
  }

  const flushRef = useRef(async () => {});
  flushRef.current = async () => {
    const cruiseMinutes = cruiseSec.current / 60;
    const boostMinutes = boostSec.current / 60;
    const jumpCount = jumps.current;
    const dockCount = docks.current;
    if (cruiseMinutes + boostMinutes + jumpCount + dockCount < 0.0005) return;
    if (flushing.current) return;
    flushing.current = true;
    cruiseSec.current = 0;
    boostSec.current = 0;
    jumps.current = 0;
    docks.current = 0;
    setPendingPoints(0);
    try {
      const next = await recordFlightWear({
        data: {
          shipType: shipRef.current,
          cruiseMinutes,
          boostMinutes,
          jumps: jumpCount,
          docks: dockCount,
        },
      });
      if (next) setSaved(next);
    } catch (err) {
      console.error("[wear] flush failed", err);
      cruiseSec.current += cruiseMinutes * 60;
      boostSec.current += boostMinutes * 60;
      jumps.current += jumpCount;
      docks.current += dockCount;
      setPendingPoints(pendingNow());
    } finally {
      flushing.current = false;
    }
  };

  useEffect(() => {
    loadHangar()
      .then(({ ships }) => {
        const ship = ships.find((s) => s.shipType === shipId) ?? ships[0];
        if (!ship) return;
        setSaved({
          shipId: ship.id,
          shipType: ship.shipType,
          wearPoints: ship.wearPoints,
          maxWearPool: ship.maxWearPool,
          wearPercentage: ship.wearPercentage,
          wearTier: ship.wearTier,
        });
      })
      .catch(() => undefined);
  }, [shipId]);

  useEffect(() => {
    const prev = lastMode.current;
    if (prev !== "hyperspace" && mode === "hyperspace") jumps.current += 1;
    if (prev !== "docking" && mode === "docking") docks.current += 1;
    lastMode.current = mode;
    setPendingPoints(pendingNow());
    if (mode === "berthed" || mode === "docked") void flushRef.current();
  }, [mode]);

  useEffect(() => {
    lastTick.current = performance.now();
    const id = window.setInterval(() => {
      const now = performance.now();
      const dt = (now - lastTick.current) / 1000;
      lastTick.current = now;
      if (flying(modeRef.current)) {
        if (boostingRef.current) boostSec.current += dt;
        else cruiseSec.current += dt;
      }
      setPendingPoints(pendingNow());
      if (cruiseSec.current + boostSec.current >= FLUSH_SEC) void flushRef.current();
    }, 250);

    const onHide = () => {
      if (document.visibilityState === "hidden") void flushRef.current();
    };
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("pagehide", onHide);

    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("pagehide", onHide);
      void flushRef.current();
    };
  }, []);

  function applyWear(next: WearSnapshot | null) {
    if (!next) return;
    cruiseSec.current = 0;
    boostSec.current = 0;
    jumps.current = 0;
    docks.current = 0;
    setPendingPoints(0);
    setSaved(next);
  }

  const wear: WearHud | null = saved
    ? {
        ...saved,
        wearPoints: saved.wearPoints + pendingPoints,
        wearPercentage: ((saved.wearPoints + pendingPoints) / saved.maxWearPool) * 100,
        pendingPoints,
      }
    : null;

  return { wear, applyWear };
}
