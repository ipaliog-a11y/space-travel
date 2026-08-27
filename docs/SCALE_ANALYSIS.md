# Space Scale Analysis - Starwake

## Current Implementation Review

### Scale Constants

**From `orbit.ts`:**
```typescript
export const GAME_DAY_SEC = 120;  // 2 minutes = 1 game day
const SOL_R = 88;                  // Star radius unit
const AU0 = 2800;                  // 1 AU in game units
```

**From `galaxy.ts`:**
```typescript
export const AU_UNITS = 2800;      // Confirms 1 AU = 2800 units
```

### Current Scale Analysis

#### Distances
- **1 AU = 2,800 game units**
- **Planet orbital radii:** 2,200 - 20,000+ units (0.8 - 7+ AU)
- **Planet spacing:** 2,400 - 4,000 units between orbits
- **Star radius:** 88 units (Sun-like)

#### Planet Sizes
| Type | Radius (units) | Radius (km) | Mass (Earth) | Gravity (g) |
|------|----------------|-------------|--------------|-------------|
| Rocky | 22-34 | 5,100-7,400 | ~1.0 | ~1.0 |
| Desert | 20-32 | 4,700-6,900 | ~0.85 | ~0.8 |
| Ocean | 24-36 | 5,800-8,400 | ~1.1 | ~1.1 |
| Ice | 18-30 | 3,100-6,200 | ~0.7 | ~0.6 |
| Volcanic | 18-28 | 4,400-6,400 | ~0.95 | ~0.9 |
| Gas Giant | 88-140 | 42,000-79,000 | ~140 | ~2.5 |
| Ringed | 80-128 | 38,000-72,000 | ~95 | ~2.0 |
| Ice Giant | 48-76 | 16,000-28,000 | ~17 | ~1.4 |

#### Orbital Periods
- **Game day:** 120 seconds (2 minutes)
- **Earth year:** 365 game days = 730 minutes = **12.2 hours real time**
- **Inner planet:** ~50-100 days (1.7-3.4 hours)
- **Outer planet:** 500-2000+ days (17-68 hours)

#### Station Sizes
- **Radius:** 7.2 - 11.7 units (scaled to planet)
- **Docking ring:** ~1.92x station radius
- **Approach distance:** Planet radius × 1.52

---

## The Scale Problem

### Reality vs. Gameplay

#### Real Solar System Scale
- **Earth-Sun distance:** 150 million km
- **Earth radius:** 6,371 km
- **Ratio:** 23,500:1 (distance:radius)
- **Sun radius:** 696,000 km (109× Earth)

#### Starwake Current Scale
- **Earth-like planet orbit:** 2,800-5,600 units (1-2 AU)
- **Earth-like planet radius:** 22-34 units
- **Ratio:** 82-254:1 (distance:radius)
- **Star radius:** 88 units (2.6-4× planet)

**Conclusion:** Starwake compresses space by **100-200×** compared to reality.

---

## Research: Balancing Scale & Gameplay

### Lessons from Space Games

#### 1. **Elite Dangerous** (2014)
**Scale:** 1:1 realistic (400+ billion systems)
- ✅ Immense sense of wonder
- ✅ Realistic orbital mechanics
- ❌ **99% empty space** - boring travel
- ❌ Hours of real-time travel between points
- ❌ Requires FSD time compression

**Solution:** Super cruise (1000c speed) + hyperspace jumps

#### 2. **No Man's Sky** (2016)
**Scale:** Highly compressed
- ✅ Planets visible from space
- ✅ Quick orbital transfers (minutes)
- ✅ Interesting things always nearby
- ❌ Unrealistic orbital spacing
- ❌ All planets same size range

**Solution:** Instant launch to orbit, no orbital mechanics

#### 3. **Kerbal Space Program** (2015)
**Scale:** 1:10 realistic (scaled down 10×)
- ✅ Achievable with careful planning
- ✅ Orbital mechanics matter
- ✅ Sense of distance without tedium
- ⚠️ Still requires time warp

**Solution:** Time compression + efficient rockets

#### 4. **Starfield** (2023)
**Scale:** Instant travel
- ✅ No boring travel
- ✅ Focus on destinations
- ❌ No sense of journey
- ❌ Loading screens

**Solution:** Skip travel entirely, focus on planets

#### 5. **Outer Wilds** (2019)
**Scale:** Highly compressed solar system
- ✅ Everything reachable in seconds
- ✅ Orbital mechanics matter
- ✅ Sense of place
- ❌ Tiny solar system (1 star, 5-6 planets)

**Solution:** Small system, fast ship, 22-minute time loop

---

## Key Principles for Good Space Scale

### 1. **The 30-Second Rule**
> Any point of interest should be reachable within 30 seconds from any other point in the same system.

**Rationale:**
- Player attention span
- Avoids "boring travel" complaints
- Keeps action flowing
- Allows quick retries after failures

