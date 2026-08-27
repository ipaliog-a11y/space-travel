# Player Profile System

## Overview
Complete player profile system for tracking identity, progression, and economy in Starwake.

## Implementation Date
2026-08-27 - Week 1 Day 1 (Session 1.2)

## What Was Added

### Database Schema

**Updated `migrations/0001_players.sql`:**
- `call_sign` VARCHAR(20) - Pilot callsign for comms/UI
- `icon_id` VARCHAR(50) - Selected pilot icon (default: 'pilot-01')
- `profile_created_at` TIMESTAMPTZ - When profile was created
- `credits` BIGINT - Starting credits (default: 1000)
- Added constraints for call_sign length (3-20 chars) and credits (≥0)

**Created `migrations/0003_player_profile.sql`:**
- Migration to add profile fields to existing databases
- Auto-populates call_sign from display_name for existing players
- Ensures all players have default icon and starting credits

### TypeScript Types

**`src/lib/player-profile/types.ts`:**
- `PilotIconId` - 16 icon options (8 starter, 4 ace, 4 veteran)
- `PilotIcon` - Icon metadata (id, name, category, svg)
- `PlayerProfile` - Complete player data type
- `CreateProfileData` - Profile creation input
- `PILOT_ICONS` - Array of all available icons
- `getStarterIcons()` - Get unlocked icons for new players
- `getAllIcons(rank)` - Get all icons with unlock status
- `isIconUnlocked(iconId, rank)` - Check if specific icon is unlocked

### Server Functions

**`src/lib/player-profile/server.ts`:**
- `createPlayerProfile(playerId, data)` - Create/update profile
- `getPlayerProfile(playerId)` - Get player profile
- `updatePlayerProfile(playerId, updates)` - Update profile fields
- `addXp(playerId, amount)` - Add experience points
- `modifyCredits(playerId, amount, reason)` - Add/remove credits
- `updatePlayerRank(playerId, newRank)` - Update rank (unlocks icons)
- `updateLastLogin(playerId)` - Update last login timestamp
- `getPlayerStats(playerId)` - Get profile + statistics summary

### UI Components

**`src/routes/profile.tsx`:**
- Profile creation screen (shown to new players)
- Profile view/edit screen (for existing players)
- Icon selection grid with visual preview
- Form validation (call_sign 3-20 chars, display_name 1-100 chars)
- Shows credits, XP, rank in profile summary
- Editable profile fields

**Features:**
- ✅ Visual icon picker with emoji icons
- ✅ Real-time form validation
- ✅ Profile creation flow for new players
- ✅ Profile editing for existing players
- ✅ Unlock status tracking (starter → ace → veteran)
- ✅ Responsive design

### Integration

**Updated `src/lib/ship-ownership/test-api.ts`:**
- Now uses `createPlayerProfile()` instead of raw SQL
- Ensures test player has complete profile with call sign and icon
- More realistic test data

## Icon Categories

### Starter Icons (Available Immediately)
- 👨‍✈️ **Rookie** (pilot-01)
- 🧑‍🚀 **Explorer** (pilot-02)
- 👩‍💼 **Trader** (pilot-03)
- 👷 **Hauler** (pilot-04)
- 🕵️ **Scout** (pilot-05)
- 🏎️ **Racer** (pilot-06)
- 🔧 **Mechanic** (pilot-07)
- ⚙️ **Engineer** (pilot-08)

### Ace Icons (Unlock at Rank 5)
- 🦅 **Ace Pilot** (ace-01)
- 🔥 **Hotshot** (ace-02)
- 🎯 **Sharpshooter** (ace-03)
- ⚡ **Storm** (ace-04)

### Veteran Icons (Unlock at Rank 10)
- ⭐ **Veteran** (veteran-01)
- 👑 **Legend** (veteran-02)
- 💫 **Commander** (veteran-03)
- 🌟 **Elite** (veteran-04)

## Usage Examples

### Creating a Profile
```typescript
import { createPlayerProfile } from './player-profile/server';

await createPlayerProfile(playerId, {
  displayName: "John Doe",
  callSign: "MAVERICK",
  iconId: "pilot-01",
});
```

