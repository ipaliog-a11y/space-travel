import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CargoJob, FlightMode, Loadout, Manifest, MapLayer, MenuView, ShipId, SlotId } from "./types";
import { SHIPS, STOCK_LOADOUT, fittedShip, fullTanks, moduleById, sanitizeFuel, sanitizeLoadout } from "./catalog";
import { atStop, jobFits, makeBoard, refillBoard, sanitizeBoard, sanitizeManifests } from "./jobs";

const SAVE_VERSION = 9;

export type StarwakeState = {
  version: number;
  entered: boolean;
  shipId: ShipId;
  systemId: string;
  lockedSystemId: string | null;
  mode: FlightMode;
  mapOpen: boolean;
  mapLayer: MapLayer;
  invertY: boolean;
  invertX: boolean;
  muted: boolean;
  gyro: boolean;
  showOrbits: boolean;
  charge01: number;
  boostCharges: number;
  scanned: Record<string, true>;
  surveys: Record<string, true>;
  visited: Record<string, true>;
  visitedPlanets: Record<string, { systemId: string; at: number }>;
  loadout: Loadout;
  fuel: Record<ShipId, number>;
  menuView: MenuView;
  board: CargoJob[];
  manifests: Record<ShipId, Manifest | null>;
  completed: number;
  jobSeed: number;
  hasSave: boolean;
  lastSaveAt: number;
  setEntered: (v: boolean) => void;
  setMenuView: (v: MenuView) => void;
  setShipId: (id: ShipId) => void;
  setSystemId: (id: string) => void;
  setLocked: (id: string | null) => void;
  setMode: (m: FlightMode) => void;
  setMapOpen: (v: boolean) => void;
  setMapLayer: (l: MapLayer) => void;
  toggleInvert: () => void;
  toggleInvertX: () => void;
  toggleMute: () => void;
  setGyro: (v: boolean) => void;
  toggleOrbits: () => void;
  setCharge01: (v: number) => void;
  spendBoost: () => boolean;
  refillBoosts: () => void;
  scanPlanet: (id: string) => void;
  logSurvey: (id: string) => void;
  visitSystem: (id: string) => void;
  visitPlanet: (systemId: string, planetId: string) => void;
  setModule: (slot: SlotId, id: string) => void;
  acceptJob: (id: string) => boolean;
  dropJob: () => void;
  loadCargo: (systemId: string, stationId: string) => boolean;
  deliverCargo: (systemId: string, stationId: string) => boolean;
  setFuel: (v: number) => void;
  refuel: () => void;
  markSave: () => void;
};

