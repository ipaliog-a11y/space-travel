# Hangar Testing Guide

## Quick Start

### Option 1: Automated Test Setup (Recommended)

1. **Navigate to:** `http://localhost:8080/hangar-test`
2. **Click:** "🚀 Setup Test Account" button
3. **Result:** You'll instantly own 6 ships (one of each type)
4. **Test:** All hangar features with real data

### Option 2: Manual Profile Creation

1. **Navigate to:** `http://localhost:8080/profile`
2. **Create profile:** Enter name, call sign, select icon
3. **Navigate to:** `/test-ship-ownership` to acquire ships via backend tests
4. **Navigate to:** `/hangar` to view your ships

## What to Test

### Hangar Page (`/hangar`)

#### 1. Fleet Overview
- [ ] See total ship count
- [ ] See fleet value
- [ ] See average wear percentage
- [ ] See ship type diversity
- [ ] See best/worst condition ships

#### 2. Ship Cards
- [ ] Each ship shows correct type icon
- [ ] Wear bar displays correctly (green → red)
- [ ] Wear tier badge shows (Excellent/Good/Fair/Poor/Critical)
- [ ] Stats grid shows:
  - [ ] Wear points / max pool
  - [ ] Hardpoint tier (Stock/Mk1/Mk2/Mk3)
  - [ ] Efficiency percentage
  - [ ] Resale value in credits

#### 3. Filters
- [ ] Filter by ship type (Courier, Hauler, Scout, etc.)
- [ ] Filter by condition (Excellent, Good, Fair, Poor, Critical)
- [ ] Search by typing ship type name
- [ ] Clear filters by selecting "All"

#### 4. Sorting
- [ ] Sort by purchase date (newest/oldest)
- [ ] Sort by wear level (most/least worn)
- [ ] Sort by resale value (highest/lowest)
- [ ] Sort by ship type (alphabetical)
- [ ] Toggle ascending/descending

#### 5. Ship Detail Modal
- [ ] Click "View Details" on any ship
- [ ] Modal opens with full ship information
- [ ] Wear bar shows condition visually
- [ ] Stats display correctly
- [ ] Repair slider works (move it around)
- [ ] Close modal (X button or outside click)

### Profile Page (`/profile`)

#### If Creating Profile
- [ ] Select icon from grid
- [ ] Enter display name (required)
- [ ] Enter call sign (3-20 chars)
- [ ] Click "Create Profile"
- [ ] Profile saves and displays
- [ ] Click "Edit Profile" to modify

#### If Editing Profile
- [ ] Change display name
- [ ] Change call sign
- [ ] Change icon
- [ ] Save changes
- [ ] Verify changes persist

### Backend Tests (`/test-ship-ownership`)

#### Automatic Tests
When you load the page, it runs 13 tests:
- [ ] Acquire Courier ship ✅
- [ ] Acquire Hauler ship ✅
- [ ] Acquire Scout ship ✅
- [ ] Prevent duplicate (should fail gracefully) ✅
- [ ] Get player ships ✅
- [ ] Add wear (normal flight) ✅
- [ ] Add wear (boosting) ✅
- [ ] Add wear (hyperspace jump) ✅
- [ ] Get ship details ✅
- [ ] Repair ship ✅
- [ ] Upgrade hardpoint ✅
- [ ] Calculate resale value ✅
- [ ] Wear configuration ✅

**Expected Result:** All tests should pass (green checkmarks)

## Test Scenarios

### Scenario 1: First-Time User
1. Go to `/profile`
2. Create pilot profile
3. Go to `/hangar-test`
4. Click "Setup Test Account"
5. Verify 6 ships appear in hangar
6. Click on a ship card
7. View details modal
8. Try filtering ships

### Scenario 2: Fleet Manager
1. Go to `/hangar`
2. Filter to show only "Courier" ships
3. Sort by "Wear Level" ascending
4. Find ship with most wear
5. View details
6. Check if repair button works

### Scenario 3: Backend Verification
1. Go to `/test-ship-ownership`
2. Wait for tests to complete
3. Verify all 13 tests pass
4. Check test results JSON
5. Note any failures

## Expected Behaviors

### Visual Indicators
- **Green** = Excellent/Good condition, high efficiency
- **Blue** = Good condition
- **Yellow** = Fair condition, moderate wear
- **Orange** = Poor condition
- **Red** = Critical condition, needs repair

### Wear System
- 0-20% wear = Excellent (0% penalty)
- 21-40% wear = Good (5% penalty)
- 41-60% wear = Fair (10% penalty)
- 61-80% wear = Poor (15% penalty)
- 81-100% wear = Critical (20% penalty)

### Ship Values
- Base price: 100,000 - 200,000 credits
- Resale: 30-70% of base (depends on wear)
- Hardpoint upgrades increase max wear pool

## Known Limitations

### Currently Not Working (Expected)
- ❌ Repair button (no cost calculation yet)
- ❌ Upgrade button (no upgrade cost yet)
- ❌ Sell button (no confirmation dialog yet)
- ❌ Market page (not created yet)
- ❌ Credit deduction (no economy integration yet)

### Placeholders
- 📦 Ship icons = emojis (will be 3D models)
- 📦 Base prices = hardcoded (will be config)
- 📦 Repair costs = not calculated (coming in 2.2)

## Success Criteria

### Phase 2.1 Complete When:
- ✅ Can view all ships in hangar
- ✅ Ship cards show correct data
- ✅ Filters work correctly
- ✅ Sorting works correctly
- ✅ Modal opens and displays details
- ✅ Stats calculate correctly
- ✅ UI is responsive (mobile to desktop)
- ✅ No console errors

### Backend Tests Pass When:
- ✅ All 13 tests show green checkmarks
- ✅ No red "FAIL" results
- ✅ Test completion message appears

## Troubleshooting

### "Database columns don't exist"
**Fix:** Restart dev server to apply migrations

### "No ships in hangar"
**Fix:** Click "Setup Test Account" or run backend tests

### "Profile not found"
**Fix:** Create profile at `/profile` first

### Tests failing
**Fix:** Check terminal for database errors, restart server

## Next Steps

After testing hangar:
1. Report any bugs found
2. Test wear accumulation during flight (Session 2.3)
3. Test repair station UI (Session 2.2)
4. Test market/purchase system (Session 2.4)

---

**Test Environment:** `http://localhost:8080/hangar-test`  
**Hangar Page:** `http://localhost:8080/hangar`  
**Profile Page:** `http://localhost:8080/profile`  
**Backend Tests:** `http://localhost:8080/test-ship-ownership`
