import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { CREW_CUT, CREW_UPKEEP } from "./fleet.ts";
import {
  CREW_MARK_CAP,
  CREW_SKILLS,
  applyCrewMods,
  canTake,
  crewCutWithSkills,
  crewRunSecWithSkills,
  crewUpkeepWithSkills,
  marksFree,
  marksSpent,
  sanitizeOwned,
  skillById,
  skillsForHull,
} from "./crew-skills.ts";

describe("crew skill lines", () => {
  it("has three lines of three on each hull", () => {
    const courier = skillsForHull("courier");
    const hauler = skillsForHull("hauler");
    assert.equal(courier.length, 9);
    assert.equal(hauler.length, 9);
    assert.equal(CREW_SKILLS.length, 18);
    assert.equal(new Set(courier.map((s) => s.line)).size, 3);
    assert.equal(new Set(hauler.map((s) => s.line)).size, 3);
  });

  it("gates later nodes on the same line and on marks", () => {
    const relay = skillById("packet-2")!;
    assert.equal(canTake(relay, [], 10, "courier"), false);
    assert.equal(canTake(relay, ["packet-1"], 1, "courier"), false);
    assert.equal(canTake(relay, ["packet-1"], 3, "courier"), true);
    assert.equal(canTake(skillById("hold-1")!, [], 4, "courier"), false);
  });

  it("caps spent marks so one crew cannot fill every line", () => {
    assert.equal(CREW_MARK_CAP, 8);
    const oneLine = ["packet-1", "packet-2", "packet-3"];
    assert.equal(marksSpent(oneLine), 6);
    assert.equal(marksFree(12, oneLine), 2);
    const greedy = ["packet-1", "packet-2", "packet-3", "wake-1", "wake-2"];
    assert.equal(canTake(skillById("wake-2")!, ["packet-1", "packet-2", "packet-3", "wake-1"], 20, "courier"), false);
    assert.ok(marksSpent(greedy) > CREW_MARK_CAP);
  });

  it("stacks run time on Packet and qty on Hold", () => {
    const fast = applyCrewMods(["packet-1", "packet-2"], "courier");
    assert.ok(fast.runSec < 0.85);
    assert.ok(fast.upkeep < 0);
    const mass = applyCrewMods(["hold-1", "hold-2"], "hauler");
    assert.ok(mass.qty > 1.2);
    assert.ok(mass.runSec > 1);
  });

  it("keeps cut and upkeep in a playable band", () => {
    const cut = crewCutWithSkills(["wake-1", "wake-2", "wake-3"], "courier");
    assert.ok(cut > CREW_CUT);
    assert.ok(cut <= 0.62);
    const up = crewUpkeepWithSkills(["pad-2"], "hauler");
    assert.ok(up < CREW_UPKEEP.hauler);
    assert.ok(up >= 20);
    assert.equal(crewRunSecWithSkills(100, ["packet-3"], "courier"), 80);
  });

  it("drops unknown ids and the other hull's skills", () => {
    assert.deepEqual(sanitizeOwned(["packet-1", "hold-1", "nope", "packet-1"], "courier"), ["packet-1"]);
  });
});
