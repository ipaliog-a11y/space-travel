import type { Loadout, ModuleDef, ShipDef, ShipId, ShipLoadout, SlotId, StatKey } from "./types";

export const SHIPS: Record<ShipId, ShipDef> = {
  courier: {
    id: "courier",
    name: "Courier",
    role: "Packet",
    blurb: "Light frame. Snaps onto a heading. Short legs.",
    detail: "Lock-to-lock runner. Thin hold for sealed cores and film. The hangar default.",
    mass: 0.7,
    turnRate: 1.35,
    cruiseSpeed: 6.4,
    overdriveSpeed: 54,
    overdriveSec: 10,
    boostCapacity: 5,
    boostSec: 10,
    fsdChargeSec: 1.4,
    jumpRangeLy: 12,
    cargoCap: 8,
    coolSec: 8,
    fuelCap: 100,
    surveySec: 4.4,
    accent: "#d7dde4",
    audioPitch: 1.08,
  },
  hauler: {
    id: "hauler",
    name: "Hauler",
    role: "Bulk",
    blurb: "Mass first. Slow to spool. Reaches farther.",
    detail: "Ore, ice, grain. The brick that fills a lock. Long FSD, lazy stick.",
    mass: 1.7,
    turnRate: 0.65,
    cruiseSpeed: 4.2,
    overdriveSpeed: 38,
    overdriveSec: 10,
    boostCapacity: 5,
    boostSec: 10,
    fsdChargeSec: 3.2,
    jumpRangeLy: 18,
    cargoCap: 48,
    coolSec: 9,
    fuelCap: 120,
    surveySec: 6.4,
    accent: "#b7c0c8",
    audioPitch: 0.9,
  },
  scout: {
    id: "scout",
    name: "Scout",
    role: "Pathfinder",
    blurb: "Long eye. Sample drawer. Built to log wild worlds.",
    detail: "High-gain boom and a cold FSD. Longest legs in the bay. Hold is a drawer, not a warehouse. Surveys fast from a well.",
    mass: 0.82,
    turnRate: 1.08,
    cruiseSpeed: 5.6,
    overdriveSpeed: 44,
    overdriveSec: 11,
    boostCapacity: 6,
    boostSec: 9,
    fsdChargeSec: 1.15,
    jumpRangeLy: 22,
    cargoCap: 6,
    coolSec: 7,
    fuelCap: 88,
    surveySec: 3.1,
    accent: "#d2d8d0",
    audioPitch: 1.16,
  },
  clipper: {
    id: "clipper",
    name: "Clipper",
    role: "Runner",
    blurb: "In-system sprint. Hot drive. Short FSD.",
    detail: "Delta hull for planet hops and dock work. Points like a blade, burns like a flare. Packets only; you will chain jumps.",
    mass: 0.95,
    turnRate: 1.48,
    cruiseSpeed: 7.8,
    overdriveSpeed: 66,
    overdriveSec: 7,
    boostCapacity: 4,
    boostSec: 8,
    fsdChargeSec: 1.0,
    jumpRangeLy: 9,
    cargoCap: 10,
    coolSec: 6,
    fuelCap: 72,
    surveySec: 4.6,
    accent: "#d8d2c8",
    audioPitch: 1.22,
  },
};

export const SHIP_ORDER: ShipId[] = ["courier", "hauler", "scout", "clipper"];
export const SLOTS: SlotId[] = ["thruster", "drive", "fsd", "hold", "tank", "hx"];
export const SLOT_LABEL: Record<SlotId, string> = {
  thruster: "Thrusters",
  drive: "Drive",
  fsd: "FSD",
  hold: "Hold",
  tank: "Tank",
  hx: "Heat",
};
export const SLOT_TAB: Record<SlotId, string> = {
  thruster: "RCS",
  drive: "Drive",
  fsd: "FSD",
  hold: "Hold",
  tank: "Tank",
  hx: "HX",
};

/** Type-1 (planetary) fuel. Stock courier tank covers ~2 systems of planet hops. Type-2 FSD fuel comes later. */
export const T1_RANGE = 33600;
export const T1_PER_DIST = SHIPS.courier.fuelCap / T1_RANGE;