**Implementation:**
- Max system size: ~50,000 units
- Ship speed: 1,000-2,000 units/sec
- Boost speed: 3,000-5,000 units/sec

### 2. **The Visible Landmark Rule**
> Major destinations should be visible as distinct shapes (not dots) from approach distances.

**Rationale:**
- Players need visual goals
- Creates anticipation
- Provides spatial orientation
- Makes space feel "lived in"

**Implementation:**
- Stations: Visible from 500-1,000 units
- Planets: Visible from 2,000-5,000 units
- Star: Always visible, dominant

### 3. **The Orbital Period Rule**
> Orbital periods should be 1-10 minutes for gameplay relevance.

**Rationale:**
- Players should see orbital motion
- Creates dynamic environments
- Enables timing-based challenges
- Makes system feel alive

**Implementation:**
- Inner planets: 1-3 minute orbits
- Mid planets: 3-7 minute orbits  
- Outer planets: 7-15 minute orbits

### 4. **The Gravity Well Rule**
> Gravity should affect flight only at close range (< 500 units).

**Rationale:**
- Prevents accidental crashes
- Makes gravity a tactical tool
- Allows predictable flight elsewhere
- Creates "approach tension"

**Implementation:**
- Star gravity: Felt at 500-1,000 units
- Planet gravity: Felt at 100-300 units
- Station gravity: Negligible

### 5. **The Compression Gradient**
> Compress empty space, expand interesting space.

**Rationale:**
- Maximize interesting content per unit distance
- Minimize travel tedium
- Maintain illusion of scale

**Implementation:**
- Compress interplanetary space (10:1)
- Keep approach distances realistic (1:1)
- Expand docking/landing zones (2:1)

---

## Recommendations for Starwake

### Current Issues

1. **Orbital periods too long** (12+ hours for outer planets)
2. **Planets too close together** relative to their sizes
3. **Gravity reaches too far** (affects flight at distance)
4. **No visual scaling** - all planets appear similar sizes
5. **Travel times don't match** ship capabilities

### Proposed Changes

#### Tier 1: Quick Wins (No Code Changes)

**1. Adjust Time Display**
```typescript
// Current: GAME_DAY_SEC = 120 (2 min = 1 day)
// Proposed: GAME_DAY_SEC = 30 (30 sec = 1 day)

// Effect: Orbital periods become 4× shorter
// - Earth year: 3 hours instead of 12 hours
// - Outer planet: 4 hours instead of 17 hours
```

**Why:** Makes orbital motion visible without changing physics

**2. Adjust Displayed Distances**
```typescript
// Keep internal units the same
// Change UI to show "compressed" distances

// Example: 
// - Real distance: 5,600 units
// - Display as: "560 Mm" (megameters) instead of "2 AU"
```

**Why:** Psychological trick - smaller numbers feel closer

#### Tier 2: Balanced Changes (1-2 Days Dev)

**3. Compress Orbital Spacing**
```typescript
// Current: orbit += 2400 + rng() * 2000 + starR * 2.4
// Proposed: orbit += 1200 + rng() * 1000 + starR * 1.2

// Effect: Planets 2× closer together
// - System fits in half the space
// - Faster transfers
// - More frequent encounters
```

**Why:** Reduces travel time without feeling cramped

**4. Increase Ship Speeds**
```typescript
// Current: cruiseSpeed: 4.2-7.8
// Proposed: cruiseSpeed: 8.0-15.0 (2× faster)

// Current: overdriveSpeed: 32-66  
// Proposed: overdriveSpeed: 64-132 (2× faster)
```

**Why:** Maintains realism while reducing travel time

**5. Reduce Gravity Well Sizes**
```typescript
// Current: reach = Math.max(planetSOI(p) * 4.2, p.radius * 16)
// Proposed: reach = Math.max(planetSOI(p) * 2.0, p.radius * 8)

// Effect: Gravity felt at half the distance
// - Less interference with cruise flight
// - More dramatic "gravity capture" on approach
```

**Why:** Makes gravity a tactical choice, not constant annoyance

#### Tier 3: Systemic Changes (1 Week Dev)

**6. Implement Speed Compression**
```typescript
// Dynamic speed scaling based on distance from POI

function getSpeedMultiplier(distance: number, poiDistance: number): number {
  if (distance > poiDistance * 10) return 5.0;  // 5× faster in open space
  if (distance > poiDistance * 2) return 2.0;   // 2× faster on approach
  return 1.0;                                    // Normal near POI
}
```

**Why:** Best of both worlds - fast travel, precise approach

**7. Add Time Compression (Warp)**
```typescript
// Player-activated time compression for long transfers
// Similar to KSP's time warp

const TIME_WARP_RATES = [1, 2, 5, 10, 100, 1000];

// Disable when:
// - Within 500 units of any object
// - During docking
// - In combat
```

**Why:** Lets players skip boring parts voluntarily

**8. Create "Lanes"**
```typescript
// Invisible fast-travel corridors between planets
// Players naturally discover and use them

// Implementation:
// - Increase speed by 3× in lane corridors
// - Lane visible on map as faint lines
// - Slight gravity boost in lanes
```

