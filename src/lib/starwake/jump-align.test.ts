import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { HEAD_READY, jumpHead01, jumpLock01, lockBearing } from "./jump-align.ts";

describe("jump align", () => {
  it("head is 1 when the nose matches galactic bearing", () => {
    const from = { x: 0, y: 0 };
    const to = { x: 10, y: 0 };
    const bear = lockBearing(from, to);
    assert.ok(jumpHead01(bear, from, to) > 0.99);
    assert.ok(jumpHead01(bear + Math.PI, from, to) < 0.05);
    const mid = jumpHead01(bear + Math.PI / 2, from, to);
    assert.ok(mid > 0.45 && mid < 0.55);
  });

  it("head is 0 with no lock", () => {
    assert.equal(jumpHead01(0, null, { x: 1, y: 1 }), 0);
    assert.equal(jumpLock01({ locked: false, hop: true, t2ok: true }), 0);
  });

  it("lock fills hop then T2, never a fake 12", () => {
    assert.equal(jumpLock01({ locked: true, hop: false, t2ok: true }), 0.18);
    assert.equal(jumpLock01({ locked: true, hop: true, t2ok: false }), 0.55);
    assert.equal(jumpLock01({ locked: true, hop: true, t2ok: true }), 1);
    assert.ok(HEAD_READY > 0.5);
  });
});
