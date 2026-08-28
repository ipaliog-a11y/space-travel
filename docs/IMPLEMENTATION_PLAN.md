# Starwake Implementation Plan

## Executive Summary

This document provides a prioritized, phased implementation plan for all researched and designed systems in Starwake. The plan balances quick wins with foundational work, ensuring steady progress while delivering player value at each phase.

**Total Timeline:** 12-18 months (48-72 weeks)  
**Development Team:** 1-2 developers  
**Philosophy:** Iterate quickly, test often, ship regularly

---

## Phase Overview

| Phase | Duration | Focus | Key Deliverables |
|-------|----------|-------|------------------|
| **0** | 2 weeks | Foundation | Dev environment, CI/CD, testing infrastructure |
| **1** | 8 weeks | Core Systems | Ship ownership, basic ranks, material trading |
| **2** | 8 weeks | Economy | Wear/repair, rescue, insurance, market system |
| **3** | 8 weeks | Progression | Full rank system, achievements, meta-progression |
| **4** | 8 weeks | Polish | Scale optimization, UI/UX, performance, balance |
| **5** | 8 weeks | Launch | Beta testing, bug fixes, content finalization |

---

## Phase 0: Foundation (Weeks 1-2) ✅

**Status:** 50% Complete

### Completed
- ✅ Unit testing infrastructure (81 tests passing)
- ✅ E2E testing framework (Playwright configured)
- ✅ Procedural texture system (implemented & integrated)
- ✅ Scale analysis document

### Remaining
- [ ] CI/CD pipeline setup (GitHub Actions)
- [ ] Code coverage reporting
- [ ] Automated testing on PR
- [ ] Performance monitoring setup

### Tasks

#### Week 1: Testing Infrastructure
```bash
# Already Complete
✅ src/lib/starwake/math.test.ts (53 tests)
✅ src/lib/starwake/orbit.test.ts (28 tests)
✅ playwright.config.ts
✅ tests/fixtures/
✅ tests/e2e/auth.spec.ts
```

#### Week 2: CI/CD Setup
- [ ] Create `.github/workflows/ci.yml`
  - Run tests on every PR
  - Lint check
  - Type check
  - Build verification
- [ ] Add code coverage (Codecov or similar)
- [ ] Configure automated deployments for preview builds
- [ ] Set up performance regression testing

**Acceptance Criteria:**
- Green CI badge in README
- All PRs require passing tests
- Coverage reports visible
- Preview deployments automatic

---

## Phase 1: Core Systems (Weeks 3-10)

**Goal:** Implement foundational gameplay systems

### Week 3-4: Ship Ownership System (Part 1)

**Priority:** High  
**Dependencies:** None  
**Risk:** Low

#### Tasks
- [ ] **Database Schema** (2 days)
  ```sql
  -- Ships table
  CREATE TABLE player_ships (
    id UUID PRIMARY KEY,
    player_id UUID REFERENCES players(id),
    ship_type VARCHAR(50) NOT NULL, -- courier, hauler, scout, etc.
    wear_points INT DEFAULT 0,
    damage_state VARCHAR(20) DEFAULT 'pristine',
    purchased_at TIMESTAMPTZ DEFAULT NOW(),
    last_repaired_at TIMESTAMPTZ,
    insurance_policy_id UUID,
    UNIQUE(player_id, ship_type) -- One per type constraint
  );
  
  -- Hangar slots table
  CREATE TABLE hangar_slots (
    id UUID PRIMARY KEY,
    player_id UUID REFERENCES players(id),
    slot_index INT NOT NULL,
    is_locked BOOLEAN DEFAULT false, -- Locked = purchased/permanent
    unlocked_by_rank INT, -- NULL if purchased
    UNIQUE(player_id, slot_index)
  );
  ```

- [ ] **TypeScript Types** (1 day)
  - `ShipOwnership` interface
  - `WearTier` enum (5 tiers)
  - `DamageState` enum (5 states)
  - `HangarSlot` interface

- [ ] **Server Functions** (3 days)
  - `acquireShip(playerId, shipType)` - Purchase/claim ship
  - `sellShip(playerId, shipId)` - Sell with wear/resale calculation
  - `getWearTier(wearPoints)` - Calculate wear tier
  - `calculateResaleValue(ship)` - Formula implementation
  - `transferShip(playerId, shipId, newSlot)` - Move between slots

