import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { canPayT1, canPayT2, FUEL_DRY, tankBand, tankLabel, transitT1Cost } from "./fuel-status.ts";

describe("fuel status", () => {
  it("bands dry / low / ok", () => {
    assert.equal(tankBand(0, 100), "dry");
    assert.equal(tankBand(FUEL_DRY, 100), "dry");
    assert.equal(tankBand(10, 100), "low");
    assert.equal(tankBand(50, 100), "ok");
    assert.equal(tankLabel("dry"), "Dry");
  });

  it("transit sips T1 from distance, never free", () => {
    assert.ok(transitT1Cost(0) >= 0.4);
    assert.ok(transitT1Cost(20000) > transitT1Cost(200));
    assert.equal(canPayT1(0, 1), false);
    assert.equal(canPayT1(8, 4), true);
    assert.equal(canPayT2(0.04, 1.4), false);
    assert.equal(canPayT2(8, 1.4), true);
  });
});
