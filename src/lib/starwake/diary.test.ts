import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { diaryTape } from "./diary.ts";
import { emptySlot } from "./saves.ts";
import type { JobLogEntry } from "./types.ts";
import type { DiaryWorld } from "./diary.ts";

const haul: JobLogEntry = {
  id: "j1",
  kind: "courier",
  cargo: "nav film",
  qty: 4,
  from: { systemId: "helion", stationId: "st-a" },
  to: { systemId: "helion", stationId: "st-b" },
  pay: 800,
  at: 2000,
  shipId: "courier",
};

const world: DiaryWorld = {
  id: "p1",
  name: "Helion IV",
  kindLabel: "Rocky world",
  system: "Helios",
  at: 1000,
  scanned: true,
  surveyed: false,
};

describe("pilot tape", () => {
  it("empty slot has no diary", () => {
    const slot = emptySlot("1");
    assert.deepEqual(slot.jobLog, []);
    assert.deepEqual(slot.visitedPlanets, {});
    assert.deepEqual(slot.scanned, {});
    assert.deepEqual(slot.surveys, {});
    assert.equal(diaryTape(slot.jobLog, []).length, 0);
  });

  it("newest stamp first, hauls and worlds on one tape", () => {
    const tape = diaryTape([haul], [world]);
    assert.equal(tape.length, 2);
    assert.equal(tape[0].kind, "haul");
    assert.equal(tape[0].pay, 800);
    assert.equal(tape[1].kind, "world");
    assert.equal(tape[1].kicker, "Scan");
  });
});