- [ ] **UI Components** (4 days)
  - Hangar management screen
  - Ship selection interface
  - Wear/damage display
  - Purchase/sell confirmations

**Deliverables:**
- Players can own 1 ship per type (max 6)
- 3 base hangar slots
- Wear tracking system
- Buy/sell functionality

---

### Week 5-6: Ship Ownership System (Part 2)

**Priority:** High  
**Dependencies:** Week 3-4 complete  
**Risk:** Medium

#### Tasks
- [ ] **Wear Mechanics** (2 days)
  ```typescript
  // Wear accumulation rates
  const WEAR_RATES = {
    normal_flight: 0.1,      // per minute
    boosting: 0.3,           // per minute
    hyperspace: 0.5,         // per jump
    docking: 1.0,            // per docking
    combat: 2.0,             // per combat minute
    emergency_landing: 5.0   // per incident
  };
  ```

- [ ] **Damage System** (3 days)
  - Implement 5 damage states
  - Efficiency penalties per state
  - Visual damage indicators
  - Critical failure chances

- [ ] **Repair System** (3 days)
  - Station repair UI
  - Cost calculation formulas
  - Time-based repairs (optional)
  - Instant vs overnight repair options

- [ ] **Integration** (2 days)
  - Wire wear accumulation to flight engine
  - Add wear HUD indicators
  - Repair station integration

**Deliverables:**
- Wear accumulates during gameplay
- 5 damage states with mechanical effects
- Station repairs functional
- Visual feedback for wear/damage

---

### Week 7-8: Basic Rank System

**Priority:** High  
**Dependencies:** Ship ownership complete  
**Risk:** Low

#### Tasks
- [ ] **Rank Data Structure** (1 day)
  ```typescript
  const RANKS = [
    { tier: 1, name: 'Cadet', xpRequired: 0, benefits: [] },
    { tier: 2, name: 'Pilot', xpRequired: 500, benefits: ['hangar_slot_4'] },
    { tier: 3, name: 'Navigator', xpRequired: 1500, benefits: ['discount_5pct'] },
    // ... 15 tiers total
    { tier: 15, name: 'Hero', xpRequired: 500000, benefits: ['all'] },
  ];
  ```

- [ ] **XP Tracking** (2 days)
  - Flight time tracker (with diminishing returns)
  - Distance traveled counter
  - Discovery counter
  - Mission completion tracker

- [ ] **XP Server Functions** (2 days)
  - `addXP(playerId, source, amount)` - Add XP with validation
  - `calculateXP(source, baseAmount)` - Apply formulas/diminishing returns
  - `checkRankUp(playerId)` - Auto-promote if threshold reached
  - `getRankBenefits(playerId)` - Calculate active benefits

- [ ] **Rank UI** (3 days)
  - Rank progression screen
  - XP bar in HUD
  - Rank-up notifications
  - Benefits display

- [ ] **Benefits Implementation** (2 days)
  - Hangar slot unlocks (slots 4-6)
  - Discount system (5-35% based on rank)
  - Priority services queue
  - Exclusive landing pads

**Deliverables:**
- 15 rank tiers implemented
- 4 XP sources with diminishing returns
- Rank benefits active
- Visual progression tracking

---

### Week 9-10: Materials Trading System (Basic)

**Priority:** High  
**Dependencies:** None  
**Risk:** Medium

#### Tasks
- [ ] **Material Database** (2 days)
  ```typescript
  const MATERIALS: Material[] = [
    {
      id: 'iron-ore',
      name: 'Iron Ore',
      category: 'metals',
      state: 'raw',
      baseValue: 8,
      massPerUnit: 1.0,
      rarity: 'common',
      sources: ['rocky', 'asteroid'],
      refinedInto: 'refined-iron',
      refineRatio: 2
    },
    // ... start with 20 core materials
  ];
  ```

- [ ] **Cargo System** (3 days)
  - Cargo hold management UI
  - Load/unload mechanics
  - Mass/volume calculations
  - Ship cargo capacity from catalog

- [ ] **Market System** (3 days)
  - Station market UI
  - Buy/sell orders
  - Price calculation (base + supply/demand)
  - Transaction history

- [ ] **Economy Balance** (2 days)
  - Set initial prices for 20 materials
  - Configure supply/demand modifiers
  - Test economic loops
  - Balance profit margins

**Deliverables:**
- 20 materials tradable
- Cargo management functional
- Station markets operational
- Basic supply/demand economics

