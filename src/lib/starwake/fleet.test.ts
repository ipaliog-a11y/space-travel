import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  CREW_BOND,
  CREW_CUT,
  CREW_UPKEEP,
  FLEET_CAP,
  crewNetFromPayout,
  dueCrews,
  sanitizeCrew,
  type Crew,
} from "./fleet.ts";

function crew(partial: Partial<Crew> = {}): Crew {
  return {
    id: "c1",
    hull: "courier",
    name: "Kite",
    hiredAt: 1000,
    run: {
      job: {
        id: "j1",
        kind: "courier",
        title: "test",
        cargo: "scan plates",
        qty: 4,
        from: { systemId: "helion", stationId: "a" },
        to: { systemId: "helion", stationId: "b" },
      },
      startedAt: 1000,
      endsAt: 91_000,
      claimed: false,
    },
    ...partial,
  };
}

describe("fleet crews", () => {
  it("caps the line at two and prices a bond", () => {
    assert.equal(FLEET_CAP, 2);
    assert.equal(CREW_BOND.courier, 6000);
    assert.equal(CREW_BOND.hauler, 9000);
  });

  it("pays a cut minus upkeep, still below a player local courier", () => {
    const net = crewNetFromPayout(880, "courier");
    assert.equal(net, Math.max(12, Math.round(880 * CREW_CUT) - CREW_UPKEEP.courier));
    assert.ok(net >= 12);
    assert.ok(net < 880 * 0.7);
  });

  it("hauler upkeep is heavier than courier", () => {
    assert.ok(CREW_UPKEEP.hauler > CREW_UPKEEP.courier);
    assert.ok(crewNetFromPayout(900, "hauler") < crewNetFromPayout(900, "courier"));
  });

  it("marks a run due only after eta", () => {
    const c = crew();
    assert.equal(dueCrews([c], 1000).length, 0);
    assert.equal(dueCrews([c], 91_000).length, 1);
    assert.equal(dueCrews([{ ...c, run: { ...c.run!, claimed: true } }], 91_000).length, 0);
  });

  it("sanitize drops junk and caps at two", () => {
    const a = crew({ id: "a", name: "Kite" });
    const b = crew({ id: "b", hull: "hauler", name: "Latch" });
    const out = sanitizeCrew([a, b, { ...a, id: "c" }, { hull: "scout" }, null]);
    assert.equal(out.length, 2);
    assert.equal(out[0].id, "a");
    assert.equal(out[1].hull, "hauler");
  });
});