### Getting Player Profile
```typescript
import { getPlayerProfile } from './player-profile/server';

const profile = await getPlayerProfile(playerId);
console.log(profile.displayName); // "John Doe"
console.log(profile.callSign);    // "MAVERICK"
console.log(profile.credits);     // 1000
console.log(profile.iconId);      // "pilot-01"
```

### Updating Profile
```typescript
import { updatePlayerProfile } from './player-profile/server';

await updatePlayerProfile(playerId, {
  callSign: "GOOSE",
  iconId: "pilot-02",
});
```

### Modifying Credits
```typescript
import { modifyCredits } from './player-profile/server';

// Add credits (selling ship, completing mission)
await modifyCredits(playerId, 5000, "Sold cargo");

// Remove credits (buying ship, repairs)
await modifyCredits(playerId, -2500, "Ship repair");
```

### Adding XP
```typescript
import { addXp } from './player-profile/server';

await addXp(playerId, 500); // Complete mission
```

## Database Schema

```sql
CREATE TABLE players (
  -- Identity
  id UUID PRIMARY KEY,
  display_name VARCHAR(100) NOT NULL,
  call_sign VARCHAR(20) NOT NULL,
  icon_id VARCHAR(50) DEFAULT 'pilot-01',
  
  -- Timestamps
  profile_created_at TIMESTAMPTZ DEFAULT NOW(),
  last_login_at TIMESTAMPTZ,
  
  -- Progression
  total_xp BIGINT DEFAULT 0,
  current_rank INT DEFAULT 1,
  credits BIGINT DEFAULT 1000,
  
  -- Constraints
  CONSTRAINT players_display_name_check 
    CHECK (length(display_name) > 0 AND length(display_name) <= 100),
  CONSTRAINT players_call_sign_check 
    CHECK (length(call_sign) >= 3 AND length(call_sign) <= 20),
  CONSTRAINT players_credits_check 
    CHECK (credits >= 0)
);
```

## Testing

### Manual Testing
1. Start dev server: `npm run dev`
2. Navigate to: `http://localhost:8080/profile`
3. Create profile with name, call sign, and icon
4. Verify profile displays correctly
5. Edit profile and verify changes save

### Backend Testing
The ship ownership test API now creates a proper player profile:
```bash
# Access test endpoint
http://localhost:8080/api/test-ship-ownership
```

## Future Enhancements

### Phase 2 (Week 2-3)
- [ ] Custom icon colors
- [ ] Profile background customization
- [ ] Achievement display on profile
- [ ] Statistics tracking (flight time, jumps, discoveries)

### Phase 3 (Week 4+)
- [ ] Player reputation factions
- [ ] Bounty/wanted level
- [ ] Commendations/medals
- [ ] Profile sharing/leaderboards

## Files Modified/Created

### Created
- `src/lib/player-profile/types.ts` (180 lines)
- `src/lib/player-profile/server.ts` (200 lines)
- `src/routes/profile.tsx` (180 lines)
- `migrations/0003_player_profile.sql`
- `docs/PLAYER_PROFILE_SYSTEM.md` (this file)

### Modified
- `migrations/0001_players.sql` - Added profile fields to base schema
- `src/lib/ship-ownership/test-api.ts` - Uses profile system

## Dependencies
- ✅ TanStack Start (server functions)
- ✅ PostgreSQL/PGLite (database)
- ✅ React (UI components)
- ✅ TypeScript (type safety)

## Related Systems
- **Ship Ownership** - Requires player profile (foreign key)
- **Rank Progression** - Updates `current_rank` field
- **Credit Economy** - Uses `credits` field
- **Achievement System** - Will reference player `id`
- **Flight Log** - Will update `last_login_at`

## Notes
- Call signs are uppercase by convention (enforced in UI, not database)
- Icon selection is limited by rank (starter → ace → veteran)
- Credits default to 1000 for all new players
- Profile creation is mandatory before ship ownership
- All profile fields are editable after creation
