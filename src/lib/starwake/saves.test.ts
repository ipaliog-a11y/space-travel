import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { jumpT2Cost, refuelQuote, SHIPS, T1_CREDIT_PER_UNIT, T2_CHARGE, T2_CREDIT_PER_UNIT } from "./catalog.ts";
import { emptySlot, migrateSlots } from "./saves.ts";

describe("save slots", () => {
  it("folds a v13 blob into slot 1 and leaves 2 and 3 empty", () => {
    const { activeSlotId, slots } = migrateSlots({
      version: 13,
      shipId: "hauler",
      systemId: "vega",
      hasSave: true,
      scanned: { "vega-0": true },
      fuel: { hauler: 40 },
    });
    assert.equal(activeSlotId, "1");
    assert.equal(slots["1"].shipId, "hauler");
    assert.equal(slots["1"].systemId, "vega");
    assert.equal(slots["1"].hasSave, true);
    assert.equal(slots["1"].fuel.hauler, 40);
    assert.ok(slots["1"].fuel2.hauler > 0);
    assert.equal(slots["2"].hasSave, false);
    assert.equal(slots["3"].hasSave, false);
    assert.equal(slots["2"].shipId, "courier");
    assert.deepEqual(slots["1"].cargo.hauler, []);
    assert.deepEqual(slots["1"].warehouses, {});
  });

  it("reads named slots when present", () => {
    const two = emptySlot("2");
    two.hasSave = true;
    two.shipId = "scout";
    const { activeSlotId, slots } = migrateSlots({
      activeSlotId: "2",
      slots: { "1": emptySlot("1"), "2": two, "3": emptySlot("3") },
    });
    assert.equal(activeSlotId, "2");
    assert.equal(slots["2"].shipId, "scout");
  });
});

describe("T2 jump fuel", () => {
  it("courier sips; hauler carries more", () => {
    assert.ok(SHIPS.courier.fuelCap2 < SHIPS.hauler.fuelCap2);
    assert.ok(SHIPS.clipper.fuelCap2 < SHIPS.courier.fuelCap2);
    assert.ok(SHIPS.tender.fuelCap2 >= SHIPS.hauler.fuelCap2);
  });

  it("charges a floor plus ly, then a charge sip", () => {
    const short = jumpT2Cost(2);
    const long = jumpT2Cost(12);
    assert.ok(short >= T2_CHARGE + 1.4);
    assert.ok(long > short);
    assert.equal(jumpT2Cost(12), +(T2_CHARGE + 12 * 0.22).toFixed(2));
  });
});

describe("fuel prices", () => {
  it("quotes T1 cheaper than T2", () => {
    const q = refuelQuote(10, 4);
    assert.equal(q.cost, 10 * T1_CREDIT_PER_UNIT + 4 * T2_CREDIT_PER_UNIT);
    assert.ok(T2_CREDIT_PER_UNIT > T1_CREDIT_PER_UNIT);
  });
});
