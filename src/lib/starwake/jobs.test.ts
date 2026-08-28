import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { applyWearToShip, fittedShip, MODULES, moduleFitCost, SLOT_FIT_COST } from "./catalog.ts";
import { jobPayoutFor } from "./job-pay.ts";
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
    assert.ok(Math.abs(live.cruiseSpeed - stock.cruiseSpeed * 0.75) < 0.02);
  });

  it("clamps penalty to 25%", () => {
    const stock = fittedShip("courier");
    const a = applyWearToShip(stock, 0.25);
    const b = applyWearToShip(stock, 9);
    assert.equal(a.cruiseSpeed, b.cruiseSpeed);
  });
});

describe("job payout", () => {
  it("pays at least ₡1,000 for a local courier lock-to-lock", () => {
    const paid = jobPayoutFor(job({ kind: "courier", qty: 4 }));
    assert.ok(paid >= 1000);
    assert.ok(paid <= 4000);
  });

  it("pays more for a heavier hold of the same kind", () => {
    const light = jobPayoutFor(job({ kind: "courier", qty: 2 }), 0);
    const heavy = jobPayoutFor(job({ kind: "courier", qty: 6 }), 0);
    const hop = jobPayoutFor(job({ kind: "courier", qty: 4 }), 8);
    assert.ok(heavy > light);
    assert.ok(hop > jobPayoutFor(job({ kind: "courier", qty: 4 }), 0));
  });

  it("four typical courier deliveries from ₡1,000 fund Mk I", () => {
    const start = 1000;
    const mk1 = 5000;
    const paid = jobPayoutFor(job({ kind: "courier", qty: 4 }));
    assert.ok(start + paid * 4 >= mk1, `4× ${paid} from ${start} should reach ${mk1}`);
  });

  it("one courier job covers a typical lock-to-lock repair", () => {
    const paid = jobPayoutFor(job({ kind: "courier", qty: 4 }));
    const wear =
      WEAR_RATES.normal_flight * 3 +
      WEAR_RATES.docking * 2;
    const repair = repairCreditCost(wear);
    assert.ok(repair < paid, `repair ₡${repair} should be under payout ₡${paid}`);
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
