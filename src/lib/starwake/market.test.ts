import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  addCargo,
  cargoAvg,
  cargoOf,
  cargoPaid,
  cargoQty,
  pullCargo,
  GOODS,
  HUB_LISTINGS,
  hubListings,
  KIND_BAND,
  KINDS,
  quoteGood,
  quoteHistory,
  shockLive,
  shockMul,
  sparkPath,
  takeCargo,
  trendDelta,
  markHold,
  markTotal,
  MARKET_HISTORY,
  sanitizeCargo,
} from "./market.ts";

describe("market quotes", () => {
  it("is the same ₡ everywhere on a given tick", () => {
    assert.equal(quoteGood("ore", 100), quoteGood("ore", 100));
    assert.equal(quoteGood("film", 40), quoteGood("film", 40));
  });

  it("moves over time so holding is play", () => {
    const prices = Array.from({ length: 16 }, (_, i) => quoteGood("cores", 20 + i));
    assert.ok(new Set(prices).size > 1);
  });

  it("walks randomly instead of a sine", () => {
    const hist = quoteHistory("cores", 200);
    const diffs = hist.slice(1).map((v, i) => v - hist[i]);
    assert.ok(diffs.some((d) => d > 0));
    assert.ok(diffs.some((d) => d < 0));
    const flips = diffs
      .slice(1)
      .filter((d, i) => d !== 0 && diffs[i] !== 0 && Math.sign(d) !== Math.sign(diffs[i])).length;
    assert.ok(flips >= 3, `tape should jitter, got ${flips} reversals`);
  });

  it("keeps a history window for the tape", () => {
    const hist = quoteHistory("grain", 80);
    assert.equal(hist.length, MARKET_HISTORY);
    assert.equal(hist[hist.length - 1], quoteGood("grain", 80));
    assert.equal(hist[0], quoteGood("grain", 80 - (MARKET_HISTORY - 1)));
  });

  it("sparks a path and a signed trend", () => {
    const up = [10, 12, 14, 18];
    const down = [18, 14, 12, 10];
    assert.ok(sparkPath(up).startsWith("M"));
    assert.ok(trendDelta(up) > 0);
    assert.ok(trendDelta(down) < 0);
  });

  it("lists forty goods in four kinds", () => {
    assert.equal(GOODS.length, 40);
    for (const kind of KINDS) {
      assert.equal(GOODS.filter((g) => g.kind === kind).length, 10);
    }
  });

  it("keeps category bases in band, harvest under parts", () => {
    const ofKind = (kind: (typeof KINDS)[number]) => GOODS.filter((g) => g.kind === kind);
    for (const kind of KINDS) {
      const band = KIND_BAND[kind];
      for (const g of ofKind(kind)) {
        assert.ok(g.base >= band.min && g.base <= band.max, `${g.id} ${g.base} outside ${kind}`);
      }
    }
    const min = (kind: (typeof KINDS)[number]) => Math.min(...ofKind(kind).map((g) => g.base));
    const max = (kind: (typeof KINDS)[number]) => Math.max(...ofKind(kind).map((g) => g.base));
    assert.ok(min("raw") < min("refined"));
    assert.ok(min("refined") < min("tech"));
    assert.ok(max("raw") < min("tech"));
    assert.ok(max("refined") < max("tech"));
    assert.ok(min("consumable") > min("raw"));
    assert.ok(max("consumable") < max("tech"));
  });

  it("prices processing chains above their feedstock", () => {
    const base = Object.fromEntries(GOODS.map((g) => [g.id, g.base]));
    assert.ok(base.hydrogen < base.reaction);
    assert.ok(base.hydrogen < base.lh2);
    assert.ok(base.ice < base.water);
    assert.ok(base.water < base.oxygen);
    assert.ok(base.grain < base.food);
    assert.ok(base.water < base.food);
    assert.ok(base.ore < base.steel);
    assert.ok(base.steel < base.alloys);
    assert.ok(base.alloys < base.titanium);
    assert.ok(base["copper-ore"] < base.copper);
    assert.ok(base.copper < base.batteries);
    assert.ok(base.silicates < base.glass);
    assert.ok(base.carbon < base.plastics);
    assert.ok(base.crude < base.plastics);
    assert.ok(base.plastics < base.polymers);
    assert.ok(base["rare-earths"] < base.chips);
    assert.ok(base.batteries < base.chips);
    assert.ok(base.spares < base.machinery);
    assert.ok(base.machinery < base.robotics);
    assert.ok(base.optics < base.film);
    assert.ok(base.chips < base.cores);
    assert.ok(base.cores < base.robotics);
    assert.ok(base.helium3 < base.cores);
    assert.ok(base.medicine < base.cores);
    assert.ok(base.luxuries < base.weapons);
    assert.ok(base.weapons < base.prototype);
    assert.ok(base.food < base.seed);
    assert.ok(base.stimulants < base.medicine);
    assert.ok(base.lh2 < base.helium3);
  });

  it("shocks one good on the same galaxy tape", () => {
    let hit: { tick: number; id: (typeof GOODS)[number]["id"] } | null = null;
    for (let t = 0; t < 240; t++) {
      const live = shockLive(t);
      if (live) {
        hit = { tick: t, id: live.goodId };
        break;
      }
    }
    assert.ok(hit);
    const mul = shockMul(hit.id, hit.tick);
    assert.ok(mul !== 1);
    assert.equal(quoteGood(hit.id, hit.tick), quoteGood(hit.id, hit.tick));
    assert.ok(quoteGood(hit.id, hit.tick) >= 1);
  });
});