export const useStarwake = create<StarwakeState>()(
  persist(
    (set, get) => ({
      version: SAVE_VERSION,
      entered: false,
      shipId: "courier",
      systemId: "helion",
      lockedSystemId: null,
      mode: "docked",
      mapOpen: false,
      mapLayer: "system",
      invertY: false,
      invertX: false,
      muted: false,
      gyro: false,
      showOrbits: false,
      charge01: 0,
      boostCharges: SHIPS.courier.boostCapacity,
      scanned: {},
      surveys: {},
      visited: {},
      visitedPlanets: {},
      loadout: {
        courier: { ...STOCK_LOADOUT.courier },
        hauler: { ...STOCK_LOADOUT.hauler },
        scout: { ...STOCK_LOADOUT.scout },
        clipper: { ...STOCK_LOADOUT.clipper },
      },
      fuel: fullTanks(),
      menuView: "menu",
      board: makeBoard("helion", 0xc0de),
      manifests: { courier: null, hauler: null, scout: null, clipper: null },
      completed: 0,
      jobSeed: 0xc0de,
      hasSave: false,
      lastSaveAt: 0,
      setEntered: (v) => set({ entered: v, mode: v ? "local" : "docked", menuView: v ? get().menuView : "menu" }),
      setMenuView: (v) => set({ menuView: v }),
      setShipId: (id) => {
        if (get().mode === "charging" || get().mode === "hyperspace" || get().mode === "transit") return;
        set({ shipId: id, lockedSystemId: null, boostCharges: SHIPS[id].boostCapacity });
      },
      setSystemId: (id) => set({ systemId: id }),
      setLocked: (id) => set({ lockedSystemId: id }),
      setMode: (m) => set({ mode: m }),
      setMapOpen: (v) => set({ mapOpen: v }),
      setMapLayer: (l) => set({ mapLayer: l }),
      toggleInvert: () => set({ invertY: !get().invertY }),
      toggleInvertX: () => set({ invertX: !get().invertX }),
      toggleMute: () => set({ muted: !get().muted }),
      setGyro: (v) => set({ gyro: v }),
      toggleOrbits: () => set({ showOrbits: !get().showOrbits }),
      setCharge01: (v) => set({ charge01: v }),
      spendBoost: () => {
        const n = get().boostCharges;
        if (n <= 0) return false;
        set({ boostCharges: n - 1 });
        return true;
      },
      refillBoosts: () => set({ boostCharges: SHIPS[get().shipId].boostCapacity }),
      scanPlanet: (id) => {
        if (get().scanned[id]) return;
        set({
          scanned: { ...get().scanned, [id]: true },
          hasSave: true,
          lastSaveAt: Date.now(),
        });
      },
      logSurvey: (id) => {
        if (get().surveys[id]) return;
        set({
          surveys: { ...get().surveys, [id]: true },
          scanned: { ...get().scanned, [id]: true },
          hasSave: true,
          lastSaveAt: Date.now(),
        });
      },
      visitSystem: (id) => {
        if (get().visited[id]) return;
        set({
          visited: { ...get().visited, [id]: true },
          hasSave: true,
          lastSaveAt: Date.now(),
        });
      },
      visitPlanet: (systemId, planetId) => {
        if (get().visitedPlanets[planetId]) return;
        set({
          visitedPlanets: {
            ...get().visitedPlanets,
            [planetId]: { systemId, at: Date.now() },
          },
          hasSave: true,
          lastSaveAt: Date.now(),
        });
      },
      setModule: (slot, id) => {
        const st = get();
        const mod = moduleById(id);
        if (!mod || mod.slot !== slot || mod.hull !== st.shipId) return;
        const loadout = {
          ...st.loadout,
          [st.shipId]: { ...st.loadout[st.shipId], [slot]: id },
        };
        const cap = fittedShip(st.shipId, loadout).fuelCap;
        set({
          loadout,
          fuel: { ...st.fuel, [st.shipId]: Math.min(st.fuel[st.shipId], cap) },
          hasSave: true,
          lastSaveAt: Date.now(),
        });
      },
      acceptJob: (id) => {
        const st = get();
        const job = st.board.find((j) => j.id === id);
        if (!job) return false;
        if (!jobFits(job, st.shipId, st.loadout, st.manifests[st.shipId])) return false;
        set({
          board: st.board.filter((j) => j.id !== id),
          manifests: { ...st.manifests, [st.shipId]: { job, loaded: false } },
          hasSave: true,
          lastSaveAt: Date.now(),
        });
        return true;
      },
      dropJob: () => {
        const st = get();
        const man = st.manifests[st.shipId];
        if (!man || man.loaded) return;
        const seed = (st.jobSeed + 17) >>> 0;
        set({
          manifests: { ...st.manifests, [st.shipId]: null },
          board: refillBoard([...st.board, man.job], st.systemId, seed),
          jobSeed: seed,
        });
      },
      loadCargo: (systemId, stationId) => {
        const st = get();
        const man = st.manifests[st.shipId];
        if (!man || man.loaded) return false;
        if (!atStop(man.job.from, systemId, stationId)) return false;
        set({
          manifests: { ...st.manifests, [st.shipId]: { ...man, loaded: true } },
          hasSave: true,
          lastSaveAt: Date.now(),
        });
        return true;
      },
      deliverCargo: (systemId, stationId) => {
        const st = get();
        const man = st.manifests[st.shipId];
        if (!man?.loaded) return false;
        if (!atStop(man.job.to, systemId, stationId)) return false;
        const seed = (st.jobSeed + 31) >>> 0;
        set({
          manifests: { ...st.manifests, [st.shipId]: null },
          completed: st.completed + 1,
          board: refillBoard(st.board, st.systemId, seed),
          jobSeed: seed,
          hasSave: true,
          lastSaveAt: Date.now(),
        });
        return true;
      },
      setFuel: (v) => {
        const st = get();
        const cap = fittedShip(st.shipId, st.loadout).fuelCap;
        const next = Math.max(0, Math.min(cap, v));
        if (Math.abs(next - st.fuel[st.shipId]) < 0.02) return;
        set({ fuel: { ...st.fuel, [st.shipId]: next } });
      },
      refuel: () => {
        const st = get();
        const cap = fittedShip(st.shipId, st.loadout).fuelCap;
        set({
          fuel: { ...st.fuel, [st.shipId]: cap },
          hasSave: true,
          lastSaveAt: Date.now(),
        });
      },
      markSave: () => set({ hasSave: true, lastSaveAt: Date.now() }),
    }),
    {
      name: "starwake-v2",
      partialize: (s) => ({
        version: SAVE_VERSION,
        shipId: s.shipId,
        systemId: s.systemId,
        invertY: s.invertY,
        invertX: s.invertX,
        muted: s.muted,
        gyro: s.gyro,
        showOrbits: s.showOrbits,
        scanned: s.scanned,
        surveys: s.surveys,
        visited: s.visited,
        visitedPlanets: s.visitedPlanets,
        loadout: s.loadout,
        fuel: s.fuel,
        board: s.board,
        manifests: s.manifests,
        completed: s.completed,
        jobSeed: s.jobSeed,
        boostCharges: s.boostCharges,
        hasSave: s.hasSave,
        lastSaveAt: s.lastSaveAt,
      }),
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<StarwakeState>;
        const shipId = p.shipId && SHIPS[p.shipId] ? p.shipId : current.shipId;
        return {
          ...current,
          ...p,
          version: SAVE_VERSION,
          shipId,
          entered: false,
          menuView: "menu",
          mode: "docked",
          mapOpen: false,
          lockedSystemId: null,
          charge01: 0,
          scanned: p.scanned ?? {},
          surveys: p.surveys ?? {},
          visited: p.visited ?? {},
          visitedPlanets: p.visitedPlanets ?? {},
          loadout: sanitizeLoadout(p.loadout),
          fuel: sanitizeFuel(p.fuel, sanitizeLoadout(p.loadout)),
          board: sanitizeBoard(p.board, p.systemId ?? current.systemId),
          manifests: sanitizeManifests(p.manifests),
          completed: typeof p.completed === "number" ? p.completed : 0,
          jobSeed: typeof p.jobSeed === "number" ? p.jobSeed : current.jobSeed,
          invertX: Boolean(p.invertX),
          showOrbits: Boolean(p.showOrbits),
          boostCharges: typeof p.boostCharges === "number" ? p.boostCharges : SHIPS[shipId].boostCapacity,
          hasSave: Boolean(p.hasSave || (p.scanned && Object.keys(p.scanned).length) || (p.surveys && Object.keys(p.surveys).length)),
        };
      },
    },
  ),
);

export function getStarwake() {
  return useStarwake.getState();
}

export function currentShip() {
  const st = getStarwake();
  return fittedShip(st.shipId, st.loadout);
}