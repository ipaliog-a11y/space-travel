import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CargoJob, FlightMode, JobLogEntry, Loadout, Manifest, MapLayer, MenuView, ShipId, SlotId } from "./types";
import { SHIPS, STOCK_LOADOUT, fittedShip, fullTanks, fullTanks2, liveShip, moduleById } from "./catalog";
import { getSystem, HOME_SYSTEM_ID, setOutpostHook } from "./galaxy";
import { hubBoard } from "./job-hub";
import {
  addCargo,
  cargoQty,
  emptyHolds,
  hubKey,
  pullCargo,
  type CargoHold,
  type GoodId,
} from "./market.ts";
import {
  atStop,
  holdUsed,
  jobContractKey,
  jobFits,
  jobIsRetired,
  jobPayout,
  logDelivery,
  makeBoard,
  refillBoard,
  retireContract,
  sanitizeBoard,
  sanitizeJobLog,
  sanitizeManifests,
  sanitizeRetired,
} from "./jobs";
import {
  SAVE_SLOT_IDS,
  SAVE_SLOT_NAMES,
  emptySlot,
  firstEmptySlotId,
  firstOccupiedSlotId,
  isSaveSlotId,
  liveFromSlot,
  migrateSlots,
  slotFromLive,
  type SaveSlotId,
  type SaveSlotSnapshot,
  type SlotCareer,
  type SlotLive,
} from "./saves";
import { dueCrews, dueRests, FLEET_CAP, sanitizeCrew, type Crew, type CrewHull } from "./fleet";
import { claimCrew, launchCrew, makeCrew, originFromSave } from "./fleet-run";
import { liveNotices, makeNotice, type Notice } from "./notices";
import { foundOutpost, crewYieldHub, padCap, type Outpost } from "./outpost";
import { crewYieldGood } from "./fleet-run";

export type { SaveSlotId, SaveSlotSnapshot, SlotCareer } from "./saves";

const SAVE_VERSION = 21;

function captureLive(s: {
  hasSave: boolean;
  lastSaveAt: number;
  career: SlotCareer | null;
  shipId: ShipId;
  systemId: string;
  scanned: Record<string, true>;
  surveys: Record<string, true>;
  visited: Record<string, true>;
  visitedPlanets: Record<string, { systemId: string; at: number }>;
  loadout: Loadout;
  fuel: Record<ShipId, number>;
  fuel2: Record<ShipId, number>;
  board: CargoJob[];
  boardStationId: string | null;
  manifests: Record<ShipId, Manifest | null>;
  cargo: Record<ShipId, CargoHold>;
  warehouses: Record<string, CargoHold>;
  completed: number;
  retiredJobs: string[];
  jobLog: JobLogEntry[];
  jobSeed: number;
  ownedModules: string[];
  boostCharges: number;
  crew: Crew[];
  outpost: Outpost | null;
}): SlotLive {
  return {
    hasSave: s.hasSave,
    lastSaveAt: s.lastSaveAt,
    career: s.career,
    shipId: s.shipId,
    systemId: s.systemId,
    scanned: s.scanned,
    surveys: s.surveys,
    visited: s.visited,
    visitedPlanets: s.visitedPlanets,
    loadout: s.loadout,
    fuel: s.fuel,
    fuel2: s.fuel2,
    board: s.board,
    boardStationId: s.boardStationId,
    manifests: s.manifests,
    cargo: s.cargo,
    warehouses: s.warehouses,
    completed: s.completed,
    retiredJobs: s.retiredJobs,
    jobLog: s.jobLog,
    jobSeed: s.jobSeed,
    ownedModules: s.ownedModules,
    boostCharges: s.boostCharges,
    crew: s.crew,
    outpost: s.outpost,
  };
}

function applyLive(live: SlotLive) {
  return { ...live };
}

