/**
 * Player Profile System - Server Functions
 */

import { getSql } from '../db';
import type { PlayerProfile, CreateProfileData, PilotIconId } from './types';
import { isIconUnlocked } from './types';

/**
 * Create a new player profile
 */
export async function createPlayerProfile(
  playerId: string,
  data: CreateProfileData
): Promise<PlayerProfile> {
  const sql = await getSql();
  
  // Validate icon unlock status
  const player = await getPlayerProfile(playerId);
  if (player && !isIconUnlocked(data.iconId, player.currentRank)) {
    throw new Error(`Icon ${data.iconId} is not unlocked yet`);
  }
  
  const result = await sql<PlayerProfile>`
    INSERT INTO players (id, display_name, call_sign, icon_id, credits, created_at)
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
      icon_id = EXCLUDED.icon_id,
      updated_at = NOW()
    RETURNING *
  `;
  
  return result[0];
}

/**
 * Get player profile by ID
 */
export async function getPlayerProfile(playerId: string): Promise<PlayerProfile | null> {
  const sql = await getSql();
  
  const result = await sql<any>`
    SELECT 
      id,
      display_name as "displayName",
      call_sign as "callSign",
      icon_id as "iconId",
      profile_created_at as "profileCreatedAt",
      last_login_at as "lastLoginAt",
      total_xp as "totalXp",
      current_rank as "currentRank",
      credits
    FROM players
    WHERE id = ${playerId}
  `;
  
  if (result.length === 0) return null;
  
  const row = result[0];
  return {
    id: row.id,
    displayName: row.displayName,
    callSign: row.callSign || '',
    iconId: row.iconId || 'pilot-01',
    profileCreatedAt: row.profileCreatedAt,
    lastLoginAt: row.lastLoginAt,
    totalXp: row.totalXp || 0,
    currentRank: row.currentRank || 1,
    credits: row.credits || 0,
  };
}

/**
 * Update player profile (display name, call sign, icon)
 */
export async function updatePlayerProfile(
  playerId: string,
  updates: Partial<Pick<CreateProfileData, 'displayName' | 'callSign' | 'iconId'>>
): Promise<PlayerProfile> {
  const sql = await getSql();
  
  const player = await getPlayerProfile(playerId);
  if (!player) {
    throw new Error('Player profile not found');
  }
  
  // Validate icon unlock
  if (updates.iconId && !isIconUnlocked(updates.iconId, player.currentRank)) {
    throw new Error(`Icon ${updates.iconId} is not unlocked yet`);
  }
  
  const result = await sql<PlayerProfile>`
    UPDATE players
    SET
      display_name = COALESCE(${updates.displayName || null}, display_name),
      call_sign = COALESCE(${updates.callSign || null}, call_sign),
      icon_id = COALESCE(${updates.iconId || null}, icon_id),
      updated_at = NOW()
    WHERE id = ${playerId}
    RETURNING *
  `;
  
  return result[0];
}

/**
 * Add XP to player
 */
export async function addXp(playerId: string, amount: number): Promise<PlayerProfile> {
  const sql = await getSql();
  
  const result = await sql<PlayerProfile>`
    UPDATE players
    SET
      total_xp = total_xp + ${amount},
      updated_at = NOW()
    WHERE id = ${playerId}
    RETURNING *
  `;
  
  if (result.length === 0) {
    throw new Error('Player not found');
  }
  
  return result[0];
}

/**
 * Add or remove credits
 */
export async function modifyCredits(
  playerId: string,
  amount: number,
  reason?: string
): Promise<PlayerProfile> {
  const sql = await getSql();
  
  const player = await getPlayerProfile(playerId);
  if (!player) {
    throw new Error('Player not found');
  }
  
  const newCredits = player.credits + amount;
  if (newCredits < 0) {
    throw new Error('Insufficient credits');
  }
  
  const result = await sql<PlayerProfile>`
    UPDATE players
    SET
      credits = ${newCredits},
      updated_at = NOW()
    WHERE id = ${playerId}
    RETURNING *
  `;
  
  return result[0];
}

/**
 * Update player rank (called by rank system)
 */
export async function updatePlayerRank(
  playerId: string,
  newRank: number
): Promise<PlayerProfile> {
  const sql = await getSql();
  
  const result = await sql<PlayerProfile>`
    UPDATE players
    SET
      current_rank = ${newRank},
      updated_at = NOW()
    WHERE id = ${playerId}
    RETURNING *
  `;
  
  if (result.length === 0) {
    throw new Error('Player not found');
  }
  
  return result[0];
}

/**
 * Update last login timestamp
 */
export async function updateLastLogin(playerId: string): Promise<void> {
  const sql = await getSql();
  
  await sql`
    UPDATE players
    SET last_login_at = NOW()
    WHERE id = ${playerId}
  `;
}

/**
 * Get player statistics summary
 */
export async function getPlayerStats(playerId: string): Promise<{
  profile: PlayerProfile;
  shipCount: number;
  totalFlightTime: number;
  totalJumps: number;
} | null> {
  const sql = await getSql();
  
  const profile = await getPlayerProfile(playerId);
  if (!profile) return null;
  
  // Get ship count
  const shipResult = await sql<{ count: number }>`
    SELECT COUNT(*) as count FROM player_ships
    WHERE player_id = ${playerId}
  `;
  
  // These would come from flight log system (future implementation)
  const totalFlightTime = 0;
  const totalJumps = 0;
  
  return {
    profile,
    shipCount: shipResult[0].count,
    totalFlightTime,
    totalJumps,
  };
}
