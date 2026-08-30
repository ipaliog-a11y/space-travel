import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { hangarSlotsFromRank } from "../ship-ownership/types.ts";
import {
  PILOT_RANKS,
  jobsToTier,
  rankByTier,
  rankFromXp,
  xpIntoRank,
} from "./ranks.ts";

describe("pilot ranks", () => {
  it("has 15 named tiers", () => {
    assert.equal(PILOT_RANKS.length, 15);
    assert.equal(PILOT_RANKS[0].name, "Wake");
    assert.equal(PILOT_RANKS[14].name, "Starwake");
    assert.equal(PILOT_RANKS[14].xp, 180_000);
  });

  it("matches Decision #003 hangar bays", () => {
    for (const rank of PILOT_RANKS) {
      assert.equal(rank.bays, hangarSlotsFromRank(rank.tier), `rank ${rank.tier}`);
    }
  });

  it("keeps rank 1–2 on one bay", () => {
    assert.equal(rankByTier(1).bays, 1);
    assert.equal(rankByTier(2).bays, 1);
    assert.equal(rankByTier(3).bays, 2);
  });

  it("promotes on cumulative XP", () => {
    assert.equal(rankFromXp(0).tier, 1);
    assert.equal(rankFromXp(349).tier, 1);
    assert.equal(rankFromXp(350).name, "Runner");
    assert.equal(rankFromXp(1_000).name, "Pilot");
    assert.equal(rankFromXp(180_000).name, "Starwake");
    assert.equal(rankFromXp(999_999).tier, 15);
  });

  it("reports progress toward the next rank", () => {
    const mid = xpIntoRank(500);
    assert.equal(mid.rank.name, "Runner");
    assert.equal(mid.next?.name, "Pilot");
    assert.equal(mid.have, 150);
    assert.equal(mid.need, 650);
    assert.equal(xpIntoRank(180_000).next, null);
  });

  it("paces the second bay around a few dozen jobs", () => {
    assert.equal(jobsToTier(3, 40), 25);
    assert.ok(jobsToTier(5, 40) >= 90);
    assert.ok(jobsToTier(15, 40) <= 5000);
  });
});
