import type { Loadout, ModuleDef, ShipDef, ShipId, ShipLoadout, SlotId, StatKey } from "./types";

export const SHIPS: Record<ShipId, ShipDef> = {
  courier: {
    id: "courier",
    name: "Courier",
    blurb: "Light frame. Snaps onto a heading. Short legs.",
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
    accent: "#d7dde4",
    audioPitch: 1.08,
  },
  hauler: {
    id: "hauler",
    name: "Hauler",
    blurb: "Mass first. Slow to spool. Reaches farther.",
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
    accent: "#b7c0c8",
    audioPitch: 0.9,
  },
};

export const SHIP_ORDER: ShipId[] = ["courier", "hauler"];
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
};

export const STOCK_LOADOUT: Loadout = {
  courier: { thruster: "c-thr-stock", drive: "c-drv-stock", fsd: "c-fsd-stock", hold: "c-hld-stock", tank: "c-tnk-stock", hx: "c-hx-stock" },
  hauler: { thruster: "h-thr-stock", drive: "h-drv-stock", fsd: "h-fsd-stock", hold: "h-hld-stock", tank: "h-tnk-stock", hx: "h-hx-stock" },
};

export function modulesFor(hull: ShipId, slot: SlotId): ModuleDef[] {
  return Object.values(MODULES).filter((m) => m.hull === hull && m.slot === slot);
}

export function sanitizeLoadout(raw: unknown): Loadout {
  const out: Loadout = {
    courier: { ...STOCK_LOADOUT.courier },
    hauler: { ...STOCK_LOADOUT.hauler },
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
  return {
    courier: fittedShip("courier", loadout).fuelCap,
    hauler: fittedShip("hauler", loadout).fuelCap,
  };
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