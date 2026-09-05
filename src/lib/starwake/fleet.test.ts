import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  CREW_BOND,
  CREW_CUT,
  CREW_UPKEEP,
  FLEET_CAP,
  crewNetFromPayout,
  dueCrews,
  dueRests,
  occupiedShipKeys,
  sanitizeCrew,
  spareShips,
  type Crew,
} from "./fleet.ts";

function crew(partial: Partial<Crew> = {}): Crew {
  return {
    id: "c1",
    hull: "courier",
    name: "Kite",
    hiredAt: 1000,
    shipKey: "ship-a",
    log: [],
    earned: 0,
    completed: 0,
    xp: 0,
    run: {
      job: {
        id: "j1",
        kind: "courier",
        title: "test",
        cargo: "scan plates",
        qty: 2,
        from: { systemId: "helion", stationId: "a" },
        to: { systemId: "helion", stationId: "b" },
      },
      startedAt: 1000,
      endsAt: 91_000,
      claimed: false,
      phase: "flight",
      flightSec: 90,
      dest: { systemId: "helion", stationId: "b" },
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

  it("marks a flight due only after eta, and rest separately", () => {
    const c = crew();
    assert.equal(dueCrews([c], 1000).length, 0);
    assert.equal(dueCrews([c], 91_000).length, 1);
    assert.equal(dueCrews([{ ...c, run: { ...c.run!, claimed: true } }], 91_000).length, 0);
    const pad = crew({
      run: { ...c.run!, phase: "rest", claimed: true, job: null, endsAt: 50_000 },
    });
    assert.equal(dueCrews([pad], 50_000).length, 0);
    assert.equal(dueRests([pad], 49_000).length, 0);
    assert.equal(dueRests([pad], 50_000).length, 1);
  });

  it("sanitize drops junk, caps at two, and fills xp from hauls", () => {
    const a = crew({ id: "a", name: "Kite" });
    const b = crew({ id: "b", hull: "hauler", name: "Latch", shipKey: "ship-b" });
    const out = sanitizeCrew([a, b, { ...a, id: "c" }, { hull: "scout" }, null]);
    assert.equal(out.length, 2);
    assert.equal(out[0].id, "a");
    assert.equal(out[1].hull, "hauler");
    assert.equal(out[0].shipKey, "ship-a");
    assert.equal(out[0].xp, 0);
  });

  it("needs a spare hull besides the one you fly", () => {
    const one = [{ id: "a", shipType: "courier" }];
    assert.equal(spareShips(one, []).length, 0);

    const two = [
      { id: "a", shipType: "courier" },
      { id: "b", shipType: "hauler" },
    ];
    const free = spareShips(two, []);
    assert.equal(free.length, 2);

    const assigned = spareShips(two, [crew({ shipKey: "b", hull: "hauler" })]);
    assert.equal(assigned.length, 0);

    const three = [...two, { id: "c", shipType: "scout" }];
    const afterOne = spareShips(three, [crew({ shipKey: "b", hull: "hauler" })]);
    assert.deepEqual(
      afterOne.map((s) => s.id),
      ["a"],
    );
  });

  it("treats a crew with no shipKey as occupying a matching hull", () => {
    const ships = [
      { id: "a", shipType: "courier" },
      { id: "b", shipType: "hauler" },
      { id: "c", shipType: "scout" },
    ];
    const used = occupiedShipKeys([crew({ shipKey: "", hull: "courier" })], ships);
    assert.equal(used.has("a"), true);
    assert.equal(spareShips(ships, [crew({ shipKey: "", hull: "courier" })]).some((s) => s.id === "a"), false);
  });
});
