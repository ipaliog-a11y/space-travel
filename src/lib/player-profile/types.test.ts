import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { coercePilotIconId, isProfileComplete, type PlayerProfile } from "./types.ts";

function profile(partial: Partial<PlayerProfile> = {}): PlayerProfile {
  return {
    id: "p1",
    displayName: "Rhea",
    callSign: "WAKE",
    iconId: "pilot-01",
    profileCreatedAt: new Date(),
    totalXp: 0,
    currentRank: 1,
    credits: 1000,
    hangarBonusSlots: 0,
    starterClaimed: false,
    ...partial,
  };
}

describe("isProfileComplete", () => {
  it("rejects missing and stub rows", () => {
    assert.equal(isProfileComplete(null), false);
    assert.equal(isProfileComplete(profile({ displayName: "Pilot", callSign: "PILOT" })), false);
    assert.equal(isProfileComplete(profile({ callSign: "AB" })), false);
  });

  it("accepts a named call sign", () => {
    assert.equal(isProfileComplete(profile()), true);
    assert.equal(isProfileComplete(profile({ displayName: "Pilot", callSign: "ACE" })), true);
  });
});

describe("pilot icons", () => {
  it("keeps known marks and falls back from retired ids", () => {
    assert.equal(coercePilotIconId("pilot-20"), "pilot-20");
    assert.equal(coercePilotIconId("ace-01"), "pilot-01");
    assert.equal(coercePilotIconId("veteran-04"), "pilot-01");
  });
});
