import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { cruiseWanted, FLY_DRAW, FLY_MAX, flyDrawScale, flyVisible } from "./traffic-scale.ts";

describe("system traffic", () => {
  it("fills a busy lock with a Helion-sized fly count", () => {
    assert.equal(cruiseWanted({ stations: { length: 3 }, planets: { length: 5 } }), 10);
    assert.equal(cruiseWanted({ stations: { length: 1 }, planets: { length: 3 } }), 8);
    assert.equal(cruiseWanted({ stations: { length: 0 }, planets: { length: 2 } }), 4);
    assert.ok(FLY_MAX >= 10);
  });

  it("draws cruise across the system, not only at the pad", () => {
    assert.equal(flyVisible("berthed", 400), false);
    assert.equal(flyVisible("cruise", 400), true);
    assert.equal(flyVisible("cruise", FLY_DRAW + 1), false);
    assert.ok(flyDrawScale("cruise", 2000, 2.4) > 2.4);
    assert.equal(flyDrawScale("berthed", 2000, 0.42), 0.42);
  });
});