---

## Phase 2: Economy (Weeks 11-18)

**Goal:** Deepen economic systems and add risk/reward mechanics

### Week 11-12: Insurance & Rescue

**Priority:** Medium  
**Dependencies:** Ship ownership complete  
**Risk:** Medium

#### Tasks
- [ ] **Insurance System** (3 days)
  - Policy purchase UI
  - Premium calculation (5-12% of ship value)
  - Bankruptcy protection
  - Claim processing

- [ ] **Rescue Mechanics** (3 days)
  - Rescue beacon activation
  - Cost formula: `baseCost + (distance × multiplier)`
  - Mid-transfer penalty (3× cost)
  - Frequent rescue penalties

- [ ] **Ship Recovery** (2 days)
  - Towed ship recovery
  - Abandoned ship insurance claim
  - Ship replacement flow
  - Credit deduction

- [ ] **UI/UX** (2 days)
  - Emergency services screen
  - Insurance policy management
  - Rescue confirmation dialogs
  - Cost breakdown displays

**Deliverables:**
- Insurance policies purchasable
- Rescue service functional
- Bankruptcy protection active
- Clear cost communication

---

### Week 13-14: Advanced Trading

**Priority:** High  
**Dependencies:** Basic trading complete  
**Risk:** Medium

#### Tasks
- [ ] **Expand Materials** (2 days)
  - Add remaining 113 materials from taxonomy
  - Organize by category in UI
  - Add filtering/search

- [ ] **Refining System** (3 days)
  - Refinery station UI
  - Processing recipes
  - Time-based refining
  - Output quality variations

- [ ] **Trade Routes** (2 days)
  - Suggested routes UI
  - Profitability calculator
  - Route popularity tracking
  - Community data sharing

- [ ] **Market Dynamics** (3 days)
  - Supply/demand simulation
  - Price fluctuation over time
  - Regional specialization
  - Economic events

**Deliverables:**
- 133 materials available
- Refining stations operational
- Trade route suggestions
- Dynamic market prices

---

### Week 15-16: Hangar Expansion

**Priority:** Medium  
**Dependencies:** Rank system complete  
**Risk:** Low

#### Tasks
- [ ] **Slot Purchasing** (2 days)
  - Buy slot UI
  - Cost scaling (slot 7: 50k, slot 8: 100k, etc.)
  - Payment processing
  - Slot unlocking

- [ ] **Storage Fees** (2 days)
  - Excess ship storage fees
  - Warning notifications
  - Auto-sell protection
  - Grace periods

- [ ] **Ship Management** (3 days)
  - Rename ships
  - Favorite marking
  - Active fleet selection
  - Quick swap interface

- [ ] **Organization** (2 days)
  - Filter by type/status
  - Sort by wear/value/name
  - Search functionality
  - Batch operations

**Deliverables:**
- Expandable to 12 slots
- Storage fee system
- Advanced ship management
- Clean organization UI

---

### Week 17-18: Scale Optimization

**Priority:** High  
**Dependencies:** Flight engine stable  
**Risk:** Medium

#### Tasks
- [ ] **Phase 1 Changes** (2 days)
  ```typescript
  // orbit.ts
  export const GAME_DAY_SEC = 30; // Was: 120
  
  // catalog.ts - Double all ship speeds
  courier: { cruiseSpeed: 12.8, overdriveSpeed: 108 }
  ```

- [ ] **Gravity Adjustments** (2 days)
  - Reduce gravity well sizes by 50%
  - Test approach sequences
  - Balance capture mechanics

- [ ] **Orbital Spacing** (2 days)
  - Compress planet spacing by 40%
  - Update galaxy generation
  - Verify orbital periods

- [ ] **Playtesting** (4 days)
  - Measure travel times
  - Test orbital visibility
  - Gather feedback
  - Iterate based on data

**Deliverables:**
- 75% reduction in travel times
- Visible orbital motion
- Balanced gravity wells
- Tighter system design

---

## Phase 3: Progression (Weeks 19-26)

**Goal:** Complete progression systems and add achievement tracking

### Week 19-20: Full Rank Benefits

**Priority:** Medium  
**Dependencies:** Basic ranks complete  
**Risk:** Low

#### Tasks
- [ ] **All 15 Rank Tiers** (3 days)
  - Implement remaining benefits
  - Test benefit stacking
  - Balance discount tiers
  - Exclusive unlocks