export const MODULES: Record<string, ModuleDef> = {
  "c-thr-stock": { id: "c-thr-stock", slot: "thruster", hull: "courier", name: "Gimbal Mk I", blurb: "Stock RCS. Snaps clean.", stock: true, delta: {} },
  "c-thr-snap": { id: "c-thr-snap", slot: "thruster", hull: "courier", name: "RCS Snap", blurb: "Harder bite. Heavier ring.", delta: { turnRate: 0.5, mass: 0.08 } },
  "c-thr-hold": { id: "c-thr-hold", slot: "thruster", hull: "courier", name: "Hold Steady", blurb: "Softer stick. Less mass.", delta: { turnRate: -0.28, mass: -0.05 } },
  "c-drv-stock": { id: "c-drv-stock", slot: "drive", hull: "courier", name: "Light Pulse", blurb: "Stock cruise / overdrive.", stock: true, delta: {} },
  "c-drv-sprint": { id: "c-drv-sprint", slot: "drive", hull: "courier", name: "Sprint Coil", blurb: "Hot OD. Shorter cruise.", delta: { cruiseSpeed: -1.2, overdriveSpeed: 18, overdriveSec: -4, mass: 0.1 } },
  "c-drv-cruise": { id: "c-drv-cruise", slot: "drive", hull: "courier", name: "Cruise Tube", blurb: "Longer band. Softer OD.", delta: { cruiseSpeed: 1.6, overdriveSpeed: -12, overdriveSec: 4 } },
  "c-fsd-stock": { id: "c-fsd-stock", slot: "fsd", hull: "courier", name: "Short Spool", blurb: "Fast lock. Short legs.", stock: true, delta: {} },
  "c-fsd-far": { id: "c-fsd-far", slot: "fsd", hull: "courier", name: "Farleg", blurb: "Further. Slower to charge.", delta: { jumpRangeLy: 4, fsdChargeSec: 1.0 } },
  "c-fsd-quick": { id: "c-fsd-quick", slot: "fsd", hull: "courier", name: "Quicklock", blurb: "Snaps. Shorter range.", delta: { jumpRangeLy: -4, fsdChargeSec: -0.55 } },
  "c-hld-stock": { id: "c-hld-stock", slot: "hold", hull: "courier", name: "Pouch", blurb: "Sealed bay. Samples and data.", stock: true, delta: {} },
  "c-hld-rack": { id: "c-hld-rack", slot: "hold", hull: "courier", name: "Sample Rack", blurb: "More volume. Heavier stick.", delta: { cargoCap: 6, mass: 0.06, turnRate: -0.08 } },
  "c-hld-seal": { id: "c-hld-seal", slot: "hold", hull: "courier", name: "Sealed Bay", blurb: "Small. Light. Courier-grade.", delta: { cargoCap: -4, mass: -0.04 } },
  "c-tnk-stock": { id: "c-tnk-stock", slot: "tank", hull: "courier", name: "Cell A", blurb: "Stock T1. Two systems of hops.", stock: true, delta: {} },
  "c-tnk-long": { id: "c-tnk-long", slot: "tank", hull: "courier", name: "Long Cell", blurb: "More T1. Heavier cell.", delta: { fuelCap: 40, mass: 0.08 } },
  "c-tnk-light": { id: "c-tnk-light", slot: "tank", hull: "courier", name: "Light Cell", blurb: "Less range. Lighter frame.", delta: { fuelCap: -30, mass: -0.05 } },
  "c-hx-stock": { id: "c-hx-stock", slot: "hx", hull: "courier", name: "Radiator", blurb: "Stock sink. Holds the last quarter.", stock: true, delta: {} },
  "c-hx-cold": { id: "c-hx-cold", slot: "hx", hull: "courier", name: "Cold Sink", blurb: "Longer OD. Heavier core.", delta: { overdriveSec: 4, coolSec: -2, mass: 0.06 } },
  "c-hx-vent": { id: "c-hx-vent", slot: "hx", hull: "courier", name: "Thin Fin", blurb: "Dumps fast. Runs hotter.", delta: { overdriveSec: -3, coolSec: -3, mass: -0.03 } },
  "h-thr-stock": { id: "h-thr-stock", slot: "thruster", hull: "hauler", name: "Tug Array", blurb: "Stock mass gimbals.", stock: true, delta: {} },
  "h-thr-dock": { id: "h-thr-dock", slot: "thruster", hull: "hauler", name: "Dock Assist", blurb: "Turns the brick. Costs mass.", delta: { turnRate: 0.3, mass: 0.12 } },
  "h-thr-bulk": { id: "h-thr-bulk", slot: "thruster", hull: "hauler", name: "Bulk Gimbal", blurb: "Lazier. Lighter ring.", delta: { turnRate: -0.12, mass: -0.08 } },
  "h-drv-stock": { id: "h-drv-stock", slot: "drive", hull: "hauler", name: "Mass Pulse", blurb: "Stock haul drive.", stock: true, delta: {} },
  "h-drv-haul": { id: "h-drv-haul", slot: "drive", hull: "hauler", name: "Deep Haul", blurb: "More cruise. Tamer OD.", delta: { cruiseSpeed: 0.8, overdriveSpeed: -6, overdriveSec: 3 } },
  "h-drv-kick": { id: "h-drv-kick", slot: "drive", hull: "hauler", name: "Kick Coil", blurb: "Punchier OD. Less cruise.", delta: { cruiseSpeed: -0.8, overdriveSpeed: 10, overdriveSec: -3, mass: 0.08 } },
  "h-fsd-stock": { id: "h-fsd-stock", slot: "fsd", hull: "hauler", name: "Long Spool", blurb: "Stock long legs.", stock: true, delta: {} },
  "h-fsd-deep": { id: "h-fsd-deep", slot: "fsd", hull: "hauler", name: "Deep FSD", blurb: "Far. Slow to wake.", delta: { jumpRangeLy: 8, fsdChargeSec: 1.6 } },
  "h-fsd-port": { id: "h-fsd-port", slot: "fsd", hull: "hauler", name: "Port Spool", blurb: "Faster lock. Shorter hop.", delta: { jumpRangeLy: -4, fsdChargeSec: -1.1 } },
  "h-hld-stock": { id: "h-hld-stock", slot: "hold", hull: "hauler", name: "Hold A", blurb: "Open bay. Bulk first.", stock: true, delta: {} },
  "h-hld-deep": { id: "h-hld-deep", slot: "hold", hull: "hauler", name: "Deep Hold", blurb: "Fat bay. Costs turn and cruise.", delta: { cargoCap: 24, mass: 0.2, turnRate: -0.1, cruiseSpeed: -0.4 } },
  "h-hld-light": { id: "h-hld-light", slot: "hold", hull: "hauler", name: "Light Rack", blurb: "Less volume. The brick turns.", delta: { cargoCap: -16, mass: -0.1, turnRate: 0.06 } },
  "h-tnk-stock": { id: "h-tnk-stock", slot: "tank", hull: "hauler", name: "Tank A", blurb: "Stock T1. Two systems, plus slack.", stock: true, delta: {} },
  "h-tnk-deep": { id: "h-tnk-deep", slot: "tank", hull: "hauler", name: "Deep Cell", blurb: "Fat tank. Costs mass.", delta: { fuelCap: 50, mass: 0.16 } },
  "h-tnk-light": { id: "h-tnk-light", slot: "tank", hull: "hauler", name: "Drop Tank", blurb: "Lighter. Shorter legs.", delta: { fuelCap: -40, mass: -0.1 } },
  "h-hx-stock": { id: "h-hx-stock", slot: "hx", hull: "hauler", name: "Mass Rad", blurb: "Stock brick sink.", stock: true, delta: {} },
  "h-hx-deep": { id: "h-hx-deep", slot: "hx", hull: "hauler", name: "Deep Sink", blurb: "Fat thermal mass. Slow to dump.", delta: { overdriveSec: 6, coolSec: 2, mass: 0.14 } },
  "h-hx-vent": { id: "h-hx-vent", slot: "hx", hull: "hauler", name: "Vent Array", blurb: "Bleeds heat. Shorter OD.", delta: { overdriveSec: -2, coolSec: -4 } },
  "s-thr-stock": { id: "s-thr-stock", slot: "thruster", hull: "scout", name: "Fine Ring", blurb: "Stock survey gimbals.", stock: true, delta: {} },
  "s-thr-snap": { id: "s-thr-snap", slot: "thruster", hull: "scout", name: "Dish Gimbal", blurb: "Harder bite. Heavier ring.", delta: { turnRate: 0.32, mass: 0.06 } },
  "s-thr-hold": { id: "s-thr-hold", slot: "thruster", hull: "scout", name: "Soft Stick", blurb: "Quieter. Less mass.", delta: { turnRate: -0.18, mass: -0.04 } },
  "s-drv-stock": { id: "s-drv-stock", slot: "drive", hull: "scout", name: "Quiet Pulse", blurb: "Stock long-cruise drive.", stock: true, delta: {} },
  "s-drv-sprint": { id: "s-drv-sprint", slot: "drive", hull: "scout", name: "Skip Coil", blurb: "Hot OD. Shorter cruise.", delta: { cruiseSpeed: -0.8, overdriveSpeed: 10, overdriveSec: -3, mass: 0.06 } },
  "s-drv-cruise": { id: "s-drv-cruise", slot: "drive", hull: "scout", name: "Long Tube", blurb: "Softer OD. Longer band.", delta: { cruiseSpeed: 1.2, overdriveSpeed: -8, overdriveSec: 3 } },
  "s-fsd-stock": { id: "s-fsd-stock", slot: "fsd", hull: "scout", name: "Long Eye", blurb: "Stock far lock.", stock: true, delta: {} },
  "s-fsd-deep": { id: "s-fsd-deep", slot: "fsd", hull: "scout", name: "Far Eye", blurb: "Further. Slower to wake.", delta: { jumpRangeLy: 6, fsdChargeSec: 1.1 } },
  "s-fsd-port": { id: "s-fsd-port", slot: "fsd", hull: "scout", name: "Near Eye", blurb: "Faster lock. Shorter hop.", delta: { jumpRangeLy: -6, fsdChargeSec: -0.4 } },
  "s-hld-stock": { id: "s-hld-stock", slot: "hold", hull: "scout", name: "Drawer", blurb: "Sample tube. Nothing bulk.", stock: true, delta: {} },
  "s-hld-rack": { id: "s-hld-rack", slot: "hold", hull: "scout", name: "Sample Rack", blurb: "More volume. Heavier stick.", delta: { cargoCap: 4, mass: 0.05, turnRate: -0.06 } },
  "s-hld-seal": { id: "s-hld-seal", slot: "hold", hull: "scout", name: "Empty Tube", blurb: "Lighter. Almost no hold.", delta: { cargoCap: -2, mass: -0.03 } },
  "s-tnk-stock": { id: "s-tnk-stock", slot: "tank", hull: "scout", name: "Cell A", blurb: "Stock T1. Sips on hops.", stock: true, delta: {} },
  "s-tnk-long": { id: "s-tnk-long", slot: "tank", hull: "scout", name: "Long Cell", blurb: "More T1. Heavier cell.", delta: { fuelCap: 32, mass: 0.07 } },
  "s-tnk-light": { id: "s-tnk-light", slot: "tank", hull: "scout", name: "Light Cell", blurb: "Less range. Lighter frame.", delta: { fuelCap: -24, mass: -0.04 } },
  "s-hx-stock": { id: "s-hx-stock", slot: "hx", hull: "scout", name: "Cold Fin", blurb: "Stock quiet sink.", stock: true, delta: {} },
  "s-hx-deep": { id: "s-hx-deep", slot: "hx", hull: "scout", name: "Deep Sink", blurb: "Longer OD. Heavier core.", delta: { overdriveSec: 3, coolSec: 1, mass: 0.05 } },
  "s-hx-vent": { id: "s-hx-vent", slot: "hx", hull: "scout", name: "Thin Fin", blurb: "Dumps fast. Runs hotter.", delta: { overdriveSec: -2, coolSec: -2, mass: -0.02 } },
  "k-thr-stock": { id: "k-thr-stock", slot: "thruster", hull: "clipper", name: "Snap Ring", blurb: "Stock sprint gimbals.", stock: true, delta: {} },
  "k-thr-bite": { id: "k-thr-bite", slot: "thruster", hull: "clipper", name: "Hard Bite", blurb: "Turns harder. Costs mass.", delta: { turnRate: 0.28, mass: 0.07 } },
  "k-thr-soft": { id: "k-thr-soft", slot: "thruster", hull: "clipper", name: "Soft Ring", blurb: "Lazier. Lighter ring.", delta: { turnRate: -0.22, mass: -0.05 } },
  "k-drv-stock": { id: "k-drv-stock", slot: "drive", hull: "clipper", name: "Hot Pulse", blurb: "Stock sprint drive.", stock: true, delta: {} },
  "k-drv-sprint": { id: "k-drv-sprint", slot: "drive", hull: "clipper", name: "Flare Coil", blurb: "Hotter OD. Shorter cruise.", delta: { cruiseSpeed: -1.0, overdriveSpeed: 12, overdriveSec: -2, mass: 0.08 } },
  "k-drv-cruise": { id: "k-drv-cruise", slot: "drive", hull: "clipper", name: "Lane Tube", blurb: "More cruise. Tamer OD.", delta: { cruiseSpeed: 1.4, overdriveSpeed: -10, overdriveSec: 3 } },
  "k-fsd-stock": { id: "k-fsd-stock", slot: "fsd", hull: "clipper", name: "Short Spool", blurb: "Stock short legs.", stock: true, delta: {} },
  "k-fsd-far": { id: "k-fsd-far", slot: "fsd", hull: "clipper", name: "Stretch", blurb: "A little further. Slower lock.", delta: { jumpRangeLy: 3, fsdChargeSec: 0.7 } },
  "k-fsd-quick": { id: "k-fsd-quick", slot: "fsd", hull: "clipper", name: "Instant", blurb: "Snaps. Shorter hop.", delta: { jumpRangeLy: -2, fsdChargeSec: -0.3 } },
  "k-hld-stock": { id: "k-hld-stock", slot: "hold", hull: "clipper", name: "Pouch", blurb: "Packets only.", stock: true, delta: {} },
  "k-hld-rack": { id: "k-hld-rack", slot: "hold", hull: "clipper", name: "Packet Rack", blurb: "More volume. Heavier stick.", delta: { cargoCap: 6, mass: 0.06, turnRate: -0.08 } },
  "k-hld-seal": { id: "k-hld-seal", slot: "hold", hull: "clipper", name: "Slim Bay", blurb: "Small. Light.", delta: { cargoCap: -4, mass: -0.04 } },
  "k-tnk-stock": { id: "k-tnk-stock", slot: "tank", hull: "clipper", name: "Cell A", blurb: "Stock T1. Hungry OD.", stock: true, delta: {} },
  "k-tnk-long": { id: "k-tnk-long", slot: "tank", hull: "clipper", name: "Long Cell", blurb: "More T1. Heavier cell.", delta: { fuelCap: 28, mass: 0.07 } },
  "k-tnk-light": { id: "k-tnk-light", slot: "tank", hull: "clipper", name: "Drop Tank", blurb: "Lighter. Shorter legs.", delta: { fuelCap: -20, mass: -0.05 } },
  "k-hx-stock": { id: "k-hx-stock", slot: "hx", hull: "clipper", name: "Hot Fin", blurb: "Stock sprint sink.", stock: true, delta: {} },
  "k-hx-cold": { id: "k-hx-cold", slot: "hx", hull: "clipper", name: "Cold Block", blurb: "Longer OD. Heavier core.", delta: { overdriveSec: 3, coolSec: 1, mass: 0.06 } },
  "k-hx-vent": { id: "k-hx-vent", slot: "hx", hull: "clipper", name: "Bleed", blurb: "Dumps fast. Runs hotter.", delta: { overdriveSec: -2, coolSec: -2 } },
};

