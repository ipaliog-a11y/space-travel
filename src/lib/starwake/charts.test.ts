import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { cycleMapLayer } from "./charts.ts";

describe("charts keys", () => {
  it("tabs between system and galaxy", () => {
    assert.equal(cycleMapLayer("system"), "galaxy");
    assert.equal(cycleMapLayer("galaxy"), "system");
  });
});