- [ ] **Visual Progression** (2 days)
  - Rank badges/insignia
  - Uniform colors (optional)
  - Title display
  - Profile customization

- [ ] **Social Features** (2 days)
  - Rank display to other players
  - Leaderboards (optional)
  - Achievement showcases
  - Reputation tracking

- [ ] **Balance Pass** (3 days)
  - XP requirement tuning
  - Benefit effectiveness
  - Early game pacing
  - Late game rewards

**Deliverables:**
- All 15 ranks fully functional
- Visual rank progression
- Social recognition systems
- Balanced progression curve

---

### Week 21-24: Achievement System

**Priority:** Medium  
**Dependencies:** Core systems stable  
**Risk:** Medium

#### Tasks
- [ ] **Achievement Database** (2 days)
  ```typescript
  const ACHIEVEMENTS: Achievement[] = [
    {
      id: 'explorer-first-jump',
      name: 'First Jump',
      description: 'Complete your first FSD jump',
      category: 'exploration',
      tier: 'bronze',
      apReward: 1,
      requirements: { jumps: 1 },
      hidden: false
    },
    // ... 75 total achievements
  ];
  ```

- [ ] **Tracking System** (3 days)
  - Event listeners for all tracked actions
  - Progress persistence
  - Milestone notifications
  - Achievement unlock flow

- [ ] **Achievement UI** (3 days)
  - Achievement list screen
  - Progress bars
  - Filter by category/tier
  - Recently unlocked feed

- [ ] **Rewards System** (2 days)
  - Achievement points (AP) tracking
  - AP spending interface
  - Cosmetic unlocks
  - Title unlocks

- [ ] **Implementation** (4 days)
  - Add all 75 achievements
  - Test unlock conditions
  - Balance AP rewards
  - Hidden achievement logic

**Deliverables:**
- 75 achievements implemented
- Full tracking system
- AP meta-progression
- Reward redemption

---

### Week 25-26: Meta-Progression

**Priority:** Low  
**Dependencies:** Achievements complete  
**Risk:** Low

#### Tasks
- [ ] **Legacy System** (3 days)
  - Account-wide unlocks
  - New Game+ bonuses
  - Prestige mechanics
  - Legacy titles

- [ ] **AP Spending** (2 days)
  - Cosmetic shop
  - Title purchases
  - Profile customization
  - Exclusive liveries

- [ ] **Long-term Goals** (2 days)
  - Career milestones
  - Lifetime statistics
  - Hall of fame
  - Community recognition

**Deliverables:**
- Meta-progression active
- AP spending meaningful
- Long-term player retention
- Prestige system

---

## Phase 4: Polish (Weeks 27-34)

**Goal:** Refine systems, improve UX, optimize performance

### Week 27-28: UI/UX Overhaul

**Priority:** High  
**Dependencies:** All systems functional  
**Risk:** Low

#### Tasks
- [ ] **Consistency Pass** (3 days)
  - Unified color scheme
  - Consistent typography
  - Icon standardization
  - Animation language

- [ ] **Accessibility** (3 days)
  - Colorblind modes
  - Scalable UI (200%)
  - Keyboard navigation
  - Screen reader support

- [ ] **Feedback Systems** (2 days)
  - Haptic feedback
  - Audio cues
  - Visual feedback
  - Notification system

- [ ] **Tutorial Integration** (2 days)
  - Contextual hints
  - First-time flows
  - Help system
  - Best practices tips

**Deliverables:**
- Polished, consistent UI
- Accessibility compliance
- Rich feedback systems
- Integrated tutorials

---

### Week 29-30: Performance Optimization

**Priority:** High  
**Dependencies:** All features complete  
**Risk:** Medium

#### Tasks
- [ ] **Profiling** (2 days)
  - Identify bottlenecks
  - Memory usage analysis
  - Frame time breakdown
  - Network latency audit

- [ ] **Shader Optimization** (2 days)
  - Procedural texture performance
  - LOD system for distant bodies
  - Batch rendering
  - GPU instancing

- [ ] **Code Optimization** (3 days)
  - Reduce bundle size
  - Lazy loading
  - Code splitting
  - Cache optimization

- [ ] **Network Optimization** (2 days)
  - Request batching
  - Response compression
  - Optimistic UI updates
  - Offline mode (basic)

