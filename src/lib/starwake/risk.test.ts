import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { boostEscapes, haulAtRisk, INTERDICT_OD_SEC, interdictRansom, rollInterdict } from "./risk.ts";

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
});
