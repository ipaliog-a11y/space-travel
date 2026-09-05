import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  crewYieldHub,
  foundOutpost,
  isOwnLock,
  OUTPOST_CAP,
  OUTPOST_COST,
  padCap,
  sanitizeOutpost,
  withOutpost,
} from "./outpost.ts";
import type { Planet, StarSystem, Station } from "./types.ts";

function planet(id: string, port: boolean): Planet {
  return {
    id,
    name: id,
    kind: "rocky",
    radius: 22,
    orbit: 2400,
    phase: 0,
    color: [0.5, 0.5, 0.5],
    rings: false,
    ringInner: 0,
    ringOuter: 0,
    ringTilt: 0,
    ringColor: [0.4, 0.4, 0.4],
    radiusKm: 4000,
    massEarth: 0.4,
    gravityG: 0.5,
    au: 0.8,
    yearDays: 100,
    dayHours: 20,
    ecc: 0.02,
    inc: 0.04,
    lan: 0.1,
    argp: 0.1,
    m0: 0.2,
    meanN: 0.002,
    climate: "dry",
    composition: "rock",
    atmosphere: "thin",
    interest: port ? "port" : "wild",
    stationId: port ? `st-${id}` : null,
    prospect: port ? null : { research: 1, mining: 1, note: "" },
    moons: [],
  };
}

function sys(): StarSystem {
  const a = planet("wild", false);
  const b = planet("port", true);
  const st: Station = {
    id: "st-port",
    name: "Port lock",
    planetId: "port",
    kind: "wheel",
    radius: 8,
    ringR: 15,
    phase: 0.2,
    color: [0.6, 0.6, 0.65],
    accent: [0.4, 0.7, 0.7],
  };
  return {
    id: "helion",
    name: "Helios",
    x: 0,
    y: 0,
    z: 0,
    starColor: [1, 0.9, 0.8],
    starRadius: 80,
    planets: [a, b],
    stations: [st],
    belt: null,
    comets: [],
    nebula: { kind: "arm", seed: 1, intensity: 0.8 },
  };
}

describe("player outpost", () => {
  it("anchors on a wild world and stays one lock", () => {
    const o = foundOutpost(sys(), "Kite");
    assert.ok(o);
    assert.equal(o.planetId, "wild");
    assert.equal(o.cap, OUTPOST_CAP);
    assert.ok(OUTPOST_COST > 9000);
    const live = withOutpost(sys(), o);
    assert.equal(live.stations.length, 2);
    assert.equal(live.planets.find((p) => p.id === "wild")?.stationId, o.id);
    assert.equal(withOutpost(sys(), o).stations.length, 2);
    assert.equal(isOwnLock(o.id, o), true);
    assert.equal(padCap(`helion:${o.id}`, o), OUTPOST_CAP);
    assert.equal(padCap("helion:st-port", o), null);
    assert.deepEqual(
      crewYieldHub({ to: { systemId: "helion", stationId: "st-port" } }, o),
      { systemId: "helion", stationId: o.id },
    );
    assert.deepEqual(
      crewYieldHub({ to: { systemId: "vega", stationId: "st-x" } }, o),
      { systemId: "vega", stationId: "st-x" },
    );
  });

  it("drops junk saves", () => {
    assert.equal(sanitizeOutpost(null), null);
    assert.equal(sanitizeOutpost({ id: "st-port" }), null);
    const o = sanitizeOutpost({
      id: "st-own-helion",
      systemId: "helion",
      planetId: "wild",
      name: "Kite Annex",
      cap: 120,
    });
    assert.equal(o?.id, "st-own-helion");
  });
});