**Deliverables:**
- 60 FPS target met
- < 100ms action latency
- Optimized bundle size
- Smooth gameplay experience

---

### Week 31-32: Balance Pass

**Priority:** High  
**Dependencies:** All systems complete  
**Risk:** Medium

#### Tasks
- [ ] **Economic Balance** (3 days)
  - Credit sink analysis
  - Income vs expense ratios
  - Inflation control
  - Trade route profitability

- [ ] **Progression Balance** (2 days)
  - XP requirement tuning
  - Rank benefit effectiveness
  - Achievement difficulty
  - Time-to-unlock estimates

- [ ] **Ship Balance** (2 days)
  - Wear rate adjustments
  - Repair cost tuning
  - Ship role differentiation
  - Module effectiveness

- [ ] **Playtesting** (3 days)
  - Closed alpha testing
  - Feedback collection
  - Data analysis
  - Iterative adjustments

**Deliverables:**
- Balanced economy
- Fair progression
- Distinct ship roles
- Data-driven tuning

---

### Week 33-34: Content Finalization

**Priority:** Medium  
**Dependencies:** Systems balanced  
**Risk:** Low

#### Tasks
- [ ] **Achievement Tuning** (2 days)
  - Difficulty adjustments
  - Reward balancing
  - Hidden achievement placement
  - Final playtesting

- [ ] **Lore Integration** (2 days)
  - Ship backstories
  - Station histories
  - System descriptions
  - Material flavor text

- [ ] **Polish Pass** (3 days)
  - Bug fixing
  - Visual polish
  - Audio tuning
  - Performance tweaks

- [ ] **Documentation** (2 days)
  - Player manual
  - Wiki creation
  - FAQ compilation
  - Known issues list

**Deliverables:**
- Rich game world
- Comprehensive documentation
- Polished experience
- Ready for beta

---

## Phase 5: Launch (Weeks 35-42)

**Goal:** Beta test, fix issues, prepare for public launch

### Week 35-38: Closed Beta

**Priority:** Critical  
**Dependencies:** All content complete  
**Risk:** High

#### Tasks
- [ ] **Beta Infrastructure** (2 days)
  - Beta branch setup
  - Feedback collection system
  - Bug tracking workflow
  - Community management tools

- [ ] **Beta Testing** (10 days)
  - 100-500 beta testers
  - Daily build updates
  - Active bug fixing
  - Balance adjustments

- [ ] **Analytics** (3 days)
  - Player behavior tracking
  - Economy monitoring
  - Progression analytics
  - Churn analysis

- [ ] **Critical Fixes** (5 days)
  - Game-breaking bugs
  - Exploit patches
  - Performance issues
  - Data loss prevention

**Deliverables:**
- Stable beta build
- Bug database cleared
- Community feedback integrated
- Analytics dashboard

---

### Week 39-42: Launch Preparation

**Priority:** Critical  
**Dependencies:** Beta successful  
**Risk:** High

#### Tasks
- [ ] **Launch Build** (2 days)
  - Final stabilization
  - Release candidate testing
  - Gold master approval
  - Deployment preparation

- [ ] **Marketing** (3 days)
  - Steam page setup
  - Trailer creation
  - Press kit
  - Social media campaign

- [ ] **Infrastructure** (2 days)
  - Server scaling
  - Database optimization
  - CDN setup
  - Monitoring systems

- [ ] **Launch Day** (1 day)
  - Go-live deployment
  - Community management
  - Hotfix readiness
  - Celebration! 🎉

**Deliverables:**
- Public launch
- Stable infrastructure
- Active community
- Post-launch roadmap

---

## Post-Launch Roadmap

### Month 1-2: Stabilization
- Critical bug fixes
- Community feedback implementation
- Balance adjustments
- Performance optimizations

### Month 3-4: Content Update 1
- New ship type (optional)
- Additional materials (20-30)
- New achievements (15-20)
- Quality of life improvements

### Month 5-6: Content Update 2
- New game mode (challenge runs)
- Community goals
- Seasonal events
- DLC preparation

### Month 7-12: Expansion
- Major DLC development
- Multiplayer features (if applicable)
- Platform expansion (consoles)
- Mod support (if feasible)

---

## Resource Requirements

### Development Team
- **1-2 Full-stack Developers** (TypeScript, React, Node.js)
- **1 Artist** (part-time, UI/UX)
- **1 Community Manager** (part-time, during beta/launch)

