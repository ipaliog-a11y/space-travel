import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  HALT_REL,
  THR_DEAD,
  THR_DOCK_CAP,
  THR_DOCK_REV,
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
    assert.equal(clampThrottle(-1, false, 0.75, true), THR_DOCK_REV);
    assert.ok(clampThrottle(1, true, 0.75, false) <= 0.75);
  });

  it("maps reverse to a slower backing speed, forward like cruise", () => {
    assert.equal(driveFromThrottle(0, 10, 20, 0.75), 0);
    assert.ok(driveFromThrottle(-1, 10, 20, 0.75) < 0);
    assert.ok(Math.abs(driveFromThrottle(-1, 10, 20, 0.75)) < 10);
    assert.ok(driveFromThrottle(0.75, 10, 20, 0.75) > 9);
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

  it("backs off the gate when the lever is below 0", () => {
    assert.equal(dockClose(0, 0), 0);
    assert.ok(dockClose(0.2, 2) > 0);
    assert.ok(dockClose(-0.3, -1.5) < 0);
  });
});
