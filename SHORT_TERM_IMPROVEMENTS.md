# Short-Term Improvements Plan

This document outlines the implementation plan for medium-priority improvements identified in the project review.

## Overview

**Goal:** Improve code quality, testing coverage, documentation, accessibility, and mobile support.

**Timeline:** 2-3 weeks of focused development

**Priority Order:**
1. Unit tests for math/orbit calculations (foundational)
2. E2E tests with Playwright (critical for user flows)
3. Architecture documentation (enables contributors)
4. Accessibility audit (inclusive design)
5. Mobile touch controls (expands user base)

---

## 1. Unit Tests for Math/Orbit Calculations

**Why:** The flight engine relies on precise mathematical calculations for orbital mechanics, quaternions, and vector math. Bugs here cause cascading failures.

**Scope:**
- `src/lib/starwake/math.ts` - Vector/quaternion/matrix operations
- `src/lib/starwake/orbit.ts` - Orbital mechanics calculations
- `src/lib/starwake/galaxy.ts` - Procedural generation helpers

**Test Framework:** Node.js built-in test runner (already configured in package.json)

**File Structure:**
```
src/lib/starwake/
  math.test.ts
  orbit.test.ts
  galaxy.test.ts
```

**Key Test Cases:**

### math.ts
- Quaternion operations (multiply, invert, normalize, slerp)
- Matrix operations (perspective, view, rotation)
- Vector math (rotateVec, composition)
- Utility functions (clamp, wrapDelta)

### orbit.ts
- `circularVelocity` - orbital speed calculations
- `gravityAt` - gravitational acceleration
- `keplerState` - orbital position from elements
- `orbitPolyline` - orbit path generation
- `planetSOI` - sphere of influence calculations

### galaxy.ts
- `distLy` - distance calculations
- `inBelt` - belt collision detection
- `moonProximity` / `planetProximity` - approach detection
- Procedural generation consistency

**Coverage Target:** 80%+ line coverage for tested files

---

## 2. E2E Tests with Playwright

**Why:** Critical user flows (auth, flight controls, navigation) need end-to-end validation.

**Scope:**
- Authentication flow (sign-in, sign-out, session persistence)
- Flight controls (throttle, boost, turn, jump)
- Map navigation (system map, galaxy map, lock selection)
- Docking/undocking sequences

**File Structure:**
```
tests/
  e2e/
    auth.spec.ts
    flight-controls.spec.ts
    navigation.spec.ts
    docking.spec.ts
  fixtures/
    test-auth.ts
    test-flight.ts
```

**Test Framework:** Playwright (already in devDependencies)

**Key Test Scenarios:**

### auth.spec.ts
- Sign in with OAuth provider
- Session persistence across page reload
- Sign out clears session
- Protected routes redirect to sign-in

### flight-controls.spec.ts
- Throttle increases/decreases speed
- Boost consumes fuel and increases speed
- Pitch/yaw/roll change orientation
- Jump sequence: lock → charge → tunnel → drop

### navigation.spec.ts
- Open system map shows planets
- Open galaxy map shows stars
- Lock target sets navigation
- Map closes on selection

### docking.spec.ts
- Approach station triggers docking
- Docking sequence completes
- Undock returns to flight
- Berthed state prevents flight controls

**Configuration:**
```ts
// playwright.config.ts
export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30000,
  use: {
    baseURL: 'http://localhost:8080',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  webServer: {
    command: 'npm run dev',
    port: 8080,
    timeout: 120000,
    reuseExistingServer: true,
  },
})
```

---

## 3. Architecture Documentation

**Why:** Contributors need to understand the system structure, data flow, and key decisions.

**Deliverables:**

### ARCHITECTURE.md (High-level overview)
- System diagram
- Technology choices
- Directory structure
- Data flow diagrams

### docs/ARCHITECTURE/
- `database.md` - Dual-mode DB architecture
- `auth.md` - Authentication flow
- `rendering.md` - WebGL rendering pipeline
- `flight-engine.md` - Flight mechanics

### API.md (Server functions)
- Database API
- Auth API
- Game state API

**Tools:**
- Mermaid.js for diagrams
- TypeScript doc comments for API docs
- Excalidraw for system diagrams (optional)

---

## 4. Accessibility Audit

