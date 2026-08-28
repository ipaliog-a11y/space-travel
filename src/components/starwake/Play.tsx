import { useEffect, useRef, useState } from "react";
import { createEngine, type EngineHandle } from "@/lib/starwake/engine";
import { useStarwake } from "@/lib/starwake/store";
import { claimStarterShip, loadHangar } from "@/lib/hangar/api";
import { FlightChrome } from "./FlightChrome";
import { Gate } from "./Gate";
import { Hangar } from "./Hangar";
import { MapPanel } from "./MapPanel";
import { PilotProfile } from "./PilotProfile";
import { ShipMarket } from "./ShipMarket";
import { isJumpMode, type ShipId } from "@/lib/starwake/types";

export function Play() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const tunnelRef = useRef<HTMLDivElement>(null);
  const vignetteRef = useRef<HTMLDivElement>(null);
  const flashRef = useRef<HTMLDivElement>(null);
  const [engine, setEngine] = useState<EngineHandle | null>(null);
  const [glError, setGlError] = useState<string | null>(null);
  const [ownedHulls, setOwnedHulls] = useState<ShipId[] | null>(null);

  useEffect(() => {
    loadHangar()
      .then(({ ships }) => {
        const types = [...new Set(ships.map((s) => s.shipType))] as ShipId[];
        setOwnedHulls(types);
        const current = useStarwake.getState().shipId;
        if (types.length > 0 && !types.includes(current)) {
          useStarwake.getState().setShipId(types[0]);
        }
      })
      .catch(() => setOwnedHulls([]));
  }, []);

  async function claimStarter() {
    const ship = await claimStarterShip({ data: { shipType: "courier" } });
    setOwnedHulls((prev) => [...new Set([...(prev ?? []), ship.shipType])]);
    useStarwake.getState().setShipId(ship.shipType);
  }

  const entered = useStarwake((s) => s.entered);
  const menuView = useStarwake((s) => s.menuView);
  const shipId = useStarwake((s) => s.shipId);
  const systemId = useStarwake((s) => s.systemId);
  const lockedId = useStarwake((s) => s.lockedSystemId);
  const mapOpen = useStarwake((s) => s.mapOpen);
  const mapLayer = useStarwake((s) => s.mapLayer);
  const muted = useStarwake((s) => s.muted);
  const mode = useStarwake((s) => s.mode);
  const charge01 = useStarwake((s) => s.charge01);
  const hasSave = useStarwake((s) => s.hasSave);

  useEffect(() => {
    const canvas = canvasRef.current;
    const tunnel = tunnelRef.current;
    const vignette = vignetteRef.current;
    const flash = flashRef.current;
    if (!canvas || !tunnel || !vignette || !flash) return;
    try {
      const eng = createEngine({ canvas, tunnel, vignette, flash });
      setEngine(eng);
      return () => eng.destroy();
    } catch (err) {
      setGlError(err instanceof Error ? err.message : "WebGL failed");
    }
  }, []);

  function engage() {
    if (ownedHulls !== null && ownedHulls.length === 0) return;
    engine?.unlockAudio();
    const st = useStarwake.getState();
    st.visitSystem(st.systemId);
    st.markSave();
    st.setEntered(true);
  }

  function startNew() {
    if (ownedHulls !== null && ownedHulls.length === 0) return;
    const st = useStarwake.getState();
    st.newSlot(st.activeSlotId);
    engage();
  }

  function cont() {
    engine?.unlockAudio();
    useStarwake.getState().setEntered(true);
  }

  useEffect(() => {
    const flush = () => {
      if (useStarwake.getState().entered) useStarwake.getState().markSave();
    };
    const onVis = () => {
      if (document.visibilityState === "hidden") flush();
    };
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("pagehide", flush);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("pagehide", flush);
    };
  }, []);

  return (
    <div className="play-root">
      <canvas ref={canvasRef} />
      <div
        className={`tunnel${mode === "transit" ? " cruise" : ""}${mode === "hyperspace" || mode === "charging" ? " fsd" : ""}`}
        ref={tunnelRef}
        aria-hidden="true"
      />
      <div className="vignette" ref={vignetteRef} />
      <div
        className={`flash${isJumpMode(mode) ? " warp" : ""}${mode === "hyperspace" || mode === "charging" ? " fsd" : ""}`}
        ref={flashRef}
      />

      {glError && (
        <div className="gate">
          <h1>Starwake</h1>
          <p className="lede">{glError}. Try Chrome or Firefox.</p>
        </div>
      )}

      {!entered && !glError && menuView === "menu" && (
        <Gate
          shipId={shipId}
          hasSave={hasSave}
          ownedHulls={ownedHulls}
          onClaimStarter={claimStarter}
          onPick={(id) => useStarwake.getState().setShipId(id)}
          onHangar={() => useStarwake.getState().setMenuView("hangar")}
          onProfile={() => useStarwake.getState().setMenuView("profile")}
          onMarket={() => useStarwake.getState().setMenuView("market")}
          onEngage={startNew}
          onContinue={cont}
        />
      )}

      {!entered && !glError && menuView === "hangar" && (
        <Hangar
          shipId={shipId}
          ownedHulls={ownedHulls}
          onClaimStarter={claimStarter}
          onPick={(id) => useStarwake.getState().setShipId(id)}
          onBack={() => useStarwake.getState().setMenuView("menu")}
          onProfile={() => useStarwake.getState().setMenuView("profile")}
          onMarket={() => useStarwake.getState().setMenuView("market")}
          onUndock={engage}
        />
      )}

      {!entered && !glError && menuView === "profile" && (
        <PilotProfile onBack={() => useStarwake.getState().setMenuView("menu")} />
      )}

      {!entered && !glError && menuView === "market" && (
        <ShipMarket
          onBack={() => useStarwake.getState().setMenuView("menu")}
          onOwned={(hulls, fly) => {
            setOwnedHulls(hulls);
            useStarwake.getState().setShipId(fly);
          }}
        />
      )}

      {entered && (
        <FlightChrome
          engine={engine}
          muted={muted}
          onMute={() => useStarwake.getState().toggleMute()}
          mapOpen={mapOpen}
          onMap={() => useStarwake.getState().setMapOpen(!mapOpen)}
          mode={mode}
          systemId={systemId}
          lockedId={lockedId}
          charge01={charge01}
          onJump={() => engine?.requestJump()}
        />
      )}

      {entered && mapOpen && (
        <MapPanel
          systemId={systemId}
          lockedId={lockedId}
          shipId={shipId}
          layer={mapLayer}
          jumping={isJumpMode(mode)}
          onLayer={(l) => useStarwake.getState().setMapLayer(l)}
          onLock={(id) => useStarwake.getState().setLocked(id)}
          onJump={() => engine?.requestJump()}
          onGoBody={(target) => engine?.goToBody(target)}
          onLookBody={(target, keepMap) => engine?.lookAtBody(target, keepMap)}
          onClose={() => useStarwake.getState().setMapOpen(false)}
        />
      )}
    </div>
  );
}
