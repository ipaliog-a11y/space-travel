import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { destPad, rankCut, tugCost, tugWaitSec, TUG_FLOOR } from "./tug.ts";
import type { Planet, StarSystem, Station } from "./types.ts";

const pad: Station = {
  id: "st-1",
  name: "Pad",
  planetId: "p1",
  kind: "truss",
  radius: 1,
  ringR: 1,
  phase: 0,
  color: [1, 1, 1],
  accent: [1, 1, 1],
};
const planet = { id: "p1", au: 1 } as Planet;
const home = {
  id: "helion",
  name: "Helios",
  x: 0,
  y: 0,
  z: 0,
  stations: [pad],
  planets: [planet],
} as StarSystem;

describe("helion tug", () => {
  it("local floor, au add, skip and outpost cut", () => {
    const base = tugCost({ kind: "local", au: 0, rank: 1, outpostHere: false, skip: false });
    assert.equal(base, TUG_FLOOR);
    assert.equal(tugCost({ kind: "local", au: 10, rank: 1, outpostHere: false, skip: false }), 480);
    assert.equal(tugCost({ kind: "local", au: 10, rank: 1, outpostHere: true, skip: false }), 240);
    assert.equal(tugCost({ kind: "local", au: 0, rank: 1, outpostHere: false, skip: true }), 600);
    assert.ok(tugCost({ kind: "stranded", au: 0, rank: 1, outpostHere: false, skip: false }) > base);
  });

  it("rank never makes it free, ferry stays in band", () => {
    assert.ok(rankCut(1) > rankCut(15));
    const ferry = tugCost({ kind: "ferry", au: 0, ly: 6, rank: 1, outpostHere: false, skip: false });
    assert.ok(ferry >= 1200 && ferry <= 2500);
    assert.equal(tugWaitSec(0), 8);
    assert.ok(tugWaitSec(40) <= 20);
  });

  it("local pad prefers the annex, ferry goes home", () => {
    const local = destPad({
      here: home,
      home,
      kind: "local",
      nearestId: pad.id,
      lastStationId: null,
      outpostId: pad.id,
    });
    assert.equal(local.stationId, pad.id);
    assert.equal(local.ly, 0);
    const far = { ...home, id: "far", x: 12 } as StarSystem;
    const ferry = destPad({
      here: far,
      home,
      kind: "ferry",
      nearestId: null,
      lastStationId: null,
      outpostId: null,
    });
    assert.equal(ferry.systemId, "helion");
    assert.ok(ferry.ly > 0);
  });
});
