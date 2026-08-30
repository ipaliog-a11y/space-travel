/**
 * Player Profile System - Types
 */

export type PilotIconId =
  | "pilot-01"
  | "pilot-02"
  | "pilot-03"
  | "pilot-04"
  | "pilot-05"
  | "pilot-06"
  | "pilot-07"
  | "pilot-08"
  | "pilot-09"
  | "pilot-10"
  | "pilot-11"
  | "pilot-12"
  | "pilot-13"
  | "pilot-14"
  | "pilot-15"
  | "pilot-16"
  | "pilot-17"
  | "pilot-18"
  | "pilot-19"
  | "pilot-20";

export interface PilotIcon {
  id: PilotIconId;
  name: string;
  category: "starter" | "ace" | "veteran";
  unlockRequirement?: string;
}

export interface PlayerProfile {
  id: string;
  displayName: string;
  callSign: string;
  iconId: PilotIconId;
  profileCreatedAt: Date;
  lastLoginAt?: Date;
  totalXp: number;
  currentRank: number;
  credits: number;
  hangarBonusSlots: number;
  starterClaimed: boolean;
}

export interface CreateProfileData {
  displayName: string;
  callSign: string;
  iconId: PilotIconId;
}

const STUB_CALL = "PILOT";
const STUB_NAME = "Pilot";

/** Stub `ensurePlayerRow` names are not a finished pilot. */
export function isProfileComplete(profile: PlayerProfile | null | undefined): profile is PlayerProfile {
  if (!profile) return false;
  const name = profile.displayName.trim();
  const call = profile.callSign.trim().toUpperCase();
  if (name.length < 1 || call.length < 3) return false;
  if (call === STUB_CALL && name === STUB_NAME) return false;
  return true;
}

/** Twenty original line marks. All available at create-profile. Rank gates come with the rank ladder. */
export const PILOT_ICONS: PilotIcon[] = [
  { id: "pilot-01", name: "Chevron", category: "starter" },
  { id: "pilot-02", name: "Helios", category: "starter" },
  { id: "pilot-03", name: "Ring", category: "starter" },
  { id: "pilot-04", name: "Hold", category: "starter" },
  { id: "pilot-05", name: "Needle", category: "starter" },
  { id: "pilot-06", name: "Lock", category: "starter" },
  { id: "pilot-07", name: "Well", category: "starter" },
  { id: "pilot-08", name: "Fork", category: "starter" },
  { id: "pilot-09", name: "Orbit", category: "starter" },
  { id: "pilot-10", name: "Shard", category: "starter" },
  { id: "pilot-11", name: "Beacon", category: "starter" },
  { id: "pilot-12", name: "Wake", category: "starter" },
  { id: "pilot-13", name: "Drift", category: "starter" },
  { id: "pilot-14", name: "Pad", category: "starter" },
  { id: "pilot-15", name: "Spiral", category: "starter" },
  { id: "pilot-16", name: "Cross", category: "starter" },
  { id: "pilot-17", name: "Crescent", category: "starter" },
  { id: "pilot-18", name: "Bands", category: "starter" },
  { id: "pilot-19", name: "Lens", category: "starter" },
  { id: "pilot-20", name: "Spark", category: "starter" },
];

export function getStarterIcons(): PilotIcon[] {
  return PILOT_ICONS.filter((icon) => icon.category === "starter");
}

export function getAllIcons(_currentRank: number): PilotIcon[] {
  return PILOT_ICONS;
}

export function isPilotIconId(id: string): id is PilotIconId {
  return PILOT_ICONS.some((i) => i.id === id);
}

export function coercePilotIconId(id: string | null | undefined): PilotIconId {
  return id && isPilotIconId(id) ? id : "pilot-01";
}

export function isIconUnlocked(iconId: PilotIconId, _currentRank: number): boolean {
  return isPilotIconId(iconId);
}
