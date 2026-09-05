import { coercePilotIconId, type PilotIconId } from "../player-profile/types.ts";
import {
  SHIPS,
  SHIP_ORDER,
  STOCK_LOADOUT,
  fullTanks,
  fullTanks2,
  sanitizeFuel,
  sanitizeFuel2,
  sanitizeLoadout,
} from "./catalog.ts";
import { sanitizeRetired } from "./job-log.ts";
import { emptyHolds, sanitizeCargo, type CargoHold } from "./market.ts";
import type { CargoJob, JobLogEntry, Loadout, Manifest, ShipId } from "./types.ts";
import { sanitizeCrew, type Crew } from "./fleet.ts";
import { sanitizeOutpost, type Outpost } from "./outpost.ts";

export const SAVE_SLOT_IDS = ["1", "2", "3"] as const;
export type SaveSlotId = (typeof SAVE_SLOT_IDS)[number];

export const SAVE_SLOT_NAMES: Record<SaveSlotId, string> = {
  "1": "Slot 1",
  "2": "Slot 2",
  "3": "Slot 3",
};

export type SlotCareer = {
  displayName: string;
  callSign: string;
  iconId: PilotIconId;
};

export type SaveSlotSnapshot = {
  name: string;
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
};

export type SlotLive = Omit<SaveSlotSnapshot, "name">;

const EMPTY_MANIFESTS: Record<ShipId, Manifest | null> = {
  courier: null,
  hauler: null,
  scout: null,
  clipper: null,
  tender: null,
  tug: null,
  extractor: null,
};

function stockLoadout(): Loadout {
  return {
    courier: { ...STOCK_LOADOUT.courier },
    hauler: { ...STOCK_LOADOUT.hauler },
    scout: { ...STOCK_LOADOUT.scout },
    clipper: { ...STOCK_LOADOUT.clipper },
    tender: { ...STOCK_LOADOUT.tender },
    tug: { ...STOCK_LOADOUT.tug },
    extractor: { ...STOCK_LOADOUT.extractor },
  };
}

export function isSaveSlotId(v: unknown): v is SaveSlotId {
  return v === "1" || v === "2" || v === "3";
}

export function sanitizeCareer(raw: unknown): SlotCareer | null {
  if (!raw || typeof raw !== "object") return null;
  const p = raw as Partial<SlotCareer>;
  const displayName = typeof p.displayName === "string" ? p.displayName.trim().slice(0, 100) : "";
  const callSign = typeof p.callSign === "string" ? p.callSign.trim().toUpperCase().slice(0, 20) : "";
  if (displayName.length < 1 || callSign.length < 3) return null;
  if (displayName === "Pilot" && callSign === "PILOT") return null;
  return { displayName, callSign, iconId: coercePilotIconId(p.iconId) };
}

export function slotIsEmpty(slot: SaveSlotSnapshot): boolean {
  return !slot.hasSave && !slot.career;
}

export function firstEmptySlotId(
  slots: Record<SaveSlotId, SaveSlotSnapshot>,
  prefer?: SaveSlotId,
): SaveSlotId | null {
  if (prefer && slotIsEmpty(slots[prefer])) return prefer;
  return SAVE_SLOT_IDS.find((id) => slotIsEmpty(slots[id])) ?? null;
}

export function firstOccupiedSlotId(
  slots: Record<SaveSlotId, SaveSlotSnapshot>,
  except?: SaveSlotId,
): SaveSlotId | null {
  return SAVE_SLOT_IDS.find((id) => id !== except && !slotIsEmpty(slots[id])) ?? null;
}

function sanitizeHolds(raw: unknown): Record<ShipId, CargoHold> {
  const out = emptyHolds() as Record<ShipId, CargoHold>;
  if (!raw || typeof raw !== "object") return out;
  const rec = raw as Partial<Record<ShipId, unknown>>;
  for (const hull of SHIP_ORDER) out[hull] = sanitizeCargo(rec[hull]);
  return out;
}

function sanitizeWarehouses(raw: unknown): Record<string, CargoHold> {
  if (!raw || typeof raw !== "object") return {};
  const out: Record<string, CargoHold> = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (!key.includes(":")) continue;
    const hold = sanitizeCargo(value);
    if (hold.length) out[key] = hold;
  }
  return out;
}

export function emptySlot(id: SaveSlotId, name = SAVE_SLOT_NAMES[id]): SaveSlotSnapshot {
  const loadout = stockLoadout();
  return {
    name,
    hasSave: false,
    lastSaveAt: 0,
    career: null,
    shipId: "courier",
    systemId: "helion",
    scanned: {},
    surveys: {},
    visited: {},
    visitedPlanets: {},
    loadout,
    fuel: fullTanks(loadout),
    fuel2: fullTanks2(loadout),
    board: [],
    boardStationId: null,
    manifests: { ...EMPTY_MANIFESTS },
    cargo: emptyHolds() as Record<ShipId, CargoHold>,
    warehouses: {},
    completed: 0,
    retiredJobs: [],
    jobLog: [],
    jobSeed: 0xc0de,
    ownedModules: [],
    boostCharges: SHIPS.courier.boostCapacity,
    crew: [],
    outpost: null,
  };
}

