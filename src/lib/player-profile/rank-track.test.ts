import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  TRACK_RANKS,
  clamp01,
  getProgressBetween,
  getRankForXp,
  layoutNodes,
  lerp,
  markerX,
  trackWidth,
  xpIntoNext,
} from "./rank-track.ts";

describe("rank track math", () => {
  it("maps all 15 ladder ranks", () => {
    assert.equal(TRACK_RANKS.length, 15);
    assert.equal(TRACK_RANKS[0].name, "Wake");
    assert.equal(TRACK_RANKS[14].name, "Starwake");
    assert.equal(TRACK_RANKS[2].reward?.label, "2 bays");
    assert.equal(TRACK_RANKS[1].reward, undefined);
  });

  it("lays nodes left to right with growing gaps", () => {
    const nodes = layoutNodes();
    assert.equal(nodes.length, 15);
    for (let i = 1; i < nodes.length; i++) {
      assert.ok(nodes[i].x > nodes[i - 1].x, `node ${i}`);
      if (i >= 2) {
        const prev = nodes[i - 1].x - nodes[i - 2].x;
        const gap = nodes[i].x - nodes[i - 1].x;
        assert.ok(gap >= prev);
      }
    }
    assert.ok(trackWidth(nodes) > nodes[14].x);
  });

  it("places the marker by linear t between nodes", () => {
    const nodes = layoutNodes();
    const atWake = getProgressBetween(0);
    assert.equal(atWake.index, 0);
    assert.equal(atWake.t, 0);
    assert.equal(markerX(atWake, nodes), nodes[0].x);

    const mid = getProgressBetween(175);
    assert.equal(mid.index, 0);
    assert.equal(mid.t, 0.5);
    assert.equal(markerX(mid, nodes), lerp(nodes[0].x, nodes[1].x, 0.5));

    const runner = getProgressBetween(350);
    assert.equal(runner.index, 1);
    assert.equal(runner.t, 0);
    assert.equal(getRankForXp(350).name, "Runner");
  });

  it("clamps t and never walks past the cap", () => {
    assert.equal(clamp01(-2), 0);
    assert.equal(clamp01(2), 1);
    const cap = getProgressBetween(999_999);
    assert.equal(cap.index, 14);
    assert.equal(cap.t, 1);
    assert.equal(getRankForXp(999_999).name, "Starwake");
    assert.equal(xpIntoNext(180_000).next, null);
  });

  it("reports XP into the next rank", () => {
    const mid = xpIntoNext(500);
    assert.equal(mid.rank.name, "Runner");
    assert.equal(mid.next?.name, "Pilot");
    assert.equal(mid.have, 150);
    assert.equal(mid.need, 650);
  });
});
