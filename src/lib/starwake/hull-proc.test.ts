import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { TRAFFIC_HULLS } from "./hull-kit.ts";
import { buildProcHull, disposeProcHull, procVertexCount } from "./hull-proc.ts";

describe("procedural hulls", () => {
  it("builds a dense mesh for every hull", () => {
    for (const id of TRAFFIC_HULLS) {
      const solids = buildProcHull(id);
      const n = procVertexCount(solids);
      assert.ok(solids.length >= 4, id);
      assert.ok(n > 800, `${id} verts ${n}`);
      const kinds = new Set(solids.map((s) => s.kind));
      assert.ok(kinds.has("skin"), id);
      assert.ok(kinds.has("glow"), id);
      disposeProcHull(solids);
    }
  });

  it("courier needle has more verts than a primitive kit stack would", () => {
    const solids = buildProcHull("courier");
    assert.ok(procVertexCount(solids) > 2500);
    disposeProcHull(solids);
  });
});
