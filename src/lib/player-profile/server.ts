/**
 * Player profile — SQL helpers. Import only from createServerFn handlers
 * (see ./api.ts), never from React components or route loaders.
 */

import { getSql } from "../db.ts";
import type { CreateProfileData, PilotIconId, PlayerProfile } from "./types.ts";
import { isIconUnlocked } from "./types.ts";

type PlayerRow = {
  id: string;
  display_name: string;
  call_sign: string;
  icon_id: string;
  profile_created_at: Date;
  last_login_at: Date | null;
  total_xp: number;
  current_rank: number;
  credits: number;
  hangar_bonus_slots?: number;
};

export function mapPlayer(row: PlayerRow): PlayerProfile {
  return {
    id: row.id,
    displayName: row.display_name,
    callSign: row.call_sign || "",
    iconId: (row.icon_id as PilotIconId) || "pilot-01",
    profileCreatedAt: row.profile_created_at,
    lastLoginAt: row.last_login_at ?? undefined,
    totalXp: Number(row.total_xp ?? 0),
    currentRank: Number(row.current_rank ?? 1),
    credits: Number(row.credits ?? 0),
    hangarBonusSlots: Number(row.hangar_bonus_slots ?? 0),
  };
}

export async function getPlayerProfile(playerId: string): Promise<PlayerProfile | null> {
  const sql = await getSql();
  const result = await sql<PlayerRow>`
    SELECT
      id,
      display_name,
      call_sign,
      icon_id,
      profile_created_at,
      last_login_at,
      total_xp,
      current_rank,
      credits,
      hangar_bonus_slots
    FROM players
    WHERE id = ${playerId}
  `;
  return result.length > 0 ? mapPlayer(result[0]) : null;
}

export async function createPlayerProfile(
  playerId: string,
  data: CreateProfileData,
): Promise<PlayerProfile> {
  const existing = await getPlayerProfile(playerId);
  if (existing && !isIconUnlocked(data.iconId, existing.currentRank)) {
    throw new Error(`Icon ${data.iconId} is not unlocked yet`);
  }

  const sql = await getSql();
  const result = await sql<PlayerRow>`
    INSERT INTO players (id, display_name, call_sign, icon_id, credits, profile_created_at)
    VALUES (
      ${playerId},
      ${data.displayName},
      ${data.callSign},
      ${data.iconId},
      1000,
      NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
      display_name = EXCLUDED.display_name,
      call_sign = EXCLUDED.call_sign,
      icon_id = EXCLUDED.icon_id
    RETURNING
      id,
      display_name,
      call_sign,
      icon_id,
      profile_created_at,
      last_login_at,
      total_xp,
      current_rank,
      credits,
      hangar_bonus_slots
  `;
  return mapPlayer(result[0]);
}

/** Stub row so player_ships FK succeeds before the player fills in a profile. */
export async function ensurePlayerRow(playerId: string): Promise<PlayerProfile> {
  const existing = await getPlayerProfile(playerId);
  if (existing) return existing;
  return createPlayerProfile(playerId, {
    displayName: "Pilot",
    callSign: "PILOT",
    iconId: "pilot-01",
  });
}

export async function updatePlayerProfile(
  playerId: string,
  updates: Partial<Pick<CreateProfileData, "displayName" | "callSign" | "iconId">>,
): Promise<PlayerProfile> {
  const player = await getPlayerProfile(playerId);
  if (!player) {
    throw new Error("Player profile not found");
  }
  if (updates.iconId && !isIconUnlocked(updates.iconId, player.currentRank)) {
    throw new Error(`Icon ${updates.iconId} is not unlocked yet`);
  }

  const sql = await getSql();
  const result = await sql<PlayerRow>`
    UPDATE players
    SET
      display_name = COALESCE(${updates.displayName ?? null}, display_name),
      call_sign = COALESCE(${updates.callSign ?? null}, call_sign),
      icon_id = COALESCE(${updates.iconId ?? null}, icon_id)
    WHERE id = ${playerId}
    RETURNING
      id,
      display_name,
      call_sign,
      icon_id,
      profile_created_at,
      last_login_at,
      total_xp,
      current_rank,
      credits,
      hangar_bonus_slots
  `;
  return mapPlayer(result[0]);
}

export async function addXp(playerId: string, amount: number): Promise<PlayerProfile> {
  const sql = await getSql();
  const result = await sql<PlayerRow>`
    UPDATE players
    SET total_xp = total_xp + ${amount}
    WHERE id = ${playerId}
    RETURNING
      id, display_name, call_sign, icon_id, profile_created_at, last_login_at,
      total_xp, current_rank, credits, hangar_bonus_slots
  `;
  if (result.length === 0) throw new Error("Player not found");
  return mapPlayer(result[0]);
}

export async function modifyCredits(playerId: string, amount: number): Promise<PlayerProfile> {
  const player = await getPlayerProfile(playerId);
  if (!player) throw new Error("Player not found");
  const newCredits = player.credits + amount;
  if (newCredits < 0) throw new Error("Insufficient credits");

  const sql = await getSql();
  const result = await sql<PlayerRow>`
    UPDATE players
    SET credits = ${newCredits}
    WHERE id = ${playerId}
    RETURNING
      id, display_name, call_sign, icon_id, profile_created_at, last_login_at,
      total_xp, current_rank, credits, hangar_bonus_slots
  `;
  return mapPlayer(result[0]);
}

export async function updateLastLogin(playerId: string): Promise<void> {
  const sql = await getSql();
  await sql`
    UPDATE players
    SET last_login_at = NOW()
    WHERE id = ${playerId}
  `;
}
