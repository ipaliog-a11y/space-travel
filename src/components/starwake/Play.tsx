import { useEffect, useRef, useState } from "react";
import { createEngine, type EngineHandle } from "@/lib/starwake/engine";
import { HOME_SYSTEM_ID } from "@/lib/starwake/galaxy";
import { useStarwake } from "@/lib/starwake/store";
import { claimStarterShip, loadHangar } from "@/lib/hangar/api";
import { getMyProfile } from "@/lib/player-profile/api";
import { isProfileComplete } from "@/lib/player-profile/types";
import { STARTER_HULLS } from "@/lib/starwake/catalog";
import { firstEmptySlotId, firstOccupiedSlotId } from "@/lib/starwake/saves";
import { FlightChrome } from "./FlightChrome";
import { Gate } from "./Gate";
import { Hangar } from "./Hangar";
import { MapPanel } from "./MapPanel";
import { PilotProfile } from "./PilotProfile";
import { ShipMarket } from "./ShipMarket";
import { StarterPick } from "./StarterPick";
import { TapeWatch } from "./TapeWatch";
import { isJumpMode, type ShipId } from "@/lib/starwake/types";

export function Play() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const tunnelRef = useRef<HTMLDivElement>(null);
  const vignetteRef = useRef<HTMLDivElement>(null);
  const flashRef = useRef<HTMLDivElement>(null);
  const [engine, setEngine] = useState<EngineHandle | null>(null);
  const [glError, setGlError] = useState<string | null>(null);
  const [ownedHulls, setOwnedHulls] = useState<ShipId[] | null>(null);
  const [starterClaimed, setStarterClaimed] = useState(false);
  const hydrated = useStarwake((s) => s.hydrated);
  const career = useStarwake((s) => s.career);
  const slots = useStarwake((s) => s.slots);
  const activeSlotId = useStarwake((s) => s.activeSlotId);

  useEffect(() => {
    if (!hydrated) return;
    let cancelled = false;
    Promise.all([loadHangar(), getMyProfile()])
      .then(([{ ships }, profile]) => {
        if (cancelled) return;
        const types = [...new Set(ships.map((s) => s.shipType))] as ShipId[];
        setOwnedHulls(types);
        setStarterClaimed(Boolean(profile?.starterClaimed) || types.length > 0);
        const st = useStarwake.getState();
        if (profile && isProfileComplete(profile)) {
          st.seedCareerIfMissing({
            displayName: profile.displayName,
            callSign: profile.callSign,
            iconId: profile.iconId,
          });
        }
        const after = useStarwake.getState();
        if (!after.career) {
          const occupied = firstOccupiedSlotId(after.slots);
          if (occupied) after.setActiveSlot(occupied);
        }
        const current = useStarwake.getState().shipId;
        if (types.length > 0 && !types.includes(current)) {
          useStarwake.getState().setShipId(types[0]);
        }
      })
      .catch(() => {
        if (cancelled) return;
        setOwnedHulls([]);
        setStarterClaimed(false);
      });
    return () => {
      cancelled = true;
    };
  }, [hydrated]);

  async function claimStarter(shipType: ShipId = "courier") {
    const hull = STARTER_HULLS.includes(shipType) ? shipType : STARTER_HULLS[0];
    const ship = await claimStarterShip({ data: { shipType: hull } });
    setOwnedHulls((prev) => [...new Set([...(prev ?? []), ship.shipType])]);
    setStarterClaimed(true);
    engine?.unlockAudio();
    const st = useStarwake.getState();
    st.setShipId(ship.shipType);
    st.setSystemId(HOME_SYSTEM_ID);
    st.visitSystem(HOME_SYSTEM_ID);
    st.markSave();
    engine?.arrive(HOME_SYSTEM_ID);
    st.setEntered(true);
  }

  const needsProfile = hydrated && ownedHulls !== null && !career;
  const otherCareerId = firstOccupiedSlotId(slots, activeSlotId);
  const emptyBay = Boolean(career) && ownedHulls !== null && ownedHulls.length === 0;
  const needsStarter = emptyBay && !starterClaimed;
  const needsMarket = emptyBay && starterClaimed;
  const canFly = Boolean(career) && ownedHulls !== null && ownedHulls.length > 0;

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
    if (!canFly) return;
    engine?.unlockAudio();
    const st = useStarwake.getState();
    st.setSystemId(st.systemId || HOME_SYSTEM_ID);
    st.visitSystem(st.systemId);
    st.markSave();
    st.setEntered(true);
  }

  function cont() {
    if (!canFly) return;
    engine?.unlockAudio();
    useStarwake.getState().setEntered(true);
  }

  function createNewProfile() {
    const st = useStarwake.getState();
    if (!firstEmptySlotId(st.slots)) return;
    st.beginNewCareer();
    st.setMenuView("profile");
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

      {!entered && !glError && (!hydrated || ownedHulls === null) && (
        <div className="gate" data-ui>
          <h1>Starwake</h1>
          <p className="lede">Opening the bay…</p>
        </div>
      )}

      {!entered && !glError && needsProfile && (
        <PilotProfile
          required={!otherCareerId}
          onBack={() => {
            if (!otherCareerId) return;
            const st = useStarwake.getState();
            st.deleteCareerSlot(st.activeSlotId);
            st.setMenuView("profile");
          }}
          onSaved={() => {
            useStarwake.getState().setMenuView("menu");
          }}
        />
      )}

      {!entered && !glError && needsStarter && (
        <StarterPick
          shipId={shipId}
          onPick={(id) => useStarwake.getState().setShipId(id)}
          onClaim={claimStarter}
        />
      )}

      {!entered && !glError && needsMarket && menuView !== "market" && (
        <div className="gate" data-ui>
          <h1>Starwake</h1>
          <p className="lede">No hull in the bay. The free starter is spent. Buy one on Market.</p>
          <div className="gate-acts">
            <button type="button" className="engage" onClick={() => useStarwake.getState().setMenuView("market")}>
              Market
            </button>
          </div>
        </div>
      )}

      {!entered && !glError && canFly && menuView === "menu" && (
        <Gate
          shipId={shipId}
          hasSave={hasSave}
          ownedHulls={ownedHulls}
          onPick={(id) => useStarwake.getState().setShipId(id)}
          onHangar={() => useStarwake.getState().setMenuView("hangar")}
          onProfile={() => useStarwake.getState().setMenuView("profile")}
          onMarket={() => useStarwake.getState().setMenuView("market")}
          onWatch={() => useStarwake.getState().setMenuView("watch")}
          onEngage={engage}
          onContinue={cont}
        />
      )}

      {!entered && !glError && canFly && menuView === "hangar" && (
        <Hangar
          shipId={shipId}
          ownedHulls={ownedHulls}
          onPick={(id) => useStarwake.getState().setShipId(id)}
          onBack={() => useStarwake.getState().setMenuView("menu")}
          onProfile={() => useStarwake.getState().setMenuView("profile")}
          onMarket={() => useStarwake.getState().setMenuView("market")}
          onWatch={() => useStarwake.getState().setMenuView("watch")}
          onUndock={engage}
        />
      )}

      {!entered && !glError && canFly && menuView === "profile" && (
        <PilotProfile
          onBack={() => useStarwake.getState().setMenuView("menu")}
          onCreateNew={createNewProfile}
        />
      )}

      {!entered && !glError && (canFly || needsMarket) && menuView === "market" && (
        <ShipMarket
          onBack={() => useStarwake.getState().setMenuView("menu")}
          onOwned={(hulls, fly) => {
            setOwnedHulls(hulls);
            useStarwake.getState().setShipId(fly);
          }}
        />
      )}

      {!entered && !glError && canFly && menuView === "watch" && (
        <TapeWatch onBack={() => useStarwake.getState().setMenuView("menu")} />
      )}

      {entered && canFly && (
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

      {entered && canFly && mapOpen && (
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
