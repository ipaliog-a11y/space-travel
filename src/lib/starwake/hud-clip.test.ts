import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { jumpLamp, lookVerb } from "./hud-clip.ts";

describe("hud clip", () => {
  it("one verb, dock beats sip beats scan", () => {
    const base = {
      docking: false,
      canDock: false,
      canScoop: true,
      scooping: false,
      extracting: false,
      canExtract: false,
      gasHarvest: false,
      canSurvey: false,
      hasBody: true,
      known: false,
    };
    assert.equal(lookVerb({ ...base, canDock: true })?.id, "dock");
    assert.equal(lookVerb(base)?.id, "sip");
    assert.equal(lookVerb({ ...base, canScoop: false })?.label, "Scan");
    assert.equal(lookVerb({ ...base, canScoop: false, known: true })?.label, "File");
  });

  it("jump lamp is status, not a second head", () => {
    assert.equal(jumpLamp(0), "off");
    assert.equal(jumpLamp(0.67), "amber");
    assert.equal(jumpLamp(1), "teal");
  });
});
