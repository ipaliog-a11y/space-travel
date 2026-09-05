# Changelog

All notable changes to the Starwake project.

## [v0.1.44] - 2026-09-05

### Changed
- Beauty-shot prompt: 3/4 hero, class + silhouette + unique feature, Visual Law first.

## [v0.1.43] - 2026-09-05

### Changed
- Hull classes: Ion Scout 12–18 m through Void Frigate 80–120 m (combat saved, not flyable).

## [v0.1.42] - 2026-09-05

### Changed
- Ship Visual Law skill: working plates, charcoal + teal, no luxury sci-fi.

## [v0.1.41] - 2026-09-05

### Changed
- README matches current loops, Extractor, and stick (X jump, D dock, C charts).

## [v0.1.40] - 2026-09-05

### Changed
- Annex leverage: public sell −6%, annex full tape, T1 ₡18k → 240 u, same-system remote sell.

## [v0.1.39] - 2026-09-05

### Changed
- Extractor crews dump ore to the annex (or pad). They no longer auto-sell the pull.

## [v0.1.38] - 2026-09-05

### Changed
- BUILD 12 storage: found an annex lock (₡36k, 120 u) in the system you are in.

## [v0.1.37] - 2026-09-05

### Changed
- In-system cruise traffic. Flying hulls draw across the system (was pad-only 280u). Debug fly count ~8–14.

## [v0.1.36] - 2026-09-05

### Changed
- 5s event toasts (intercept, crew dock, tape shock). Q/E roll swapped, no roll rebound. Flight debug: NPC count + Event.

## [v0.1.35] - 2026-09-05

### Changed
- BUILD 11: tape shocks, OD intercept (pay / dump / boost). Crews Rel and tank every dock.

## [v0.1.34] - 2026-09-05

### Changed
- Watch Analysis plate: movers, wait-or-dump, listed locks. No sell. Same tape everywhere.

## [v0.1.33] - 2026-09-05

### Changed
- Watch has a Warehouse plate: pad lots and paper ₡. No sell from there. Docked Watch can Sell pad if this lock lists the good, and Store hold.

## [v0.1.32] - 2026-09-05

### Changed
- Extractor crews fly pulls, not packets. Bond a spare Extractor in the Line Office. Green stays local; better grades go farther.

## [v0.1.31] - 2026-09-05

### Changed
- C opens and closes Charts (N still works). Tab flips System / Galaxy while Charts is up.
- Gate Bench sets XP and credits on the account. Rank follows XP.

## [v0.1.30] - 2026-09-05

### Changed
- Hold Z to reverse; let go and the lever springs to 0%. Lever now reads percent + Idle/Fwd/Rev/Halt/Od/Dock.
- Radar is heading-up and live (planets, stations, lock). The sweep is still chrome.
- Charts dropped the cascading orbit numbers.
- X jumps. D docks / undocks. J still jumps.

## [v0.1.29] - 2026-09-05

### Changed
- Reverse is RCS only (~9% of cruise). Forward eases in so a crack of lever is not a jump.

## [v0.1.28] - 2026-09-05

### Changed
- Throttle goes below 0 into reverse to kill speed. Around a dock, idle is a halt — not a coast past the pad.

## [v0.1.27] - 2026-09-05

### Changed
- Crews grow by hauls, not a skill tree. Green: local film, pad rest equal to the hop, unarmed. XP opens jumps, shortens rest, and lets them keep a pirate stop.

## [v0.1.26] - 2026-09-05

### Added
- Market buy and trade-in open a confirm plate before credits move.
- Crew hire assigns a spare hangar hull. You keep one ship to fly. File and diary live on the crew in the Line Office.

## [v0.1.25] - 2026-09-05

### Added
- **Rank line** on Pilot. Fifteen named tiers as a scrollable trophy road — past, current, next, locked. Preview XP until the live award loop is wired.

## [v0.1.24] - 2026-09-05

### Changed
- Gate is hulls and acts only — blurb, key legend, slots, and haul count moved off the main menu.
- Save slots live on Pilot. Diary is its own page from Pilot (your packets and crew cuts).

## [v0.1.23] - 2026-09-05

### Added
- **Crew office** (BUILD 10). Hire up to two Courier / Hauler crews. They fly contracts only, loop while you fly, and pay a cut after upkeep. Bond is spent. Cosmetic traffic still has no pay.

## [v0.1.22] - 2026-09-03

### Changed
- Hangar hulls are **procedural meshes**, not stacked primitives. Needles are spline-lathed with groove rings; bricks are beveled silhouette extrudes; booms are tubes; Clipper is a faceted lathe. In-flight traffic still uses the lightweight kit.

## [v0.1.21] - 2026-09-03

### Added
- Cosmetic NPC traffic: other hulls berth on occupied gates, approach the lock, and hop a lane between hubs. No contracts yet.
- Shared hull kit so Hangar 3D and in-flight ships match the 2D portraits (needle Courier, brick Hauler with orange stripe, scoop Extractor, dish Scout).