describe("hub listings", () => {
  it("gives each lock eight unique goods", () => {
    const a = hubListings("helion:st-a");
    assert.equal(a.length, HUB_LISTINGS);
    assert.equal(new Set(a).size, HUB_LISTINGS);
  });

  it("is stable for a hub and differs across hubs", () => {
    assert.deepEqual(hubListings("helion:st-a"), hubListings("helion:st-a"));
    const a = hubListings("helion:st-a").join(",");
    const b = hubListings("vega:st-b").join(",");
    assert.notEqual(a, b);
  });
});

describe("owned cargo", () => {
  it("merges lots and refuses a short sell", () => {
    const hold = addCargo(addCargo([], "ore", 2), "ore", 3);
    assert.equal(cargoOf(hold, "ore"), 5);
    assert.equal(cargoQty(hold), 5);
    assert.equal(takeCargo(hold, "ore", 6), null);
    assert.equal(cargoQty(takeCargo(hold, "ore", 2) ?? []), 3);
  });

  it("drops unknown goods on sanitize", () => {
    const hold = sanitizeCargo([
      { goodId: "ore", qty: 4 },
      { goodId: "nope", qty: 9 },
      { goodId: "ice", qty: 0 },
    ]);
    assert.equal(cargoQty(hold), 4);
    assert.equal(hold.length, 1);
  });

  it("shares hold space with a loaded job", () => {
    const hold = addCargo([], "ore", 3);
    assert.equal(4 + cargoQty(hold), 7);
  });

  it("averages cost across buys at different ticks", () => {
    const hold = addCargo(addCargo([], "ore", 2, 20), "ore", 2, 40);
    assert.equal(cargoOf(hold, "ore"), 4);
    assert.equal(cargoPaid(hold, "ore"), 60);
    assert.equal(cargoAvg(hold, "ore"), 15);
    const pulled = pullCargo(hold, "ore", 2);
    assert.ok(pulled);
    assert.equal(pulled.paid, 30);
    assert.equal(cargoAvg(pulled.hold, "ore"), 15);
  });

  it("keeps unknown paid as zero on sanitize", () => {
    const hold = sanitizeCargo([{ goodId: "ice", qty: 3 }]);
    assert.equal(cargoPaid(hold, "ice"), 0);
    assert.equal(cargoAvg(hold, "ice"), 0);
  });

  it("marks warehouse paper profit without selling", () => {
    const unit = quoteGood("ore", 40);
    const lots = markHold(addCargo(addCargo([], "ore", 2, 10), "ice", 1, 0), 40);
    const tot = markTotal(lots);
    const ore = lots.find((l) => l.goodId === "ore");
    assert.ok(ore);
    assert.equal(ore.pnl, unit * 2 - 10);
    assert.equal(tot.qty, 3);
    assert.ok(tot.mark > 0);
  });
});
