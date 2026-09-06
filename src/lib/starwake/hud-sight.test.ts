import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { coerceSight, HEAT_RING, SIGHT_IDS, SIGHTS } from "./hud-sight.ts";

describe("hud sight", () => {
  it("keeps three named looks", () => {
    assert.deepEqual([...SIGHT_IDS], ["pip", "ladder", "ring"]);
    assert.equal(SIGHTS.length, 3);
  });

  it("coerces junk to pip", () => {
    assert.equal(coerceSight("ring"), "ring");
    assert.equal(coerceSight("nope"), "pip");
  });

  it("heat ring is a full circle", () => {
    assert.ok(HEAT_RING > 200);
    assert.ok(HEAT_RING < 220);
  });
});
