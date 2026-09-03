import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { HULL_PAINT, layoutHull, TRAFFIC_HULLS } from "./hull-kit.ts";
import type { ShipId } from "./types.ts";

describe("hull kit", () => {
  it("lays out every hull at each lod", () => {
    for (const id of TRAFFIC_HULLS) {
      const silhouette = layoutHull(id, 0);
      const close = layoutHull(id, 1);
      const bay = layoutHull(id, 2);
      assert.ok(silhouette.length >= 6, id);
      assert.ok(close.length >= silhouette.length, id);
      assert.ok(bay.length >= close.length, id);
      assert.ok(silhouette.every((p) => p.s[0] > 0 && p.s[1] > 0 && p.s[2] > 0), id);
    }
  });

  it("gives each hull its own paint", () => {
    const seen = new Set<string>();
    for (const id of Object.keys(HULL_PAINT) as ShipId[]) {
      const key = HULL_PAINT[id].skin.join(",");
      assert.equal(seen.has(key), false, id);
      seen.add(key);
    }
  });

  it("courier is a needle, hauler is a brick", () => {
    const c = layoutHull("courier", 2);
    const h = layoutHull("hauler", 2);
    const cSpan = Math.max(...c.map((p) => Math.abs(p.p[0]) + p.s[1] * 0.5));
    const hWidth = Math.max(...h.map((p) => p.s[2]));
    assert.ok(cSpan > 2.2);
    assert.ok(hWidth > 1.0);
    assert.ok(h.some((p) => p.color[0] > 0.7 && p.color[1] < 0.55));
  });

  it("extractor has a forward scoop", () => {
    const e = layoutHull("extractor", 2);
    assert.ok(e.some((p) => p.mesh === "cone" && p.p[0] > 1.4));
    assert.ok(e.some((p) => p.mesh === "torus"));
  });
});