export type StarwakeState = {
  version: number;
  hydrated: boolean;
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
  fuel2: Record<ShipId, number>;
  menuView: MenuView;
  board: CargoJob[];
  boardStationId: string | null;
  manifests: Record<ShipId, Manifest | null>;
  cargo: Record<ShipId, CargoHold>;
  warehouses: Record<string, CargoHold>;
  completed: number;
  retiredJobs: string[];
  jobLog: JobLogEntry[];
  jobSeed: number;
  wearPenalty: number;
  ownedModules: string[];
  hasSave: boolean;
  lastSaveAt: number;
  career: SlotCareer | null;
  crew: Crew[];
  notices: Notice[];
  outpost: Outpost | null;
  activeSlotId: SaveSlotId;
  slots: Record<SaveSlotId, SaveSlotSnapshot>;
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
  openHubBoard: (systemId: string, stationId: string) => void;
  refreshHubBoard: () => void;
  acceptJob: (id: string) => boolean;
  dropJob: () => void;
  jettisonHaul: () => void;
  topOffCrewHull: (hull: CrewHull) => void;
  loadCargo: (systemId: string, stationId: string) => boolean;
  deliverCargo: (systemId: string, stationId: string, paid?: number) => boolean;
  stowBuy: (goodId: GoodId, qty: number, paid?: number) => boolean;
  dumpSell: (goodId: GoodId, qty: number, paid?: number) => { qty: number; paid: number } | null;
  storeCargo: (goodId: GoodId, qty: number, systemId: string, stationId: string) => boolean;
  retrieveCargo: (goodId: GoodId, qty: number, systemId: string, stationId: string) => boolean;
  dumpPad: (goodId: GoodId, qty: number, systemId: string, stationId: string, paid?: number) => { qty: number; paid: number } | null;
  stowPad: (goodId: GoodId, qty: number, systemId: string, stationId: string, paid?: number) => void;
  storeHold: (systemId: string, stationId: string) => boolean;
  setWearPenalty: (v: number) => void;
  ownModule: (id: string) => void;
  setFuel: (v: number) => void;
  setFuel2: (v: number) => void;
  refuel: () => void;
  markSave: () => void;
  setActiveSlot: (id: SaveSlotId) => void;
  newSlot: (id: SaveSlotId) => void;
  copySlot: (from: SaveSlotId, to: SaveSlotId) => void;
  deleteSlot: (id: SaveSlotId) => void;
  renameSlot: (id: SaveSlotId, name: string) => void;
  setCareer: (career: SlotCareer) => void;
  beginNewCareer: () => SaveSlotId | null;
  seedCareerIfMissing: (career: SlotCareer) => void;
  deleteCareerSlot: (id: SaveSlotId) => SaveSlotId | null;
  hireCrew: (hull: CrewHull, shipKey: string, now?: number) => boolean;
  dismissCrew: (id: string) => void;
  dueCrews: (now?: number) => Crew[];
  launchDueCrews: (now?: number) => void;
  claimCrewRun: (id: string, paid: number, now?: number) => boolean;
  pushNotice: (n: { kicker: string; title: string; body: string }, ms?: number) => void;
  pruneNotices: (now?: number) => void;
  foundPlayerLock: () => boolean;
};

