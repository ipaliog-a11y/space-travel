import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  CREW_GRADES,
  crewArms,
  crewGrade,
  crewRestSec,
  crewXpInto,
  resolveCrewPirate,
} from "./crew-grade.ts";

describe("crew grades", () => {
  it("starts green: no jumps, full pad rest, unarmed", () => {
    const g = crewGrade(0);
    assert.equal(g.id, "green");
    assert.equal(g.maxLy, 0);
    assert.equal(g.evade, 0);
    assert.equal(crewRestSec(90, 0), 90);
    assert.equal(crewArms(0), "Unarmed");
  });

  it("opens jumps and shortens rest with XP", () => {
    assert.equal(crewGrade(3).id, "local");
    assert.equal(crewGrade(3).maxLy, 0);
    assert.equal(crewGrade(8).id, "line");
    assert.ok(crewGrade(8).maxLy > 0);
    assert.ok(crewRestSec(100, 8) < 50);
    assert.ok(crewRestSec(100, 28) < 10);
    assert.equal(crewGrade(40).id, "keeper");
  });

  it("green always loses a hit; keeper usually keeps it", () => {
    const greenHit = resolveCrewPirate(0, 0, 0);
    assert.equal(greenHit.hit, true);
    assert.equal(greenHit.lost, true);
    const greenMiss = resolveCrewPirate(0, 0.99, 0);
    assert.equal(greenMiss.hit, false);
    assert.equal(greenMiss.lost, false);
    const keep = resolveCrewPirate(28, 0, 0);
    assert.equal(keep.hit, true);
    assert.equal(keep.lost, false);
  });

  it("reports progress to the next grade", () => {
    const mid = crewXpInto(5);
    assert.equal(mid.grade.id, "local");
    assert.equal(mid.next?.id, "line");
    assert.equal(mid.have, 2);
    assert.equal(mid.need, 5);
    assert.equal(crewXpInto(28).next, null);
    assert.equal(CREW_GRADES.length, 5);
  });
});