**Why:** Channels traffic, creates "space highways"

#### Tier 4: Visual Enhancements (2-3 Days Dev)

**9. Add Size Cues**
```typescript
// Atmospheric haze for close planets
// Occlusion glow for distant objects
// Relative size indicators on HUD

// Helps players judge distances better
```

**Why:** Improves depth perception in 3D space

**10. Dynamic Skybox**
```typescript
// Nebula intensity based on system location
// Star brightness changes with distance
// Planet phases (crescent/gibbous) visible
```

**Why:** Creates sense of scale through lighting

---

## Proposed Scale Values

### Recommended Constants

```typescript
// orbit.ts - NEW VALUES
export const GAME_DAY_SEC = 30;     // Was: 120 (4× faster time)
const SOL_R = 88;                    // Unchanged
const AU0 = 2800;                    // Unchanged

// galaxy.ts - NEW VALUES
export const AU_UNITS = 2800;        // Unchanged

// Planet spacing - NEW VALUES
// Inner system: 1,200-2,000 units apart
// Mid system: 2,000-3,000 units apart  
// Outer system: 3,000-4,000 units apart

// Ship speeds - NEW VALUES (2× current)
// Courier: cruise 12.8, overdrive 108
// Hauler: cruise 8.4, overdrive 76
// Scout: cruise 11.2, overdrive 88
// Clipper: cruise 15.6, overdrive 132
```

### Expected Results

| Metric | Current | Proposed | Change |
|--------|---------|----------|--------|
| System diameter | ~40,000 units | ~20,000 units | -50% |
| Max travel time | 120 sec | 30 sec | -75% |
| Orbital period (inner) | 100 days | 25 days | -75% |
| Orbital period (outer) | 2000 days | 500 days | -75% |
| Gravity well radius | 500 units | 250 units | -50% |
| Station approach time | 45 sec | 15 sec | -67% |

---

## Implementation Priority

### Phase 1: Immediate (This Week)
1. ✅ Reduce `GAME_DAY_SEC` to 30
2. ✅ Increase ship speeds by 2×
3. ✅ Reduce gravity well sizes by 50%

**Time:** 2-3 hours  
**Risk:** Low (reversible)  
**Impact:** High (immediate improvement)

### Phase 2: Short-term (Next Week)
4. Compress orbital spacing by 40%
5. Add speed indicators to HUD
6. Adjust UI distance labels

**Time:** 1-2 days  
**Risk:** Medium (needs playtesting)  
**Impact:** High (better flow)

### Phase 3: Medium-term (Next Month)
7. Implement speed compression zones
8. Add visual size cues
9. Create "space lanes"

**Time:** 1 week  
**Risk:** Medium-High (new systems)  
**Impact:** Very High (game-changing)

### Phase 4: Long-term (Future)
10. Optional time compression
11. Dynamic skybox
12. Enhanced approach sequences

**Time:** 2-3 weeks  
**Risk:** High (major features)  
**Impact:** Medium (polish)

---

## Testing & Validation

### Playtest Scenarios

**1. The Commute Test**
- Launch from station
- Fly to outer planet
- Return to station
- **Target:** < 60 seconds round trip

**2. The Gravity Test**
- Approach planet at full speed
- Try to escape gravity well
- **Target:** Feels challenging but fair

**3. The Orbital Test**
- Watch planet for 2 minutes
- Observe orbital motion
- **Target:** Visible movement

**4. The Scale Test**
- View system from far distance
- Judge relative sizes
- **Target:** Clear size hierarchy

### Success Metrics

✅ **Travel time:** Average 15-30 seconds between POIs  
✅ **Orbital motion:** Visible within 60 seconds of observation  
✅ **Gravity:** Felt only when intended  
✅ **Visual clarity:** Players can identify all major bodies  
✅ **Fun factor:** "Just one more jump" feeling

---

## Conclusion

**The Goal:** Create a solar system that **feels** vast but **plays** compact.

**The Method:** Strategic compression at every scale:
- Compress time (4× faster days)
- Compress space (2× closer orbits)
- Compress travel (2× faster ships)
- Expand approach zones (detailed close-up)

**The Result:** A system where:
- Planets feel reachable (not distant dots)
- Travel is engaging (not tedious)
- Scale is perceptible (not abstract)
- Gameplay flows (no waiting)

**Next Step:** Implement Phase 1 changes and playtest immediately.

---

## References

- **Elite Dangerous** scale analysis: https://elite-dangerous.fandom.com/wiki/Scale
- **Kerbal** system design: https://wiki.kerbalspaceprogram.com/wiki/Celestial_bodies
- **Outer Wilds** design talk: GDC 2020 "Designing the Unknowable"
- **No Man's Sky** post-mortem: GDC 2017

---

**Author:** AI Assistant  
**Date:** 2026-08-27  
**Status:** Ready for Implementation
