import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { applyWearToShip, fittedShip, MODULES, moduleFitCost, SHIPS, SLOT_FIT_COST } from "./catalog.ts";
import { hubBoard, jobLeavesHub } from "./job-hub.ts";
import { diaryEarnings, jobIsRetired, logDelivery, retireContract, retireJob } from "./job-log.ts";
import { jobPayoutFor, JUMP_LY_AS_AU } from "./job-pay.ts";
import { HARDPOINT_COSTS, repairCreditCost, WEAR_RATES } from "../ship-ownership/types.ts";
import type { CargoJob } from "./types.ts";

function job(partial: Partial<CargoJob> = {}): CargoJob {
  return {
    id: "j1",
    kind: "courier",
    title: "test",
    cargo: "scan plates",
    qty: 4,
    from: { systemId: "helion", stationId: "a" },
    to: { systemId: "helion", stationId: "b" },
    ...partial,
  };
}

describe("wear on fitted hull", () => {
  it("leaves stock stats alone at 0 penalty", () => {
    const stock = fittedShip("courier");
    const live = applyWearToShip(stock, 0);
    assert.equal(live, stock);
  });

  it("cuts turn, cruise, overdrive, and jump at critical (25%)", () => {
    const stock = fittedShip("courier");
    const live = applyWearToShip(stock, 0.25);
    assert.ok(live.turnRate < stock.turnRate);
    assert.ok(live.cruiseSpeed < stock.cruiseSpeed);
    assert.ok(live.overdriveSpeed < stock.overdriveSpeed);
    assert.ok(live.jumpRangeLy < stock.jumpRangeLy);
    assert.ok(live.fsdChargeSec > stock.fsdChargeSec);
    assert.ok(live.coolSec > stock.coolSec);
    assert.equal(live.cargoCap, stock.cargoCap);
    assert.equal(live.fuelCap, stock.fuelCap);
    assert.equal(live.fuelCap2, stock.fuelCap2);
    assert.ok(Math.abs(live.cruiseSpeed - stock.cruiseSpeed * 0.75) < 0.02);
  });

  it("clamps penalty to 25%", () => {
    const stock = fittedShip("courier");
    const a = applyWearToShip(stock, 0.25);
    const b = applyWearToShip(stock, 9);
    assert.equal(a.cruiseSpeed, b.cruiseSpeed);
  });
});

describe("travel feel speeds", () => {
  it("is ~2x stock cruise and overdrive", () => {
    assert.equal(SHIPS.courier.cruiseSpeed, 12.8);
    assert.equal(SHIPS.courier.overdriveSpeed, 108);
    assert.equal(SHIPS.hauler.cruiseSpeed, 8.4);
    assert.equal(SHIPS.hauler.overdriveSpeed, 76);
    assert.equal(SHIPS.clipper.cruiseSpeed, 15.6);
    assert.equal(SHIPS.clipper.overdriveSpeed, 132);
    assert.equal(SHIPS.tender.cruiseSpeed, 9.2);
    assert.equal(SHIPS.tug.overdriveSpeed, 84);
  });
});

describe("job payout", () => {
  it("scales linearly with cargo mass", () => {
    const light = jobPayoutFor(job({ kind: "courier", qty: 2 }), { au: 1, ly: 0 });
    const heavy = jobPayoutFor(job({ kind: "courier", qty: 6 }), { au: 1, ly: 0 });
    assert.equal(heavy, light * 3);
  });

  it("scales linearly with haul distance", () => {
    const near = jobPayoutFor(job({ kind: "courier", qty: 4 }), { au: 1, ly: 0 });
    const far = jobPayoutFor(job({ kind: "courier", qty: 4 }), { au: 2, ly: 0 });
    const hop = jobPayoutFor(job({ kind: "courier", qty: 4 }), { au: 0, ly: 8 });
    assert.equal(far, near * 2);
    assert.equal(near, 880);
    assert.equal(JUMP_LY_AS_AU, 0.3);
    assert.equal(hop, 2112);
  });

  it("pays a 1 AU 4u courier enough to cover a typical lock-to-lock repair", () => {
    const paid = jobPayoutFor(job({ kind: "courier", qty: 4 }), { au: 1, ly: 0 });
    const wear =
      WEAR_RATES.normal_flight * 3 +
      WEAR_RATES.docking * 2;
    const repair = repairCreditCost(wear);
    assert.ok(repair < paid, `repair ₡${repair} should be under payout ₡${paid}`);
  });

  it("pays extractor pulls by haul AU, not pad-to-pad", () => {
    const paid = jobPayoutFor(job({ kind: "extractor", qty: 2, haulAu: 1.2 }), { au: 1.2, ly: 0 });
    assert.equal(paid, Math.round(2 * 1.2 * 72));
  });
});

describe("hangar fit costs", () => {
  it("stock modules are free; alts sit near Rel Mk I", () => {
    assert.equal(moduleFitCost(MODULES["c-thr-stock"]), 0);
    const rcs = moduleFitCost(MODULES["c-thr-snap"]);
    const fsd = moduleFitCost(MODULES["c-fsd-far"]);
    assert.ok(rcs >= 4000, `RCS alt ₡${rcs} should be Rel-scale`);
    assert.ok(fsd > rcs);
    assert.ok(fsd <= 15000, `FSD alt ₡${fsd} should stay at or under Mk II`);
    assert.ok(SLOT_FIT_COST.thruster >= HARDPOINT_COSTS.mk1 * 0.5);
    assert.ok(SLOT_FIT_COST.fsd <= HARDPOINT_COSTS.mk2);
  });
});

describe("job diary", () => {
  it("keeps a finished job out of circulation", () => {
    const retired = retireJob(retireJob([], "job-a"), "job-b");
    assert.deepEqual(retired, ["job-a", "job-b"]);
    assert.deepEqual(retireJob(retired, "job-a"), ["job-a", "job-b"]);
  });

  it("retires the same cargo and route even if the listing id changes", () => {
    const haul = job({ id: "job-a" });
    const retired = retireContract([], haul);
    const twin = job({ id: "job-z" });
    assert.ok(jobIsRetired(haul, retired));
    assert.ok(jobIsRetired(twin, retired));
    assert.equal(jobIsRetired(job({ id: "job-other", cargo: "ore", qty: 16 }), retired), false);
  });

  it("records pay and sums earnings without duplicating a haul", () => {
    const haul = job();
    const first = logDelivery([], haul, 880, "courier", 1);
    assert.equal(first[0].pay, 880);
    assert.equal(diaryEarnings(first), 880);
    const again = logDelivery(first, haul, 880, "courier", 2);
    assert.equal(again.length, 1);
    assert.equal(again[0].at, 2);
  });
});

describe("hub board", () => {
  it("keeps hauls that leave this lock and drops the rest", () => {
    const here = { systemId: "helion", stationId: "st-a" };
    const other = { systemId: "helion", stationId: "st-b" };
    const far = { systemId: "vega", stationId: "st-v" };
    const local = job({ from: here, to: other });
    const hop = job({ from: here, to: far });
    const inbound = job({ from: other, to: here });
    const elsewhere = job({ from: far, to: other });
    const board = hubBoard([local, hop, inbound, elsewhere], "helion", "st-a");
    assert.equal(board.length, 2);
    assert.ok(board.every((j) => jobLeavesHub(j.from, j.to, "helion", "st-a")));
  });
});
