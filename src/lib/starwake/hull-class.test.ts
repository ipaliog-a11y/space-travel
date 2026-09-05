import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { classOfHull, classPrompt, HULL_CLASSES, hullClass, lengthLine } from "./hull-class.ts";

describe("hull classes", () => {
  it("saves five classes with recon shorter than cargo", () => {
    assert.equal(HULL_CLASSES.length, 5);
    const scout = hullClass("ION_SCOUT");
    const hauler = hullClass("HAULER");
    const frigate = hullClass("VOID_FRIGATE");
    assert.ok(scout.lengthMax < hauler.lengthMin);
    assert.equal(frigate.flyable, false);
    assert.equal(frigate.role, "combat");
    assert.equal(lengthLine(scout), "12–18 m");
  });

  it("maps live hulls; Courier is the starter cutter", () => {
    assert.equal(classOfHull("courier").id, "WARP_CUTTER");
    assert.equal(classOfHull("scout").id, "ION_SCOUT");
    assert.equal(classOfHull("extractor").id, "MINING_BARGE");
    assert.equal(classOfHull("hauler").id, "HAULER");
    assert.match(classPrompt(classOfHull("courier")), /22–30 m/);
  });
});