### Infrastructure
- **Development:** GitHub, Vercel/Netlify, Discord
- **Testing:** Playwright, GitHub Actions, Codecov
- **Production:** PostgreSQL, Redis (optional), CDN
- **Analytics:** Custom or third-party (Mixpanel, etc.)

### Budget Estimate (if outsourcing)
- **Phase 0-2:** $50k-80k (core systems)
- **Phase 3-4:** $40k-60k (progression & polish)
- **Phase 5:** $20k-30k (launch & marketing)
- **Total:** $110k-170k for 10-month development

---

## Risk Management

### Technical Risks
- **Database scalability** → Mitigation: Early load testing
- **Performance issues** → Mitigation: Continuous profiling
- **Exploit vulnerabilities** → Mitigation: Server-side validation

### Design Risks
- **Economy imbalance** → Mitigation: Weekly balance passes
- **Progression too slow/fast** → Mitigation: Analytics-driven tuning
- **Player retention** → Mitigation: Meta-progression, daily goals

### Schedule Risks
- **Feature creep** → Mitigation: Strict scope management
- **Bug accumulation** → Mitigation: Test-driven development
- **Burnout** → Mitigation: Realistic milestones, regular breaks

---

## Success Metrics

### Development Milestones
- ✅ Phase 1 complete: Core loop functional
- ✅ Phase 2 complete: Economy balanced
- ✅ Phase 3 complete: Progression satisfying
- ✅ Phase 4 complete: Polish acceptable
- ✅ Phase 5 complete: Launch successful

### Player Metrics (Post-Launch)
- **Day 1 Retention:** > 60%
- **Day 7 Retention:** > 30%
- **Day 30 Retention:** > 15%
- **Average Session Length:** > 45 minutes
- **Conversion Rate (if F2P):** > 3%

### Quality Metrics
- **Crash Rate:** < 1%
- **Bug Reports:** < 10 per 1000 players
- **Steam Rating:** > 80% Positive
- **Average Playtime:** > 20 hours

---

## Immediate Next Steps

Canonical short list: [`BUILD.md`](../BUILD.md). Flavour from [`docs/sessions/session-2026-08-28-progress-review.md`](sessions/session-2026-08-28-progress-review.md).

Week 1 hangar / haul loop is in play. **Do not skip 1–3.**

### Live loop (now)
1. [x] **Save state slots** — 3 named slots; per-slot persist (ship, fuel, board, diary, local fits)
2. [x] **T2 fuel for jumps** — second tank; HUD; lock gated by T2
3. [x] **Resource fuel prices** — credits per T1 / T2 at the lock

### Travel / sky (can overlap 1–3)
4. [ ] **Shared galaxy skybox** — one background for all systems
5. [ ] **Close-up scale** — camera FOV / near-plane; do not grow planet radii
6. [ ] **Travel feel** — 30 s day, ~2× speeds, half wells; 15–30 s between POIs

### Economy (after 1–3)
7. [ ] **Merchant + market watch** — own cargo, hold, speculate; history charts per hub
8. [ ] **Hull roles** — Clipper → passenger, Tug → salvage, add Extractor; 3D art pass
9. [ ] **Planet mining** — hub-less worlds, gas/liquid/solid, Extractor then pads
10. [ ] **Fleet** — NPC ships on contracts only; upkeep
11. [ ] **Risk / events** — pirates, market shocks (feeds the watch)
12. [ ] **Player station** — buy storage, then price leverage

### Still pending from earlier
- [ ] Insurance design
- [ ] Wear-rate balance after the debug HUD has been play-tested

---

## Conclusion

This implementation plan provides a clear, actionable roadmap from current state to successful launch. The phased approach ensures:

1. **Steady Progress** - Each phase delivers tangible value
2. **Flexibility** - Can adjust based on feedback
3. **Quality** - Testing and polish built into each phase
4. **Sustainability** - Realistic timeline, manageable scope

**Key Success Factors:**
- Stick to scope (avoid feature creep)
- Test early and often
- Listen to player feedback
- Balance data-driven with vision-driven decisions
- Celebrate milestones

**Let's build an amazing space trading game! 🚀**

---

**Last Updated:** 2026-08-28  
**Version:** 1.1  
**Status:** Live-loop 1–3 in play (slots, T2, paid pump). Next is shared sky / camera scale.  
**Next Review:** After travel / sky (BUILD 4–6)
