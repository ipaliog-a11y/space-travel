import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { liveNotices, makeNotice, NOTICE_MS } from "./notices.ts";

describe("flight notices", () => {
  it("drops after five seconds and caps the stack", () => {
    const a = makeNotice({ kicker: "Line", title: "Kite docked", body: "Cut ₡40" }, 1000);
    assert.equal(a.until, 1000 + NOTICE_MS);
    assert.equal(liveNotices([a], 1000).length, 1);
    assert.equal(liveNotices([a], a.until).length, 0);
    const many = Array.from({ length: 6 }, (_, i) =>
      makeNotice({ kicker: "Tape", title: String(i), body: "x" }, 10 + i),
    );
    assert.equal(liveNotices(many, 10).length, 4);
  });
});