export const useStarwake = create<StarwakeState>()(
  persist(
    (set, get) => ({
      version: SAVE_VERSION,
      hydrated: false,
      entered: false,
      shipId: "courier",
      systemId: HOME_SYSTEM_ID,
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
        tender: { ...STOCK_LOADOUT.tender },
        tug: { ...STOCK_LOADOUT.tug },
        extractor: { ...STOCK_LOADOUT.extractor },
      },
      fuel: fullTanks(),
      fuel2: fullTanks2(),
      menuView: "menu",
      board: [],
      boardStationId: null,
      manifests: { courier: null, hauler: null, scout: null, clipper: null, tender: null, tug: null, extractor: null },
      cargo: emptyHolds() as Record<ShipId, CargoHold>,
      warehouses: {},
      completed: 0,
      retiredJobs: [],
      jobLog: [],
      jobSeed: 0xc0de,
      wearPenalty: 0,
      ownedModules: [],
      hasSave: false,
      lastSaveAt: 0,
      career: null,
      crew: [],
      notices: [],
      outpost: null,
      activeSlotId: "1",
      slots: {
        "1": emptySlot("1"),
        "2": emptySlot("2"),
        "3": emptySlot("3"),
      },
      setEntered: (v) =>
        set({
          entered: v,
          mode: v ? "local" : "docked",
          menuView: v ? get().menuView : "menu",
          systemId: v && !get().systemId ? HOME_SYSTEM_ID : get().systemId,
        }),
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
        const fit = fittedShip(st.shipId, loadout);
        set({
          loadout,
          fuel: { ...st.fuel, [st.shipId]: Math.min(st.fuel[st.shipId], fit.fuelCap) },
          fuel2: { ...st.fuel2, [st.shipId]: Math.min(st.fuel2[st.shipId] ?? fit.fuelCap2, fit.fuelCap2) },
          hasSave: true,
          lastSaveAt: Date.now(),
        });
      },
      openHubBoard: (systemId, stationId) => {
        const st = get();
        const seed = (st.jobSeed + 41) >>> 0;
        if (st.boardStationId === stationId) {
          const next = refillBoard(st.board, systemId, seed, stationId, st.retiredJobs);
          if (next.length === st.board.length && next.every((j, i) => j.id === st.board[i]?.id)) return;
          set({ board: next, jobSeed: seed });
          return;
        }
        set({
          board: makeBoard(systemId, seed, stationId, st.retiredJobs),
          boardStationId: stationId,
          jobSeed: seed,
        });
      },
      refreshHubBoard: () => {
        const st = get();
        if (!st.boardStationId) return;
        const seed = (st.jobSeed + 53) >>> 0;
        set({
          board: makeBoard(st.systemId, seed, st.boardStationId, st.retiredJobs),
          jobSeed: seed,
        });
      },
      acceptJob: (id) => {
        const st = get();
        const job = st.board.find((j) => j.id === id);
        if (!job) return false;
        if (st.retiredJobs.includes(id) || st.retiredJobs.includes(jobContractKey(job))) return false;
        if (st.boardStationId && !hubBoard([job], st.systemId, st.boardStationId).length) return false;
        if (!jobFits(job, st.shipId, st.loadout, st.manifests[st.shipId], st.cargo[st.shipId])) return false;
        const seed = (st.jobSeed + 13) >>> 0;
        const hubId = st.boardStationId ?? job.from.stationId;
        set({
          board: refillBoard(
            st.board.filter((j) => j.id !== id),
            job.from.systemId,
            seed,
            hubId,
            st.retiredJobs,
          ),
          boardStationId: hubId,
          jobSeed: seed,
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
        const hubId = st.boardStationId ?? man.job.from.stationId;
        set({
          manifests: { ...st.manifests, [st.shipId]: null },
          board: refillBoard([...st.board, man.job], man.job.from.systemId, seed, hubId, st.retiredJobs),
          boardStationId: hubId,
          jobSeed: seed,
        });
      },
      jettisonHaul: () => {
        const st = get();
        const man = st.manifests[st.shipId];
        const cargo = st.cargo[st.shipId] ?? [];
        if (!man && !cargo.length) return;
        const retired = man?.loaded ? retireContract(st.retiredJobs, man.job) : st.retiredJobs;
        set({
          manifests: { ...st.manifests, [st.shipId]: null },
          cargo: { ...st.cargo, [st.shipId]: [] },
          retiredJobs: retired,
          hasSave: true,
          lastSaveAt: Date.now(),
        });
      },
      topOffCrewHull: (hull) => {
        const st = get();
        if (st.shipId === hull) return;
        const def = fittedShip(hull, st.loadout);
        set({
          fuel: { ...st.fuel, [hull]: def.fuelCap },
          fuel2: { ...st.fuel2, [hull]: def.fuelCap2 },
          hasSave: true,
          lastSaveAt: Date.now(),
        });
      },
      loadCargo: (systemId, stationId) => {
        const st = get();
        const man = st.manifests[st.shipId];
        if (!man || man.loaded) return false;
        if (!atStop(man.job.from, systemId, stationId)) return false;
        const cap = fittedShip(st.shipId, st.loadout).cargoCap;
        if (man.job.qty + cargoQty(st.cargo[st.shipId]) > cap) return false;
        set({
          manifests: { ...st.manifests, [st.shipId]: { ...man, loaded: true } },
          hasSave: true,
          lastSaveAt: Date.now(),
        });
        return true;
      },
      deliverCargo: (systemId, stationId, paid) => {
        const st = get();
        const man = st.manifests[st.shipId];
        if (!man?.loaded) return false;
        if (!atStop(man.job.to, systemId, stationId)) return false;
        const seed = (st.jobSeed + 31) >>> 0;
        const retired = retireContract(st.retiredJobs, man.job);
        const pay = typeof paid === "number" && paid > 0 ? Math.round(paid) : jobPayout(man.job);
        set({
          manifests: { ...st.manifests, [st.shipId]: null },
          completed: st.completed + 1,
          retiredJobs: retired,
          jobLog: logDelivery(st.jobLog, man.job, pay, st.shipId),
          board: refillBoard([], systemId, seed, stationId, retired),
          boardStationId: stationId,
          jobSeed: seed,
          hasSave: true,
          lastSaveAt: Date.now(),
        });
        return true;
      },
      stowBuy: (goodId, qty, paid = 0) => {
        const st = get();
        const n = Math.max(0, Math.round(qty));
        if (n <= 0) return false;
        const cap = fittedShip(st.shipId, st.loadout).cargoCap;
        const used = holdUsed(st.manifests[st.shipId], st.cargo[st.shipId]);
        if (used + n > cap) return false;
        set({
          cargo: { ...st.cargo, [st.shipId]: addCargo(st.cargo[st.shipId] ?? [], goodId, n, paid) },
          hasSave: true,
          lastSaveAt: Date.now(),
        });
        return true;
      },
      dumpSell: (goodId, qty, paid) => {
        const st = get();
        const n = Math.max(0, Math.round(qty));
        if (n <= 0) return null;
        const pulled = pullCargo(st.cargo[st.shipId] ?? [], goodId, n, paid);
        if (!pulled) return null;
        set({
          cargo: { ...st.cargo, [st.shipId]: pulled.hold },
          hasSave: true,
          lastSaveAt: Date.now(),
        });
        return { qty: pulled.qty, paid: pulled.paid };
      },
      storeCargo: (goodId, qty, systemId, stationId) => {
        const st = get();
        const n = Math.max(0, Math.round(qty));
        if (n <= 0) return false;
        const fromShip = pullCargo(st.cargo[st.shipId] ?? [], goodId, n);
        if (!fromShip) return false;
        const key = hubKey(systemId, stationId);
        const cap = padCap(key, st.outpost);
        if (cap != null && cargoQty(st.warehouses[key] ?? []) + n > cap) return false;
        const ware = addCargo(st.warehouses[key] ?? [], goodId, n, fromShip.paid);
        set({
          cargo: { ...st.cargo, [st.shipId]: fromShip.hold },
          warehouses: { ...st.warehouses, [key]: ware },
          hasSave: true,
          lastSaveAt: Date.now(),
        });
        return true;
      },
      retrieveCargo: (goodId, qty, systemId, stationId) => {
        const st = get();
        const n = Math.max(0, Math.round(qty));
        if (n <= 0) return false;
        const cap = fittedShip(st.shipId, st.loadout).cargoCap;
        const used = holdUsed(st.manifests[st.shipId], st.cargo[st.shipId]);
        if (used + n > cap) return false;
        const key = hubKey(systemId, stationId);
        const fromWare = pullCargo(st.warehouses[key] ?? [], goodId, n);
        if (!fromWare) return false;
        const warehouses = { ...st.warehouses };
        if (fromWare.hold.length) warehouses[key] = fromWare.hold;
        else delete warehouses[key];
        set({
          cargo: { ...st.cargo, [st.shipId]: addCargo(st.cargo[st.shipId] ?? [], goodId, n, fromWare.paid) },
          warehouses,
          hasSave: true,
          lastSaveAt: Date.now(),
        });
        return true;
      },
      dumpPad: (goodId, qty, systemId, stationId, paid) => {
        const st = get();
        const n = Math.max(0, Math.round(qty));
        if (n <= 0) return null;
        const key = hubKey(systemId, stationId);
        const pulled = pullCargo(st.warehouses[key] ?? [], goodId, n, paid);
        if (!pulled) return null;
        const warehouses = { ...st.warehouses };
        if (pulled.hold.length) warehouses[key] = pulled.hold;
        else delete warehouses[key];
        set({
          warehouses,
          hasSave: true,
          lastSaveAt: Date.now(),
        });
        return { qty: pulled.qty, paid: pulled.paid };
      },
      stowPad: (goodId, qty, systemId, stationId, paid = 0) => {
        const n = Math.max(0, Math.round(qty));
        if (n <= 0) return;
        const key = hubKey(systemId, stationId);
        const st = get();
        set({
          warehouses: { ...st.warehouses, [key]: addCargo(st.warehouses[key] ?? [], goodId, n, paid) },
          hasSave: true,
          lastSaveAt: Date.now(),
        });
      },
      storeHold: (systemId, stationId) => {
        const st = get();
        const hold = st.cargo[st.shipId] ?? [];
        if (!hold.length) return false;
        let ok = false;
        for (const lot of [...hold]) {
          if (get().storeCargo(lot.goodId, lot.qty, systemId, stationId)) ok = true;
        }
        return ok;
      },
      setWearPenalty: (v) => {
        const next = Math.max(0, Math.min(0.25, v));
        if (Math.abs(get().wearPenalty - next) < 1e-6) return;
        set({ wearPenalty: next });
      },
      ownModule: (id) => {
        if (get().ownedModules.includes(id)) return;
        set({
          ownedModules: [...get().ownedModules, id],
          hasSave: true,
          lastSaveAt: Date.now(),
        });
      },
      setFuel: (v) => {
        const st = get();
        const cap = fittedShip(st.shipId, st.loadout).fuelCap;
        const next = Math.max(0, Math.min(cap, v));
        if (Math.abs(next - st.fuel[st.shipId]) < 0.02) return;
        set({ fuel: { ...st.fuel, [st.shipId]: next } });
      },
      setFuel2: (v) => {
        const st = get();
        const cap = fittedShip(st.shipId, st.loadout).fuelCap2;
        const next = Math.max(0, Math.min(cap, v));
        if (Math.abs(next - (st.fuel2[st.shipId] ?? 0)) < 0.02) return;
        set({ fuel2: { ...st.fuel2, [st.shipId]: next } });
      },
      refuel: () => {
        const st = get();
        const fit = fittedShip(st.shipId, st.loadout);
        set({
          fuel: { ...st.fuel, [st.shipId]: fit.fuelCap },
          fuel2: { ...st.fuel2, [st.shipId]: fit.fuelCap2 },
          hasSave: true,
          lastSaveAt: Date.now(),
        });
      },
      markSave: () => set({ hasSave: true, lastSaveAt: Date.now() }),
      setActiveSlot: (id) => {
        if (!isSaveSlotId(id)) return;
        const st = get();
        if (id === st.activeSlotId) return;
        const next = st.slots[id];
        if (!next.hasSave && !next.career) return;
        const parked = slotFromLive(captureLive(st), st.slots[st.activeSlotId].name);
        set({
          ...applyLive(liveFromSlot(next)),
          slots: { ...st.slots, [st.activeSlotId]: parked },
          activeSlotId: id,
          entered: false,
          menuView: "menu",
          mode: "docked",
          mapOpen: false,
          lockedSystemId: null,
          charge01: 0,
          wearPenalty: 0,
        });
      },
      newSlot: (id) => {
        if (!isSaveSlotId(id)) return;
        const st = get();
        const parked = slotFromLive(captureLive(st), st.slots[st.activeSlotId].name);
        const fresh = emptySlot(id, st.slots[id].name);
        const slots = { ...st.slots, [st.activeSlotId]: parked, [id]: fresh };
        set({
          ...applyLive(liveFromSlot(fresh)),
          slots,
          activeSlotId: id,
          entered: false,
          menuView: "menu",
          mode: "docked",
          mapOpen: false,
          lockedSystemId: null,
          charge01: 0,
          wearPenalty: 0,
        });
      },
      copySlot: (from, to) => {
        if (!isSaveSlotId(from) || !isSaveSlotId(to) || from === to) return;
        const st = get();
        const source =
          from === st.activeSlotId
            ? slotFromLive(captureLive(st), st.slots[from].name)
            : st.slots[from];
        const copy: SaveSlotSnapshot = {
          ...source,
          name: source.career?.callSign.slice(0, 24) ?? st.slots[to].name,
          lastSaveAt: Date.now(),
          hasSave: source.hasSave,
        };
        const slots = { ...st.slots, [to]: copy };
        if (from === st.activeSlotId) slots[from] = source;
        if (to === st.activeSlotId) {
          set({
            ...applyLive(liveFromSlot(copy)),
            slots,
          });
          return;
        }
        set({ slots });
      },
      deleteSlot: (id) => {
        if (!isSaveSlotId(id)) return;
        const st = get();
        const wiped = emptySlot(id, st.slots[id].name);
        const slots = { ...st.slots, [id]: wiped };
        if (id === st.activeSlotId) {
          set({
            ...applyLive(liveFromSlot(wiped)),
            slots,
            entered: false,
            menuView: "menu",
            mode: "docked",
            mapOpen: false,
            lockedSystemId: null,
            charge01: 0,
            wearPenalty: 0,
          });
          return;
        }
        set({ slots });
      },
      renameSlot: (id, name) => {
        if (!isSaveSlotId(id)) return;
        const trimmed = name.trim().slice(0, 24);
        if (!trimmed) return;
        const st = get();
        set({
          slots: {
            ...st.slots,
            [id]: { ...st.slots[id], name: trimmed },
          },
        });
      },
      setCareer: (career) => {
        const st = get();
        const name = career.callSign.slice(0, 24);
        const parked = slotFromLive({ ...captureLive(st), career, hasSave: true, lastSaveAt: Date.now() }, name);
        set({
          career,
          hasSave: true,
          lastSaveAt: parked.lastSaveAt,
          slots: { ...st.slots, [st.activeSlotId]: parked },
        });
      },
      beginNewCareer: () => {
        const st = get();
        const target = firstEmptySlotId(st.slots, st.activeSlotId);
        if (!target) return null;
        if (target === st.activeSlotId && !st.career && !st.hasSave) return target;
        const parked = slotFromLive(captureLive(st), st.slots[st.activeSlotId].name);
        const fresh = emptySlot(target);
        const slots = { ...st.slots, [st.activeSlotId]: parked, [target]: fresh };
        set({
          ...applyLive(liveFromSlot(fresh)),
          slots,
          activeSlotId: target,
          entered: false,
          menuView: "menu",
          mode: "docked",
          mapOpen: false,
          lockedSystemId: null,
          charge01: 0,
          wearPenalty: 0,
        });
        return target;
      },
      seedCareerIfMissing: (career) => {
        const st = get();
        const name = career.callSign.slice(0, 24);
        let next = st.slots;
        for (const id of SAVE_SLOT_IDS) {
          if (!st.slots[id].hasSave || st.slots[id].career) continue;
          if (next === st.slots) next = { ...st.slots };
          next[id] = { ...st.slots[id], career, name };
        }
        const liveCareer = st.career ?? next[st.activeSlotId].career ?? (st.hasSave ? career : null);
        if (next === st.slots && liveCareer === st.career) return;
        if (liveCareer && liveCareer !== st.career) {
          next = {
            ...next,
            [st.activeSlotId]: slotFromLive(
              { ...captureLive(st), career: liveCareer, hasSave: true },
              liveCareer.callSign.slice(0, 24),
            ),
          };
        }
        set({ career: liveCareer, hasSave: Boolean(liveCareer) || st.hasSave, slots: next });
      },
      deleteCareerSlot: (id) => {
        if (!isSaveSlotId(id)) return null;
        const st = get();
        const wiped = emptySlot(id, SAVE_SLOT_NAMES[id]);
        const slots = { ...st.slots, [id]: wiped };
        if (id !== st.activeSlotId) {
          set({ slots });
          return st.activeSlotId;
        }
        const nextId = firstOccupiedSlotId(slots, id) ?? firstEmptySlotId(slots) ?? "1";
        const next = slots[nextId];
        set({
          ...applyLive(liveFromSlot(next)),
          slots,
          activeSlotId: nextId,
          entered: false,
          menuView: "menu",
          mode: "docked",
          mapOpen: false,
          lockedSystemId: null,
          charge01: 0,
          wearPenalty: 0,
        });
        return nextId;
      },
      hireCrew: (hull, shipKey, now = Date.now()) => {
        const st = get();
        if (st.crew.length >= FLEET_CAP) return false;
        const key = shipKey.trim();
        if (!key) return false;
        if (st.crew.some((c) => c.shipKey === key)) return false;
        const taken = st.crew.map((c) => c.name);
        const from = originFromSave(st.systemId, st.boardStationId);
        const next = makeCrew(hull, now, from, taken, key);
        set({
          crew: [...st.crew, next],
          hasSave: true,
          lastSaveAt: now,
        });
        return true;
      },
      dismissCrew: (id) => {
        const st = get();
        if (!st.crew.some((c) => c.id === id)) return;
        set({
          crew: st.crew.filter((c) => c.id !== id),
          hasSave: true,
          lastSaveAt: Date.now(),
        });
      },
      dueCrews: (now = Date.now()) => dueCrews(get().crew, now),
      launchDueCrews: (now = Date.now()) => {
        const st = get();
        const due = dueRests(st.crew, now);
        if (!due.length) return;
        set({
          crew: st.crew.map((c) => (due.some((d) => d.id === c.id) ? launchCrew(c, now) : c)),
          hasSave: true,
          lastSaveAt: now,
        });
      },
      claimCrewRun: (id, paid, now = Date.now()) => {
        const st = get();
        const cur = st.crew.find((c) => c.id === id);
        if (!cur?.run || cur.run.phase !== "flight" || cur.run.claimed) return false;
        if (now < cur.run.endsAt) return false;
        const job = cur.run.job;
        let warehouses = st.warehouses;
        const pay = Math.max(0, paid);
        if (job?.kind === "extractor" && paid === 0) {
          const gid = crewYieldGood(job);
          if (gid) {
            const hub = crewYieldHub(job, st.outpost);
            let key = hubKey(hub.systemId, hub.stationId);
            let n = Math.max(1, Math.round(job.qty));
            const cap = padCap(key, st.outpost);
            const used = cargoQty(st.warehouses[key] ?? []);
            if (cap != null && used + n > cap) {
              const fit = Math.max(0, cap - used);
              if (fit > 0) {
                warehouses = { ...warehouses, [key]: addCargo(warehouses[key] ?? [], gid, fit, 0) };
                n -= fit;
              }
              key = hubKey(job.to.systemId, job.to.stationId);
            }
            if (n > 0) warehouses = { ...warehouses, [key]: addCargo(warehouses[key] ?? [], gid, n, 0) };
          }
        }
        const nextCrew = {
          ...claimCrew(cur, pay, now),
          log: job ? logDelivery(cur.log ?? [], job, pay, cur.hull, now) : cur.log,
          earned: (cur.earned ?? 0) + pay,
          completed: (cur.completed ?? 0) + 1,
        };
        set({
          crew: st.crew.map((c) => (c.id === id ? nextCrew : c)),
          warehouses,
          hasSave: true,
          lastSaveAt: now,
        });
        return true;
      },
      pushNotice: (n, ms) => {
        const next = liveNotices([...get().notices, makeNotice(n, Date.now(), ms)]);
        set({ notices: next });
      },
      pruneNotices: (now = Date.now()) => {
        const next = liveNotices(get().notices, now);
        if (next.length === get().notices.length) return;
        set({ notices: next });
      },
      foundPlayerLock: () => {
        const st = get();
        if (st.outpost) return false;
        const sys = getSystem(st.systemId);
        const next = foundOutpost(sys, st.career?.callSign ?? "Line");
        if (!next) return false;
        set({
          outpost: next,
          hasSave: true,
          lastSaveAt: Date.now(),
        });
        return true;
      },
    }),
    {
      name: "starwake-v2",
      partialize: (s) => {
        const parked = slotFromLive(captureLive(s), s.slots[s.activeSlotId].name);
        return {
          version: SAVE_VERSION,
          invertY: s.invertY,
          invertX: s.invertX,
          muted: s.muted,
          gyro: s.gyro,
          showOrbits: s.showOrbits,
          activeSlotId: s.activeSlotId,
          slots: { ...s.slots, [s.activeSlotId]: parked },
        };
      },
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Record<string, unknown>;
        const migrated = migrateSlots(p);
        const slots = {} as Record<SaveSlotId, SaveSlotSnapshot>;
        for (const id of SAVE_SLOT_IDS) {
          const slot = migrated.slots[id];
          const retired = sanitizeRetired(slot.retiredJobs);
          slots[id] = {
            ...slot,
            board: sanitizeBoard(slot.board, slot.systemId, slot.boardStationId ?? undefined).filter(
              (j) => !jobIsRetired(j, retired),
            ),
            manifests: sanitizeManifests(slot.manifests),
            jobLog: sanitizeJobLog(slot.jobLog),
            retiredJobs: retired,
            crew: sanitizeCrew(slot.crew),
            outpost: slot.outpost ?? null,
          };
        }
        const activeSlotId = migrated.activeSlotId;
        const live = liveFromSlot(slots[activeSlotId]);
        return {
          ...current,
          ...applyLive(live),
          version: SAVE_VERSION,
          activeSlotId,
          slots,
          invertY: Boolean(p.invertY ?? current.invertY),
          invertX: Boolean(p.invertX),
          muted: Boolean(p.muted),
          gyro: Boolean(p.gyro),
          showOrbits: Boolean(p.showOrbits),
          entered: false,
          menuView: "menu",
          mode: "docked",
          mapOpen: false,
          lockedSystemId: null,
          charge01: 0,
          wearPenalty: 0,
        };
      },
      onRehydrateStorage: () => (_state, _error) => {
        queueMicrotask(() => useStarwake.setState({ hydrated: true }));
      },
    },
  ),
);

if (useStarwake.persist.hasHydrated()) {
  useStarwake.setState({ hydrated: true });
}

export function getStarwake() {
  return useStarwake.getState();
}

setOutpostHook(() => useStarwake.getState().outpost);

export function currentShip() {
  const st = getStarwake();
  return liveShip(st.shipId, st.loadout, st.wearPenalty);
}