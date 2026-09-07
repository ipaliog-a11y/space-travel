import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  canPayFsd,
  canPayT1,
  canPayT2,
  FSD_T1_SHARE,
  FSD_T2_SHARE,
  FUEL_DRY,
  fsdMix,
  scoopBand,
  SCOOP_T1_PER_SEC,
  tankBand,
  tankLabel,
  transitT1Cost,
} from "./fuel-status.ts";

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

  it("FSD mix is 20% T1 / 80% T2 of the hop", () => {
    assert.equal(FSD_T1_SHARE + FSD_T2_SHARE, 1);
    const mix = fsdMix(5, 100, 24);
    assert.equal(mix.t2, 4);
    assert.ok(mix.t1 > 0);
    assert.ok(Math.abs(mix.t1 - 5 * 0.2 * (100 / 24)) < 0.02);
    assert.equal(canPayFsd(mix.t1, mix.t2, mix), true);
    assert.equal(canPayFsd(mix.t1 - 0.1, mix.t2, mix), false);
    assert.equal(canPayFsd(mix.t1, mix.t2 - 0.1, mix), false);
  });

  it("star scoop band and 1% per second", () => {
    assert.equal(scoopBand(88 * 2, 88), "in");
    assert.equal(scoopBand(88 * 3.55, 88), "near");
    assert.equal(scoopBand(88 * 8, 88), "out");
    assert.equal(SCOOP_T1_PER_SEC, 0.01);
  });
});
