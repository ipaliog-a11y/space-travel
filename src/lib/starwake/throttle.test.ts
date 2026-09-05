import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  FWD_GAMMA,
  HALT_REL,
  THR_DEAD,
  THR_DOCK_CAP,
  THR_REV_FRAC,
  THR_ZERO_VIS,
  clampThrottle,
  dockClose,
  driveFromThrottle,
  idleHalt,
  throttleToVisual,
  visualToThrottle,
} from "./throttle.ts";

describe("throttle lever", () => {
  it("lets Z pull below 0 into reverse, and caps the pad", () => {
    assert.ok(clampThrottle(-0.4, false, 0.75, false) < 0);
    assert.equal(clampThrottle(-2, false, 0.75, false), -1);
    assert.equal(clampThrottle(1, false, 0.75, true), THR_DOCK_CAP);
    assert.ok(clampThrottle(1, true, 0.75, false) <= 0.75);
  });

  it("keeps reverse in the RCS band", () => {
    const d = driveFromThrottle(-1, 10, 20, 0.75);
    assert.ok(d < 0);
    assert.ok(Math.abs(d) <= 10 * THR_REV_FRAC + 1e-9);
    assert.ok(Math.abs(d) < 1.1);
  });

  it("eases into cruise so a crack of lever is not a jump", () => {
    const cruise = 10;
    const od = 0.75;
    const low = 0.2;
    const linear = (low / od) * cruise;
    const shaped = driveFromThrottle(low, cruise, 20, od);
    assert.ok(shaped > 0);
    assert.ok(shaped < linear * 0.55);
    assert.ok(driveFromThrottle(od, cruise, 20, od) > cruise * 0.98);
    assert.ok(FWD_GAMMA > 1);
  });

  it("round-trips the lever visual with a detent at idle", () => {
    assert.ok(Math.abs(throttleToVisual(0) - THR_ZERO_VIS) < 1e-9);
    assert.equal(throttleToVisual(1), 1);
    assert.equal(throttleToVisual(-1), 0);
    for (const t of [-1, -0.4, 0, 0.3, 0.75, 1]) {
      assert.ok(Math.abs(visualToThrottle(throttleToVisual(t)) - t) < 1e-9);
    }
  });

  it("idles to a halt on the pad, not in open space", () => {
    assert.equal(idleHalt(0, true, false, 20), true);
    assert.equal(idleHalt(0, false, true, HALT_REL - 1), true);
    assert.equal(idleHalt(0, false, true, HALT_REL + 2), false);
    assert.equal(idleHalt(0, false, false, 1), false);
    assert.equal(idleHalt(0.5, true, true, 1), false);
    assert.ok(THR_DEAD < 0.05);
  });

  it("backs off the gate when the lever is below 0, without a closing floor", () => {
    assert.equal(dockClose(0, 0), 0);
    assert.ok(dockClose(0.2, 2) > 0);
    assert.ok(dockClose(0.2, 2) < 2.1);
    assert.ok(dockClose(-0.3, -0.8) < 0);
  });
});
