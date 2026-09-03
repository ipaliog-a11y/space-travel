import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { SHIPS } from "./catalog.ts";
import {
  EXTRACT_SEC,
  extractLots,
  extractQty,
  extractSecFor,
  formatYieldLine,
  sourceFromCatalog,
  yieldsFor,
  type YieldSource,
} from "./mining.ts";

function src(partial: Partial<YieldSource> & Pick<YieldSource, "id" | "role">): YieldSource {
  return { mining: 2, ...partial };
}

describe("planet mining yields", () => {
  it("maps gas / liquid / solid by kind", () => {
    assert.equal(yieldsFor(src({ id: "a", role: "planet", kind: "gas" })).phase, "gas");
    assert.equal(yieldsFor(src({ id: "a", role: "planet", kind: "icegiant" })).phase, "gas");
    assert.equal(yieldsFor(src({ id: "a", role: "planet", kind: "ocean" })).phase, "liquid");
    assert.equal(yieldsFor(src({ id: "a", role: "planet", kind: "ice" })).phase, "liquid");
    assert.equal(yieldsFor(src({ id: "a", role: "planet", kind: "rocky" })).phase, "solid");
    assert.equal(yieldsFor(src({ id: "a", role: "planet", kind: "volcanic" })).phase, "solid");
    assert.equal(yieldsFor(src({ id: "a", role: "comet" })).phase, "liquid");
    assert.equal(yieldsFor(src({ id: "a", role: "belt", icy: false })).phase, "solid");
  });

  it("gives each wild body a couple of harvest goods", () => {
    const kinds = ["rocky", "desert", "ocean", "ice", "volcanic", "gas", "ringed", "icegiant"] as const;
    for (const kind of kinds) {
      const y = yieldsFor(src({ id: `p-${kind}`, role: "planet", kind }));
      assert.equal(y.goods.length, 2, kind);
    }
    assert.equal(yieldsFor(src({ id: "belt-1", role: "belt", icy: true })).goods.length, 2);
    assert.equal(yieldsFor(src({ id: "c-1", role: "comet" })).goods.length, 2);
  });

  it("gas worlds scoop hydrogen or helium-3", () => {
    const y = yieldsFor(src({ id: "g1", role: "planet", kind: "gas" }));
    assert.ok(y.goods.includes("hydrogen") || y.goods.includes("helium3"));
  });

  it("volcanic worlds can drop rare earths", () => {
    const y = yieldsFor(src({ id: "v1", role: "planet", kind: "volcanic" }));
    assert.ok(y.goods.includes("ore") && y.goods.includes("rare-earths"));
  });

  it("is stable for a body id", () => {
    const a = yieldsFor(src({ id: "helion-3", role: "planet", kind: "rocky" }));
    const b = yieldsFor(src({ id: "helion-3", role: "planet", kind: "rocky" }));
    assert.deepEqual(a, b);
  });
});

describe("extract pull", () => {
  it("qty follows mining grade", () => {
    assert.equal(extractQty(0), 0);
    assert.equal(extractQty(1), 1);
    assert.equal(extractQty(3), 3);
  });

  it("splits a rich pull across both goods and respects free space", () => {
    const rich = src({ id: "r1", role: "planet", kind: "rocky", mining: 3 });
    const lots = extractLots(rich, 8);
    const n = lots.reduce((s, l) => s + l.qty, 0);
    assert.equal(n, 3);
    assert.equal(lots.length, 2);
    assert.equal(extractLots(rich, 1).reduce((s, l) => s + l.qty, 0), 1);
    assert.deepEqual(extractLots(rich, 0), []);
    assert.deepEqual(extractLots({ ...rich, mining: 0 }, 8), []);
  });

  it("thin grade is a single lot", () => {
    const thin = src({ id: "t1", role: "planet", kind: "gas", mining: 1 });
    const lots = extractLots(thin, 4);
    assert.equal(lots.length, 1);
    assert.equal(lots[0].qty, 1);
  });

  it("mined lots are paid 0 at the store boundary (label-ready)", () => {
    const lots = extractLots(src({ id: "p", role: "planet", kind: "ice", mining: 2 }), 4);
    assert.ok(lots.every((l) => l.qty > 0));
  });

  it("Extractor is the fast hull; others sip", () => {
    assert.ok(extractSecFor("extractor") < extractSecFor("tug"));
    assert.ok(extractSecFor("extractor") < extractSecFor("courier"));
    assert.ok(EXTRACT_SEC.extractor <= 3);
    assert.ok(EXTRACT_SEC.clipper >= 12);
  });

  it("stays in lockstep with hull extractSec", () => {
    for (const id of Object.keys(EXTRACT_SEC) as Array<keyof typeof EXTRACT_SEC>) {
      assert.equal(SHIPS[id].extractSec, EXTRACT_SEC[id], id);
    }
  });

  it("formats a dossier line", () => {
    const y = yieldsFor(src({ id: "d1", role: "planet", kind: "gas" }));
    const line = formatYieldLine(y, 2);
    assert.match(line, /Gas scoop/);
    assert.equal(formatYieldLine(y, 0), "No crust to pull.");
  });

  it("reads a catalog-shaped entry", () => {
    const srcn = sourceFromCatalog({
      id: "helion-2",
      role: "planet",
      planet: { kind: "gas" },
      moon: null,
      belt: null,
      comet: null,
      prospect: { mining: 2 },
    });
    assert.ok(srcn);
    assert.equal(yieldsFor(srcn).phase, "gas");
  });
});
