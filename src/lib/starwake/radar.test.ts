import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { projectRadar } from "./radar.ts";

describe("heading-up radar", () => {
  const ship = { x: 0, y: 0, z: 0 };

  it("puts a body ahead of the ship on the top of the disc", () => {
    // headingYaw 0 → forward is -Z
    const blips = projectRadar(
      [{ id: "a", kind: "planet", x: 0, y: 0, z: -40 }],
      ship,
      0,
      80,
      null,
    );
    assert.equal(blips.length, 1);
    assert.ok(blips[0].v > 0.4, `forward v=${blips[0].v}`);
    assert.ok(Math.abs(blips[0].u) < 0.08);
  });

  it("moves the blip when the ship yaws", () => {
    const src = [{ id: "a", kind: "planet" as const, x: 0, y: 0, z: -40 }];
    const ahead = projectRadar(src, ship, 0, 80, null)[0];
    const turned = projectRadar(src, ship, Math.PI / 2, 80, null)[0];
    assert.ok(ahead.v > 0.3);
    assert.ok(turned.u > 0.3, `yaw +90 puts former-ahead to the right, u=${turned.u}`);
  });

  it("marks the lock and keeps the star off the ship hub", () => {
    const blips = projectRadar(
      [
        { id: "star", kind: "star", x: 80, y: 0, z: 0 },
        { id: "p", kind: "planet", x: 10, y: 4, z: -10 },
      ],
      ship,
      0,
      120,
      "p",
    );
    const p = blips.find((b) => b.id === "p");
    const star = blips.find((b) => b.id === "star");
    assert.equal(p?.lock, true);
    assert.ok(star && Math.hypot(star.u, star.v) > 0.05);
  });
});