**Why:** Despite the a11y org name, no accessibility features are visible. Web games must be inclusive.

**Audit Areas:**

### Keyboard Navigation
- All interactive elements focusable
- Logical tab order
- Focus indicators visible
- Keyboard shortcuts documented

### Screen Reader Support
- ARIA labels on canvas controls
- Live regions for dynamic content
- Alt text for images
- Semantic HTML structure

### Visual Accessibility
- Color contrast ratios (WCAG AA)
- Scalable UI (zoom to 200%)
- Reduced motion support
- Colorblind-friendly palette

### Cognitive Accessibility
- Clear instructions
- Consistent navigation
- Error prevention/recovery
- Time limit extensions

**Implementation Plan:**

1. **Audit Tools:**
   - axe-core automated testing
   - Lighthouse accessibility score
   - Manual keyboard testing
   - Screen reader testing (NVDA/JAWS)

2. **Quick Wins:**
   - Add ARIA labels to all buttons
   - Ensure focus management in modals
   - Add skip links
   - Document keyboard shortcuts

3. **Canvas Accessibility:**
   - Provide text alternatives for game state
   - Audio descriptions for key events
   - Keyboard flight controls (already present)

4. **UI Components:**
   - Radix UI has good a11y defaults
   - Ensure proper role/label/aria attributes
   - Test with screen readers

**Target:** WCAG 2.1 Level AA compliance

---

## 5. Mobile Touch Controls

**Why:** "Touch-first" mentioned in docs but not implemented. Mobile expands reach significantly.

**Design Principles:**
- Touch gestures map to flight controls
- Virtual joysticks for pitch/yaw/roll
- Throttle slider
- Boost button
- Map/jump buttons

**Implementation:**

### Touch Control Components
```
src/components/starwake/
  TouchControls.tsx      - Main touch interface
  VirtualJoystick.tsx    - Reusable joystick
  ThrottleSlider.tsx     - Throttle control
  TouchButton.tsx        - Action buttons
```

### Gesture Mapping
- **Drag left/right:** Yaw
- **Drag up/down:** Pitch
- **Two-finger rotate:** Roll
- **Slide left edge:** Throttle
- **Tap right:** Boost
- **Double-tap:** Jump (when locked)

### Implementation Approach
1. Use Pointer Events API (unified mouse/touch)
2. Add virtual joystick library or custom implementation
3. Haptic feedback for key events
4. Visual feedback for touch points
5. Sensitivity settings

### Testing
- Real device testing (iOS/Android)
- Chrome DevTools device emulation
- Playwright mobile viewport tests

---

## Implementation Timeline

### Week 1: Foundation
- **Days 1-2:** Unit tests for math.ts
- **Days 3-4:** Unit tests for orbit.ts
- **Day 5:** Unit tests for galaxy.ts

### Week 2: E2E + Docs
- **Days 1-2:** Playwright setup + auth tests
- **Days 3-4:** Flight controls + navigation tests
- **Day 5:** Architecture documentation

### Week 3: A11y + Mobile
- **Days 1-2:** Accessibility audit + quick wins
- **Days 3-4:** Touch controls implementation
- **Day 5:** Testing + polish

---

## Success Metrics

1. **Tests:**
   - 80%+ coverage on math/orbit/galaxy
   - 10+ E2E test scenarios passing
   - CI green on all PRs

2. **Docs:**
   - ARCHITECTURE.md complete
   - All server functions documented
   - New contributor onboarding time < 1 hour

3. **Accessibility:**
   - Lighthouse a11y score: 90+
   - axe-core: 0 critical violations
   - Keyboard navigable: 100%

4. **Mobile:**
   - Touch controls responsive
   - No layout breaks on mobile
   - Playwright mobile tests passing

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Engine complexity slows tests | High | Start with critical paths only |
| Touch controls feel imprecise | Medium | Iterate with user feedback |
| A11y fixes break existing UI | Medium | Test incrementally, use Radix |
| E2E tests flaky | High | Use stable selectors, retry logic |
| Docs become outdated | Medium | Tie to code, review in PRs |

---

## Next Steps

1. Start with unit tests (foundational)
2. Set up Playwright configuration
3. Create architecture diagrams
4. Run accessibility audit tools
5. Prototype touch controls

Each section below contains detailed implementation.