## [v0.1.20] - 2026-09-03

### Changed
- Gas and ice giants harvest as a **haze scoop**, not a well park. Drop inside the bands (inside ~2.4 radii; park is already there). HUD shows **Scoop** and **bands**. True gas worlds still yield hydrogen / helium-3; ice giants yield hydrogen / volatiles. Rocky / ice / volcanic pulls stay Extract from the well.

## [v0.1.19] - 2026-09-03

### Added
- **Extractor** hull (Yard). Scoop boom, ore bins, ₡160k. Fast well pull (`extractSec` 2.6). Other hulls can sip.
- Planet mining on hub-less worlds. After a survey, Extract pulls gas / liquid / solid harvest into the hold at ₡0. Auto-repeats while you stay in the well. Sell on the watch.

### Changed
- Decision #007 mining slice is in play. Fleet / risk / player station / extractor pads stay later.
- File / Hangar show yield lines and Pull time. Gate copy: Yard fuels, shoves, and pulls.

## [v0.1.18] - 2026-09-03

### Changed
- Decision #014 complete. Docked screens — Gate, Hangar, Watch, Board, plus Pilot / Market / First hull — use Helion Cluster plates: ivory + teal on ink, teal kickers, square hairline CTAs. No separate website UI. Charts / File / Log match the same sheet.

## [v0.1.17] - 2026-08-28

### Changed
- A save slot is a career: name, call sign, and mark persist with flight progress. Creating a profile occupies a slot. Gate no longer has New. Create / delete live on Pilot, with a confirm before wipe. Credits and owned hulls stay account-wide.

## [v0.1.16] - 2026-08-29

### Added
- New-game sequence: create a pilot, then pick one free hull (Courier, Hauler, or Scout). Rank 1 still has one bay. The free claim is once per account.
- Home star is **Helios** (catalog id stays `helion` so saves and planet keys keep working).
- Twenty original line marks on the call-sign picker. Rank ladder researched (`PILOT_RANKS`) but not wired into XP yet.

### Changed
- Engage / Continue / Fly require a finished profile and an owned hull. Ghost Courier deliveries are closed. Job pay, trade, fuel, and Market refuse a stub `PILOT` row and an empty bay.

## [v0.1.15] - 2026-08-29

### Changed
- Well coast keeps the Kepler frame but no longer zeros relative velocity. Park spring runs on Arrive / first SOI capture only; throttle or OD clears it. Throttle off in a well can circle.
- Camera banks with Q/E (`clamp(bankRoll, ±0.35)`). Docking, berth, and jump stay level.
- HUD shows Free / Well / Park / Od / Dock. Speed is `spd` (inertial), `rel` (well), or `orb` (park / coast-in-well).
- Jump packets pay `JUMP_LY_AS_AU = 0.3`. A 4 u × 8 ly courier is ₡2,112, not ₡7,040. Local ₡220 / u / AU is unchanged.

## [v0.1.14] - 2026-08-28

### Added
- Merchant loop on every hub: buy, own, store on the pad, haul, sell. Forty goods in four kinds. Each lock lists eight. One galaxy tape; ₡ ticks every 15 s on a hashed random walk.
- Station **Watch**: that hub’s eight, live ₡, 24-tick spark, trend. Jobs stay the safe board.
- Gate / Hangar **Watch**: follow the full tape, click a good for a bigger chart and the locks that trade it.

### Changed
- Persist version 15. Per-slot cargo holds and hub warehouses. Hold space is shared with contract jobs.
- Tape bases follow harvest → bulk → life → parts. Ice under water, ore under steel, hydrogen under LH2. Rare dirt can beat cheap bulk; sealed cores stay above medicine.
- Lots keep a weighted-average cost. Sell is still the live tape. Watch / Pads show `@₡` basis vs tape.

## [v0.1.13] - 2026-08-28

### Changed
- One shared galactic sky for every system. Map still shows local nebula flavour.
- Flight camera FOV 95, near plane 0.01, close-up pull-in, distant-disk LOD, approach haze. Planet radii and AU spacing unchanged.
- Game day is 30 s. Stock cruise / overdrive ~2×. Gravity wells half radius.

## [v0.1.12] - 2026-08-28

### Added
- Three named save slots on Gate and Options. Continue into a slot, New wipes the active one, copy, delete. Old `starwake-v2` progress becomes slot 1.
- T2 jump fuel. FSD charge plus hop spend it. Jump lock is gated by remaining T2. HUD shows T1 and T2.
- Paid Refuel at Hangar and station: T1 ₡2 / unit, T2 ₡8 / unit, same at every hub.

### Changed
- Persist version 14. Each slot keeps ship, tanks, board, diary, and local fits. Credits and owned hulls stay on the account.
- Free in-flight F / HUD fill is gone. Fill at a lock.

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
