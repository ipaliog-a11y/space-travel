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

const CRUISE = 10;
const OD = 0.75;
const OD_SPD = 20;

function drive(t: number) {
  return driveFromThrottle(t, CRUISE, OD_SPD, OD);
}

describe("throttle lever", () => {
  it("lets Z pull below 0 into reverse, and caps the pad", () => {
    assert.ok(clampThrottle(-0.4, false, OD, false) < 0);
    assert.equal(clampThrottle(-2, false, OD, false), -1);
    assert.equal(clampThrottle(1, false, OD, true), THR_DOCK_CAP);
    assert.ok(clampThrottle(1, true, OD, false) <= OD);
  });

  /**
   * Genre bar (Decision #016): Elite FA-on halt at 0 on the pad,
   * SC precision (reverse is not a second cruise), X4 deadzone, NMS/KSP RCS reverse.
   * Numbers are % of cruise at courier-scale 10.
   */
  it("matches the trader throttle quality table", () => {
    const rows: [lever: number, min: number, max: number, note: string][] = [
      [0, 0, 0, "idle"],
      [0.075, 0.05, 0.45, "10% of cruise detent — crawl, not a jump"],
      [0.2, 0.4, 1.6, "low stick still well under linear"],
      [0.375, 2.2, 4.2, "half to the detent is still under half cruise"],
      [OD, 9.8, 10.2, "detent is cruise"],
      [1, 19.5, 20.5, "top is overdrive"],
      [-1, -1.05, -0.7, "full reverse is RCS, ~9% cruise"],
    ];
    for (const [lever, min, max, note] of rows) {
      const d = drive(lever);
      assert.ok(d >= min && d <= max, `${note}: lever ${lever} → ${d}, want ${min}..${max}`);
    }
    const linearLow = (0.2 / OD) * CRUISE;
    assert.ok(drive(0.2) < linearLow * 0.55);
    assert.ok(FWD_GAMMA > 1.4);
    assert.ok(THR_REV_FRAC <= 0.12);
    assert.ok(THR_DEAD >= 0.03);
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
  });

  it("backs off the gate when the lever is below 0, without a closing floor", () => {
    assert.equal(dockClose(0, 0), 0);
    assert.ok(dockClose(0.2, 2) > 0);
    assert.ok(dockClose(0.2, 2) < 2.1);
    assert.ok(dockClose(-0.3, -0.8) < 0);
  });
});