export const STOCK_LOADOUT: Loadout = {
  courier: { thruster: "c-thr-stock", drive: "c-drv-stock", fsd: "c-fsd-stock", hold: "c-hld-stock", tank: "c-tnk-stock", hx: "c-hx-stock" },
  hauler: { thruster: "h-thr-stock", drive: "h-drv-stock", fsd: "h-fsd-stock", hold: "h-hld-stock", tank: "h-tnk-stock", hx: "h-hx-stock" },
  scout: { thruster: "s-thr-stock", drive: "s-drv-stock", fsd: "s-fsd-stock", hold: "s-hld-stock", tank: "s-tnk-stock", hx: "s-hx-stock" },
  clipper: { thruster: "k-thr-stock", drive: "k-drv-stock", fsd: "k-fsd-stock", hold: "k-hld-stock", tank: "k-tnk-stock", hx: "k-hx-stock" },
};

export function modulesFor(hull: ShipId, slot: SlotId): ModuleDef[] {
  return Object.values(MODULES).filter((m) => m.hull === hull && m.slot === slot);
}

export function sanitizeLoadout(raw: unknown): Loadout {
  const out: Loadout = {
    courier: { ...STOCK_LOADOUT.courier },
    hauler: { ...STOCK_LOADOUT.hauler },
    scout: { ...STOCK_LOADOUT.scout },
    clipper: { ...STOCK_LOADOUT.clipper },
  };
  if (!raw || typeof raw !== "object") return out;
  const rec = raw as Partial<Loadout>;
  for (const hull of SHIP_ORDER) {
    const fit = rec[hull];
    if (!fit) continue;
    for (const slot of SLOTS) {
      const id = fit[slot];
      const mod = id ? MODULES[id] : null;
      if (mod && mod.hull === hull && mod.slot === slot) out[hull][slot] = id;
    }
  }
  return out;
}

