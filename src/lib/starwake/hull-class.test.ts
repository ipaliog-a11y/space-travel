import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { beautyOf, beautyPrompt, classOfHull, classPrompt, FRIGATE_BEAUTY, HULL_CLASSES, hullClass, lengthLine } from "./hull-class.ts";

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

  it("beauty shot names class, 3/4 view, and the visual law", () => {
    const p = beautyPrompt(beautyOf("courier"));
    assert.match(p, /WARP_CUTTER/);
    assert.match(p, /Ashwake/);
    assert.match(p, /3\/4 front-above/);
    assert.match(p, /STARWAKE VISUAL LAW/);
    assert.match(p, /no text/);
    assert.match(p, /stern/);
    assert.doesNotMatch(p, /offset warp ring/);
    assert.match(beautyPrompt(FRIGATE_BEAUTY), /VOID_FRIGATE/);
  });
});
