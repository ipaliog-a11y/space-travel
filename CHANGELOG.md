# Changelog

All notable changes to the Starwake project.

## [v0.1.11] - 2026-08-28

### Added
- Pilot job diary: delivered hauls with route, mass, and payout. Totals haul count and ₡ earned.
- Hub board Refresh posts a new slate. Accepting or delivering tops the board back up.
- Hull HUD shows live wear rate (`/min` or `/evt`) next to condition.

### Changed
- Finished contracts stay retired by cargo, mass, and route — not only listing id. Refresh and refill skip those hauls.
- Diary pay is the amount credited on Deliver.

## [v0.1.10] - 2026-08-28

### Added
- Flight HUD wear-rate debug: activity, points/min or /event, pending tick, and pool.

### Changed
- Hub boards list hauls that leave that lock. Docking rebuilds the board for the station you are in. Hangar only shows the active haul.
- Delivery pay is cargo units × haul (local AU + jump ly). Courier ₡220 / u / AU. Listed jobs stay linear (₡1–₡50,000).

## [v0.1.9] - 2026-08-28

### Added
- Live Pilot screen (name, call sign, icon, credits, rank) from Gate and Hangar. `/profile` redirects into the game.
- Live ship Market: browse hulls at catalog prices, buy into a free bay, or trade in when rank 1 is full. `/market` redirects into the game.

### Changed
- Hangar slot-fit prices sit next to Rel: RCS ₡4,000, HX ₡4,500, Tank ₡6,000, Hold ₡7,000, Drive ₡8,000, FSD ₡12,000. Rel stays ₡5,000 / ₡15,000 / ₡30,000.

## [v0.1.8] - 2026-08-28

### Changed
- Reliability hardpoints (stock → Mk I / II / III) fit from the hangar Rel tab, not the station bay. Each tier keeps its own cost (₡5,000 / ₡15,000 / ₡30,000).
- Hangar module alts cost credits by slot (RCS ₡450 … FSD ₡1,200). Stock stays free. Already-fitted parts stay owned.
- Repair is ₡15 per wear point (was ₡80). A lock-to-lock courier job now covers a typical hull restore with credits left over.

## [v0.1.7] - 2026-08-28

### Added
- Wear efficiency now hits live flight: turn, cruise, overdrive, and jump range drop; FSD charge and cool stretch. Hold and tank stay put. HUD shows the penalty once hull is past excellent.
- Job deliveries pay credits (lock-to-lock floor ₡1,000). Four typical courier runs from the ₡1,000 start fund Mk I (₡5,000). Board and Deliver show the payout.

## [v0.1.6] - 2026-08-28

### Changed
- `/hangar` redirects to the live game hangar. Parallel dashboard components removed.

### Added
- Station hardpoint fit: stock → Mk I (₡5,000), then Mk II / Mk III. Disabled until you can afford it.

## [v0.1.5] - 2026-08-28

### Added
- Station Repair: full hull restore at 80 credits per wear point (rounded up).
- Station bay shows credit balance. Repair is disabled when hull is sound or funds are short.

## [v0.1.4] - 2026-08-28

### Fixed
- Wear column is NUMERIC so cruise fractions persist (INT rounded 15s of flight to 0).
- HUD hull % updates every 250ms from pending wear, not only after a DB flush.
- Wear ticks while the flight HUD is up even if mode is still `docked` after undock.

## [v0.1.3] - 2026-08-28

### Added
- Flight wear: cruise, boost, hyperspace jump, and dock accumulate on the owned hull.
- HUD hull readout (remaining condition % and wear tier).
- Wear flushes every 15s of flight, on dock, and when the tab hides.

## [v0.1.2] - 2026-08-28

### Fixed
- Player `id` is TEXT so it matches Better Auth / `dev-user` (not UUID).
- Profile INSERT uses `profile_created_at` (schema), not `created_at`.
- Profile and hangar routes call `createServerFn` APIs instead of `getSql` from the client.
- `acquireShip` enforces hangar slot capacity (Decision #003); duplicate hull types allowed.
- Live Gate/Hangar only list owned hulls; empty bay claims a stock Courier.

### Added
- `migrations/0004_week1_alignment.sql` for existing PGLite databases.
- `src/lib/player-profile/api.ts` and `src/lib/hangar/api.ts`.

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
