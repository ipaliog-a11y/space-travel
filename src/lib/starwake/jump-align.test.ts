import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { HEAD_READY, jumpHead01, jumpLock01, lockSky } from "./jump-align.ts";

describe("jump align", () => {
  it("head follows the nose vs the lock sky", () => {
    const from = { x: 0, y: 0 };
    const to = { x: 10, y: 0 };
    const sky = lockSky(from, to);
    assert.ok(sky);
    assert.ok(jumpHead01(sky, from, to) > 0.99);
    const back: [number, number, number] = [-sky[0], -sky[1], -sky[2]];
    assert.ok(jumpHead01(back, from, to) < 0.05);
    const side: [number, number, number] = [0, 0, 1];
    const mid = jumpHead01(side, from, to);
    assert.ok(mid > 0.2 && mid < 0.8);
  });

  it("head is 0 with no lock", () => {
    assert.equal(jumpHead01([0, 0, -1], null, { x: 1, y: 1 }), 0);
    assert.equal(jumpLock01({ locked: false, hop: true, t2ok: true, head01: 1 }), 0);
  });

  it("lock rides head when the hop is legal", () => {
    assert.equal(jumpLock01({ locked: true, hop: false, t2ok: true, head01: 0.9 }), 0.18);
    const on = jumpLock01({ locked: true, hop: true, t2ok: true, head01: 0.8 });
    assert.equal(on, 0.8);
    assert.ok(HEAD_READY > 0.5);
  });
});
