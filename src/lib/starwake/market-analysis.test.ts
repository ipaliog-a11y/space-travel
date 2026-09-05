import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { nearestListed, tapeMovers, waitDumpHint, waitOrDump, type TapeMove } from "./market-analysis.ts";

function row(id: TapeMove["goodId"], delta: number, unit = 10): TapeMove {
  return { goodId: id, delta, unit };
}

describe("tape movers", () => {
  it("picks the biggest up and down without mixing signs", () => {
    const { up, down } = tapeMovers([
      row("ore", 4),
      row("ice", -2),
      row("steel", 9),
      row("film", -7),
      row("grain", 0),
      row("cores", 1),
    ], 2);
    assert.deepEqual(up.map((r) => r.goodId), ["steel", "ore"]);
    assert.deepEqual(down.map((r) => r.goodId), ["film", "ice"]);
  });
});

describe("wait or dump", () => {
  it("sits a rising tape and dumps a falling one", () => {
    assert.equal(waitOrDump(3, 2), "hold");
    assert.equal(waitOrDump(-1, 2), "dump");
    assert.equal(waitOrDump(-4, 0), "flat");
    assert.equal(waitOrDump(0, 4), "flat");
  });

  it("names a listed lock on dump, never a price", () => {
    const hop = {
      systemId: "vega",
      stationId: "a",
      system: "Vega",
      station: "Latch",
      key: "vega:a",
      ly: 4.2,
    };
    assert.match(waitDumpHint("dump", hop), /Latch/);
    assert.match(waitDumpHint("dump", hop), /4\.2 ly/);
    assert.equal(waitDumpHint("hold", hop), "Tape is up. Sit it.");
    assert.equal(waitDumpHint("dump", null), "Tape is down. No lock lists it.");
  });
});

describe("nearest listed lock", () => {
  it("puts the current system first, then shorter hops", () => {
    const hops = nearestListed(
      [
        { systemId: "vega", stationId: "a", system: "Vega", station: "Far", key: "vega:a" },
        { systemId: "helion", stationId: "b", system: "Helion", station: "Home", key: "helion:b" },
        { systemId: "nyx", stationId: "a", system: "Nyx", station: "Near", key: "nyx:a" },
      ],
      "helion",
      (from, to) => (to === "nyx" ? 2 : to === "vega" ? 9 : from === to ? 0 : 99),
    );
    assert.equal(hops[0].station, "Home");
    assert.equal(hops[0].ly, 0);
    assert.equal(hops[1].station, "Near");
    assert.equal(hops[2].station, "Far");
  });
});