const FLOOR: Record<StatKey, number> = {
  mass: 0.35,
  turnRate: 0.28,
  cruiseSpeed: 2.2,
  overdriveSpeed: 18,
  overdriveSec: 4,
  fsdChargeSec: 0.55,
  jumpRangeLy: 6,
  cargoCap: 2,
  coolSec: 3,
  fuelCap: 36,
};

export function fittedShip(shipId: ShipId, loadout: Loadout = STOCK_LOADOUT): ShipDef {
  const hull = SHIPS[shipId] ?? SHIPS.courier;
  const next: ShipDef = { ...hull };
  const fit: ShipLoadout = loadout[shipId] ?? STOCK_LOADOUT[shipId];
  for (const slot of SLOTS) {
    const mod = MODULES[fit[slot]];
    if (!mod) continue;
    for (const key of Object.keys(mod.delta) as StatKey[]) {
      const add = mod.delta[key];
      if (typeof add !== "number") continue;
      const cur = next[key] as number;
      (next[key] as number) = Math.max(FLOOR[key], +(cur + add).toFixed(2));
    }
  }
  return next;
}

export function moduleById(id: string) {
  return MODULES[id] ?? null;
}

export function fullTanks(loadout: Loadout = STOCK_LOADOUT): Record<ShipId, number> {
  const out = {} as Record<ShipId, number>;
  for (const hull of SHIP_ORDER) out[hull] = fittedShip(hull, loadout).fuelCap;
  return out;
}

export function sanitizeFuel(raw: unknown, loadout: Loadout): Record<ShipId, number> {
  const cap = fullTanks(loadout);
  const out = { ...cap };
  if (!raw || typeof raw !== "object") return out;
  const rec = raw as Partial<Record<ShipId, number>>;
  for (const hull of SHIP_ORDER) {
    const v = rec[hull];
    if (typeof v !== "number" || Number.isNaN(v)) continue;
    out[hull] = Math.max(0, Math.min(cap[hull], v));
  }
  return out;
}