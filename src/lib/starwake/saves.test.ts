import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { jumpT2Cost, refuelQuote, SHIPS, STARTER_HULLS, T1_CREDIT_PER_UNIT, T2_CHARGE, T2_CREDIT_PER_UNIT } from "./catalog.ts";
import { emptySlot, firstEmptySlotId, firstOccupiedSlotId, migrateSlots, snapshotFromUnknown } from "./saves.ts";

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

  it("keeps a career on a slot and names it from the call sign", () => {
    const raw = emptySlot("1");
    raw.hasSave = true;
    raw.career = { displayName: "Iona Vale", callSign: "WAKE", iconId: "pilot-02" };
    const slot = snapshotFromUnknown(raw, emptySlot("1"));
    assert.equal(slot.name, "WAKE");
    assert.equal(slot.career?.callSign, "WAKE");
    assert.equal(slot.career?.iconId, "pilot-02");
    assert.equal(slot.hasSave, true);
  });

  it("drops stub Pilot/PILOT careers", () => {
    const raw = emptySlot("1");
    raw.career = { displayName: "Pilot", callSign: "PILOT", iconId: "pilot-01" };
    const slot = snapshotFromUnknown(raw, emptySlot("1"));
    assert.equal(slot.career, null);
  });

  it("picks the first empty slot and the first occupied slot", () => {
    const one = emptySlot("1");
    one.hasSave = true;
    one.career = { displayName: "Iona", callSign: "WAKE", iconId: "pilot-01" };
    const slots = { "1": one, "2": emptySlot("2"), "3": emptySlot("3") };
    assert.equal(firstEmptySlotId(slots), "2");
    assert.equal(firstEmptySlotId(slots, "3"), "3");
    assert.equal(firstOccupiedSlotId(slots), "1");
    assert.equal(firstOccupiedSlotId(slots, "1"), null);
  });

  it("moves active off an empty slot onto an occupied one", () => {
    const two = emptySlot("2");
    two.hasSave = true;
    two.career = { displayName: "Iona", callSign: "WAKE", iconId: "pilot-01" };
    const { activeSlotId } = migrateSlots({
      activeSlotId: "1",
      slots: { "1": emptySlot("1"), "2": two, "3": emptySlot("3") },
    });
    assert.equal(activeSlotId, "2");
  });
});

describe("home system", () => {
  it("new slots start at helion (Helios)", () => {
    assert.equal(emptySlot("1").systemId, "helion");
    assert.equal(emptySlot("1").career, null);
    assert.equal(emptySlot("1").hasSave, false);
  });
});

describe("starter hulls", () => {
  it("offers courier, hauler, scout", () => {
    assert.deepEqual(STARTER_HULLS, ["courier", "hauler", "scout"]);
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
