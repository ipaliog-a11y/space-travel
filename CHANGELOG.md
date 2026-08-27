# Changelog

All notable changes to the Starwake project.

## [v0.1.1] - 2026-08-27

### Added
- **Player Profile System** - Complete player identity and progression tracking
  - Player profiles with name, call sign, and icon selection
  - 16 pilot icons (8 starter, 4 ace, 4 veteran) with rank-based unlocks
  - Credit system for economy (starting: 1000 credits)
  - Profile creation/edit UI with visual icon picker
  - Server functions for profile management
  
- **Player Progression Fields**
  - `call_sign` - Pilot callsign for comms/UI (3-20 chars)
  - `icon_id` - Selected pilot icon (rank-gated)
  - `credits` - Player currency for transactions
  - `profile_created_at` - Profile creation timestamp
  
- **Profile Management UI**
  - `/profile` route for profile creation and editing
  - Visual icon selection with emoji icons
  - Form validation and error handling
  - Profile summary view with stats

### Changed
- Updated ship ownership test API to use profile system
- Enhanced player schema with profile fields

### Fixed
- N/A

### Technical Details
- **Database Migrations:** 
  - 0001_players.sql (updated with profile fields)
  - 0003_player_profile.sql (migration for existing databases)
- **New Module:** src/lib/player-profile/
  - types.ts (icon definitions, types, helper functions)
  - server.ts (profile CRUD operations)
- **New Route:** src/routes/profile.tsx (profile UI)
- **Documentation:** docs/PLAYER_PROFILE_SYSTEM.md

### Icon Categories
- **Starter (8):** Rookie, Explorer, Trader, Hauler, Scout, Racer, Mechanic, Engineer
- **Ace (4):** Ace Pilot, Hotshot, Sharpshooter, Storm (unlock at rank 5)
- **Veteran (4):** Veteran, Legend, Commander, Elite (unlock at rank 10)

### Known Issues
- N/A

### Next Steps
- Integrate profile creation with authentication flow
- Add profile statistics (flight time, jumps, discoveries)
- Implement icon color customization
- Add achievement display on profile

---

## Version History

- **v0.1.0** - Ship ownership foundation (2026-08-27)