export function snapshotFromUnknown(raw: unknown, fallback: SaveSlotSnapshot): SaveSlotSnapshot {
  const p = raw && typeof raw === "object" ? (raw as Partial<SaveSlotSnapshot>) : {};
  const loadout = sanitizeLoadout(p.loadout ?? fallback.loadout);
  const shipId = p.shipId && SHIPS[p.shipId] ? p.shipId : fallback.shipId;
  const retired = sanitizeRetired(p.retiredJobs ?? fallback.retiredJobs);
  const name = typeof p.name === "string" && p.name.trim() ? p.name.trim().slice(0, 24) : fallback.name;
  const career = sanitizeCareer(p.career);
  const manifests = { ...EMPTY_MANIFESTS };
  if (p.manifests && typeof p.manifests === "object") {
    const rec = p.manifests as Partial<Record<ShipId, Manifest | null>>;
    for (const hull of SHIP_ORDER) {
      const m = rec[hull];
      if (m?.job?.id) manifests[hull] = m;
    }
  }
  return {
    name: career ? career.callSign.slice(0, 24) : name,
    hasSave: Boolean(
      p.hasSave ||
        career ||
        (p.scanned && Object.keys(p.scanned).length) ||
        (p.surveys && Object.keys(p.surveys).length),
    ),
    lastSaveAt: typeof p.lastSaveAt === "number" ? p.lastSaveAt : fallback.lastSaveAt,
    career,
    shipId,
    systemId: typeof p.systemId === "string" && p.systemId ? p.systemId : fallback.systemId,
    scanned: p.scanned ?? {},
    surveys: p.surveys ?? {},
    visited: p.visited ?? {},
    visitedPlanets: p.visitedPlanets ?? {},
    loadout,
    fuel: sanitizeFuel(p.fuel ?? fallback.fuel, loadout),
    fuel2: sanitizeFuel2(p.fuel2 ?? fallback.fuel2, loadout),
    board: Array.isArray(p.board) ? (p.board as CargoJob[]) : [],
    boardStationId: typeof p.boardStationId === "string" ? p.boardStationId : null,
    manifests,
    cargo: sanitizeHolds(p.cargo),
    warehouses: sanitizeWarehouses(p.warehouses),
    completed: typeof p.completed === "number" ? p.completed : 0,
    retiredJobs: retired,
    jobLog: Array.isArray(p.jobLog) ? (p.jobLog as JobLogEntry[]).slice(0, 40) : [],
    jobSeed: typeof p.jobSeed === "number" ? p.jobSeed : fallback.jobSeed,
    ownedModules: Array.isArray(p.ownedModules)
      ? p.ownedModules.filter((id): id is string => typeof id === "string")
      : [],
    boostCharges: typeof p.boostCharges === "number" ? p.boostCharges : SHIPS[shipId].boostCapacity,
    crew: sanitizeCrew(p.crew),
    outpost: sanitizeOutpost(p.outpost),
  };
}

export function migrateSlots(persisted: Record<string, unknown> | null | undefined): {
  activeSlotId: SaveSlotId;
  slots: Record<SaveSlotId, SaveSlotSnapshot>;
} {
  const p = persisted ?? {};
  const rawSlots = p.slots;
  if (rawSlots && typeof rawSlots === "object") {
    const rec = rawSlots as Partial<Record<SaveSlotId, unknown>>;
    const slots = {} as Record<SaveSlotId, SaveSlotSnapshot>;
    for (const id of SAVE_SLOT_IDS) {
      slots[id] = snapshotFromUnknown(rec[id], emptySlot(id));
    }
    const active = isSaveSlotId(p.activeSlotId) ? p.activeSlotId : "1";
    const occupied = firstOccupiedSlotId(slots);
    const activeSlotId = slotIsEmpty(slots[active]) && occupied ? occupied : active;
    return { activeSlotId, slots };
  }
  const legacy = snapshotFromUnknown(p, emptySlot("1"));
  return {
    activeSlotId: "1",
    slots: {
      "1": legacy,
      "2": emptySlot("2"),
      "3": emptySlot("3"),
    },
  };
}

export function liveFromSlot(slot: SaveSlotSnapshot): SlotLive {
  const { name: _name, ...live } = slot;
  return live;
}

export function slotFromLive(live: SlotLive, name: string): SaveSlotSnapshot {
  return { ...live, name };
}
