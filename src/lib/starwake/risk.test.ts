import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  boostEscapes,
  haulAtRisk,
  INTERDICT_OD_SEC,
  interdictRansom,
  kiteOdds,
  playerEvade,
  rollInterdict,
  rollJumpKite,
  slipKite,
  systemPresence,
  HOME_KITE_ID,
} from "./risk.ts";

describe("interdiction", () => {
  it("only stops a loaded haul after a few seconds of OD", () => {
    assert.equal(haulAtRisk(false, 0), false);
    assert.equal(haulAtRisk(true, 0), true);
    assert.equal(haulAtRisk(false, 2), true);
    assert.equal(rollInterdict(INTERDICT_OD_SEC - 1, 0, true), false);
    assert.equal(rollInterdict(INTERDICT_OD_SEC, 0, false), false);
    assert.equal(rollInterdict(INTERDICT_OD_SEC, 0, true), true);
    assert.equal(rollInterdict(INTERDICT_OD_SEC, 0.99, true), false);
  });

  it("ransoms a cut of the stake, never the ship", () => {
    assert.equal(interdictRansom(0, 0), 40);
    assert.equal(interdictRansom(200, 0), 70);
    assert.ok(boostEscapes(0));
    assert.ok(!boostEscapes(0.9));
  });

  it("keeps system kites quiet, not pirate nests", () => {
    const home = systemPresence(HOME_KITE_ID, { home: true, pads: 3 });
    assert.ok(home >= 0.04 && home <= 0.06);
    const far = systemPresence("sys-wild", { wild: true, pads: 1 });
    assert.ok(far >= 0.04 && far <= 0.2);
    assert.ok(home <= far + 0.001);
  });

  it("raises slip with rank, never immunity", () => {
    assert.equal(playerEvade(1), 0.08);
    assert.ok(playerEvade(8) > playerEvade(3));
    assert.ok(playerEvade(15) < 0.75);
    assert.ok(slipKite(0.7, 0.1));
    assert.ok(!slipKite(0.7, 0.8));
    const low = kiteOdds(HOME_KITE_ID, 1, { home: true });
    const high = kiteOdds(HOME_KITE_ID, 15, { home: true });
    assert.ok(high.evadePct > low.evadePct);
    assert.ok(high.presence < low.presence);
    assert.ok(high.presence > 0.03);
  });

  it("jumps only kite a loaded haul", () => {
    assert.equal(rollJumpKite(0.2, 0, false), false);
    assert.equal(rollJumpKite(0.2, 0, true), true);
    assert.equal(rollJumpKite(0.2, 0.9, true), false);
  });
});
