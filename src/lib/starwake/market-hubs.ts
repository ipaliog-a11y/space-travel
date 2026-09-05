import { distLy, GALAXY, getSystem } from "./galaxy.ts";
import { cargoOf, hubKey, hubListings, type CargoHold, type GoodId } from "./market.ts";
import { nearestListed, type ListedHop } from "./market-analysis.ts";

export type MarketHub = {
  systemId: string;
  stationId: string;
  system: string;
  station: string;
  key: string;
};

export function marketHubs(): MarketHub[] {
  const out: MarketHub[] = [];
  for (const sys of GALAXY) {
    for (const st of sys.stations) {
      out.push({
        systemId: sys.id,
        stationId: st.id,
        system: sys.name,
        station: st.name,
        key: hubKey(sys.id, st.id),
      });
    }
  }
  return out;
}

export function hubsForGood(goodId: GoodId): MarketHub[] {
  return marketHubs().filter((h) => hubListings(h.key).includes(goodId));
}

export function hopsForGood(goodId: GoodId, fromSystemId: string): ListedHop[] {
  const from = getSystem(fromSystemId);
  return nearestListed(hubsForGood(goodId), from.id, (a, b) => distLy(getSystem(a), getSystem(b)));
}

export function padOfKey(key: string): MarketHub | null {
  const cut = key.indexOf(":");
  if (cut <= 0) return null;
  const systemId = key.slice(0, cut);
  const stationId = key.slice(cut + 1);
  if (!stationId) return null;
  const sys = GALAXY.find((row) => row.id === systemId);
  const st = sys?.stations.find((row) => row.id === stationId);
  if (!sys || !st) return null;
  return {
    systemId,
    stationId,
    system: sys.name,
    station: st.name,
    key,
  };
}

export type ListedPad = MarketHub & { hold: CargoHold };

export function listedPads(warehouses: Record<string, CargoHold>): ListedPad[] {
  const out: ListedPad[] = [];
  for (const [key, hold] of Object.entries(warehouses)) {
    if (!hold?.length) continue;
    const pad = padOfKey(key) ?? unnamedPad(key);
    out.push({ ...pad, hold });
  }
  return out.sort((a, b) => a.system.localeCompare(b.system) || a.station.localeCompare(b.station));
}

function unnamedPad(key: string): MarketHub {
  const cut = key.indexOf(":");
  const systemId = cut > 0 ? key.slice(0, cut) : key;
  const stationId = cut > 0 ? key.slice(cut + 1) : key;
  return {
    systemId,
    stationId,
    system: systemId || "unknown",
    station: stationId || "pad",
    key,
  };
}

export function padsHolding(warehouses: Record<string, CargoHold>, goodId: GoodId): (ListedPad & { qty: number })[] {
  return listedPads(warehouses)
    .map((pad) => ({ ...pad, qty: cargoOf(pad.hold, goodId) }))
    .filter((pad) => pad.qty > 0);
}
