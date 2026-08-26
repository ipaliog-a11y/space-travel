# Flight Physics Analysis & Improvement Recommendations

## Executive Summary

**Current State**: The prototype implements an **arcade-style flight model** that prioritizes feel over realism. It's essentially a 2D flight model with visual roll, lacking true 3D rotational physics, momentum, and Newtonian mechanics.

**Verdict**: Good for casual play, but misses the "space" in space simulator. Real space flight should feel like flying in a vacuum with momentum, inertia, and 6DOF movement.

---

## Current Physics Model Analysis

### What's Implemented

#### 1. **Rotation Model** (Lines 1452-1514)
```javascript
// Input accumulation
yawInput += -shapeAxis(stickX, 0.08);
pitchInput += shapeAxis(stickY, 0.08);

// Smoothed steering
const follow = 1 - Math.exp(-11 * dt);
steerX += (targetSteerX - steerX) * follow;

// Rotation application
const turnRate = 1.0 - boostAmt * 0.2;
const yawDelta = steerX * turnRate * dt;
const pitchDelta = steerY * turnRate * 0.85 * dt;
headingYaw += yawDelta;
```

**Issues**:
- ❌ **No angular velocity/acceleration** - rotation is instant based on input
- ❌ **No roll axis** - only visual roll (`roll = -steerX * 0.22`), doesn't affect flight
- ❌ **No rotational inertia** - ship stops turning immediately when stick centers
- ❌ **2D rotation** - uses simple Euler angles, not full 3D rotation
- ❌ **No gyroscopic effects** - mass should resist rotation changes

#### 2. **Translation Model** (Lines 1516-1520)
```javascript
const cruise = state.speed * 420;
const boostMul = 1 + boostAmt * 2.8;
const worldSpeed = cruise * boostMul;
const vz = worldSpeed * dt;
```

**Issues**:
- ❌ **No momentum** - velocity = input, not acceleration integrated over time
- ❌ **No deceleration** - ship stops instantly when throttle = 0 (in atmosphere mode)
- ❌ **Always forward** - no strafe left/right/up/down
- ❌ **Speed cap** - artificial limit instead of fuel/acceleration limited
- ❌ **No vector-based movement** - movement only along local Z axis

#### 3. **Ship Variant Integration** (SHIP_VARIANTS.md)
```typescript
turn = baseTurn * def.turnRate * (1 - boostAmt * 0.2)
cruiseSpeed = def.maxCruise * throttle * BASE_SPEED
```

**Issues**:
- ❌ **Mass is cosmetic** - doesn't affect physics (should affect inertia, acceleration)
- ❌ **Linear scaling** - real physics is non-linear
- ❌ **No thrust values** - engines should have Newton (force) ratings
- ❌ **No moment of inertia tensor** - different axes should rotate differently

---

## Physics Problems Identified

### Problem 1: Newton's First Law Violation
**Real space**: Objects in motion stay in motion  
**Current**: Ship stops when throttle = 0

```javascript
// Current (WRONG for space)
velocity = throttle * maxSpeed;

// Should be (CORRECT)
acceleration = throttle * engineThrust / mass;
velocity += acceleration * dt;
velocity *= drag; // Only in atmosphere!
```

### Problem 2: No Rotational Dynamics
**Real space**: `τ = I × α` (torque = moment of inertia × angular acceleration)  
**Current**: `rotation = input × turnRate`

Ships should:
- Build up angular velocity when turning
- Continue rotating after input stops (conservation of angular momentum)
- Require counter-rotation to stop spinning
- Have different rotation rates per axis (pitch vs yaw vs roll)

### Problem 3: Missing Inertia Tensor
Different ship shapes should rotate differently:
- **Hauler** (long, heavy): Slow pitch/yaw, very slow roll
- **Interceptor** (compact): Fast all axes
- **Current**: All ships use same rotation model with scalar multiplier

### Problem 4: No Vector-Based Movement
**Current**: Only moves forward/backward along local Z  
**Should be**: 6DOF with independent thrust vectors

```typescript
// Ship has thrusters:
- Main engine: +Z thrust
- Retro thrusters: -Z thrust  
- Lateral thrusters: ±X thrust
- Vertical thrusters: ±Y thrust
- RCS quads: rotational torque
```

### Problem 5: Artificial "Flight" Feel
The model is essentially **aircraft flight without gravity**:
- Stick controls pitch/yaw rate (not acceleration)
- Throttle controls speed (not thrust)
- No drift, no momentum, no orbital mechanics

---

## Recommended Improvements

### Tier 1: Quick Wins (Maintain Feel, Add Realism)

#### 1A. Add Angular Velocity
```typescript
// In flight.ts
interface ShipState {
  angularVelocity: Vector3;  // rad/s per axis
  orientation: Quaternion;    // full 3D rotation
}

function updateRotation(dt: number, input: Vector2, ship: ShipDef) {
  // Calculate torque from input
  const torque = new Vector3(
    input.y * ship.pitchTorque,  // pitch
    input.x * ship.yawTorque,    // yaw
    -input.x * ship.rollTorque   // roll (opposite direction)
  );
  
  // Angular acceleration: α = τ / I
  const angularAccel = new Vector3(
    torque.x / ship.momentInertiaX,
    torque.y / ship.momentInertiaY,
    torque.z / ship.momentInertiaZ
  );
  
  // Integrate
  ship.angularVelocity.x += angularAccel.x * dt;
  ship.angularVelocity.y += angularAccel.y * dt;
  ship.angularVelocity.z += angularAccel.z * dt;
  
  // Damping (simulates RCS dampers)
  const damping = 0.98;
  ship.angularVelocity.scale(damping);
  
  // Apply rotation
  const deltaRotation = Quaternion.fromAxisAngle(
    ship.angularVelocity.normalize(),
    ship.angularVelocity.length() * dt
  );
  ship.orientation = deltaRotation.multiply(ship.orientation);
}
```

#### 1B. Add Linear Momentum
```typescript
interface ShipPhysics {
  velocity: Vector3;      // m/s
  acceleration: Vector3;  // m/s²
  position: Vector3;      // world position
}

function updateTranslation(dt: number, throttle: number, ship: ShipDef) {
  // Forward thrust in ship's local Z direction
  const forward = ship.orientation.forward();
  const thrustForce = forward.scale(throttle * ship.engineThrust);
  
  // Acceleration: F = ma → a = F/m
  ship.acceleration = thrustForce.scale(1 / ship.mass);
  
  // Integrate velocity
  ship.velocity.x += ship.acceleration.x * dt;
  ship.velocity.y += ship.acceleration.y * dt;
  ship.velocity.z += ship.acceleration.z * dt;
  
  // Space has no drag, but we can add artificial damping for playability
  const spaceDrag = 0.999; // Very minimal
  ship.velocity.scale(spaceDrag);
  
  // Integrate position
  ship.position.x += ship.velocity.x * dt;
  ship.position.y += ship.velocity.y * dt;
  ship.position.z += ship.velocity.z * dt;
}
```

#### 1C. Make Mass Matter
```typescript
// In catalog.ts
const shipDefs: Record<ShipId, ShipDef> = {
  courier: {
    mass: 2500,  // kg (was 0.7)
    engineThrust: 180000,  // Newtons
    momentInertiaX: 8000,  // kg⋅m² (pitch)
    momentInertiaY: 12000, // kg⋅m² (yaw)
    momentInertiaZ: 15000, // kg⋅m² (roll)
    RCS torque: 4000,      // N⋅m (rotational thrusters)
    // ... other stats
  },
  hauler: {
    mass: 18000,  // 7x heavier!
    engineThrust: 320000,  // more thrust but worse T/W ratio
    momentInertiaX: 180000,  // much harder to rotate
    momentInertiaY: 280000,
    momentInertiaZ: 350000,
    RCS torque: 6000,
  }
};
```

### Tier 2: Enhanced Realism

#### 2A. Implement 6DOF Thruster Model
```typescript
interface Thruster {
  position: Vector3;    // relative to ship center of mass
  direction: Vector3;   // thrust direction
  maxForce: number;     // Newtons
  fuelConsumption: number; // kg/s at full thrust
}

class ShipThrusters {
  main: Thruster;       // +Z
  retro: Thruster[];    // -Z
  lateral: Thruster[];  // ±X
  vertical: Thruster[]; // ±Y
  rcs: Thruster[];      // rotational pairs
}

function calculateForces(ship: Ship) {
  const totalForce = Vector3.zero();
  const totalTorque = Vector3.zero();
  
  for (const thruster of ship.thrusters.active) {
    const worldPos = ship.orientation.transform(thruster.position);
    const worldDir = ship.orientation.transform(thruster.direction);
    const force = worldDir.scale(thruster.currentForce);
    
    totalForce.add(force);
    
    // Torque = r × F (cross product)
    const torque = worldPos.cross(force);
    totalTorque.add(torque);
  }
  
  return { totalForce, totalTorque };
}
```

#### 2B. Add Fuel Consumption Physics
```typescript
// Rocket equation: Δv = Isp × g₀ × ln(m₀/m₁)
interface Engine {
  specificImpulse: number;  // seconds (e.g., 300-450s for chemical, 3000+ for ion)
  thrust: number;           // Newtons
  fuelFlowRate: number;     // kg/s
}

function calculateDeltaV(ship: Ship): number {
  const g0 = 9.81;  // Earth gravity (m/s²)
  const dryMass = ship.mass - ship.fuel;
  const deltaV = ship.engine.specificImpulse * g0 * 
                 Math.log(ship.mass / dryMass);
  return deltaV;
}

// Update mass as fuel burns
function burnFuel(dt: number, throttle: number, ship: Ship) {
  const fuelBurned = ship.engine.fuelFlowRate * throttle * dt;
  ship.fuel -= fuelBurned;
  ship.mass = ship.dryMass + ship.fuel;
}
```

#### 2C. Atmospheric vs Vacuum Flight
```typescript
interface FlightMode {
  IN_SPACE: 'vacuum',
  IN_ATMOSPHERE: 'aerodynamic',
  TRANSITION: 'mix'
}

function calculateDrag(velocity: Vector3, altitude: number, ship: Ship): Vector3 {
  if (altitude > 100000) {  // Above 100km = space
    return Vector3.zero();
  }
  
  // Atmospheric density decreases with altitude
  const airDensity = Math.exp(-altitude / 8500);  // Scale height ~8.5km
  
  // Drag equation: Fd = 0.5 × ρ × v² × Cd × A
  const speed = velocity.length();
  const dragMagnitude = 0.5 * airDensity * speed * speed * 
                        ship.dragCoefficient * ship.crossSectionalArea;
  
  const dragDirection = velocity.normalize().negate();
  return dragDirection.scale(dragMagnitude);
}
```

### Tier 3: Advanced Features

#### 3A. Orbital Mechanics (For Later)
```typescript
// Simplified 2-body problem
interface CelestialBody {
  mass: number;           // kg
  position: Vector3;      // AU or km
  gravitationalParam: number; // μ = G × M
}

function calculateGravity(ship: Ship, body: CelestialBody): Vector3 {
  const r = ship.position.subtract(body.position);
  const rDist = r.length();
  const rDir = r.normalize();
  
  // F = G × M × m / r²
  // a = F/m = μ / r²
  const acceleration = body.gravitationalParam / (rDist * rDist);
  
  return rDir.scale(-acceleration);  // Toward body
}

// For jump targeting, calculate Hohmann transfers
function calculateHohmannTransfer(origin: Orbit, target: Orbit) {
  // Returns delta-V budget and transfer time
  // Essential for realistic jump planning
}
```

#### 3B. Relativistic Effects (For Hyperspace)
```typescript
// As ship approaches light speed (optional hard-mode)
function applyRelativisticEffects(velocity: number, ship: Ship) {
  const c = 299792458;  // speed of light m/s
  const beta = velocity / c;
  
  if (beta > 0.1) {  // Above 10% light speed
    // Time dilation
    const lorentzFactor = 1 / Math.sqrt(1 - beta * beta);
    const properTime = coordinateTime / lorentzFactor;
    
    // Mass increase (affects acceleration)
    const relativisticMass = ship.restMass * lorentzFactor;
    
    // Length contraction (visual effect)
    const contractionFactor = 1 / lorentzFactor;
  }
}
```

---

## Implementation Roadmap

### Phase 1: Foundation (Week 1)
- [ ] Replace Euler angles with quaternions
- [ ] Add angular velocity to state
- [ ] Implement rotational inertia per ship
- [ ] Add momentum to translation

### Phase 2: Ship Variants (Week 1-2)
- [ ] Define realistic mass/thrust values
- [ ] Calculate moment of inertia tensors
- [ ] Tune RCS thruster power
- [ ] Playtest and balance

### Phase 3: Advanced (Week 2-3)
- [ ] Add 6DOF thruster model
- [ ] Implement fuel consumption physics
- [ ] Add atmospheric drag (for planets)
- [ ] Create flight assist mode (for casual players)

### Phase 4: Expert Features (Optional)
- [ ] Orbital mechanics for navigation
- [ ] Gravity wells near stars/planets
- [ ] Multi-body physics (Lagrange points)
- [ ] Relativistic effects for high-speed travel

---

## Code Structure Recommendations

```typescript
// src/ship/physics.ts
export interface PhysicsState {
  // Linear
  position: Vector3;
  velocity: Vector3;
  acceleration: Vector3;
  
  // Angular
  orientation: Quaternion;
  angularVelocity: Vector3;
  angularAcceleration: Vector3;
  
  // Properties (updated from ShipDef)
  mass: number;
  momentInertia: Vector3;
}

export interface ThrusterInput {
  main: number;      // 0-1
  retro: number;     // 0-1
  lateral: number;   // -1 to 1
  vertical: number;  // -1 to 1
  pitch: number;     // -1 to 1
  yaw: number;       // -1 to 1
  roll: number;      // -1 to 1
}

export class PhysicsEngine {
  integrate(state: PhysicsState, input: ThrusterInput, dt: number, ship: ShipDef) {
    // 1. Calculate forces from thrusters
    // 2. Calculate torques
    // 3. Apply F=ma and τ=Iα
    // 4. Semi-implicit Euler integration
    // 5. Update state
  }
}

// src/ship/flight.ts
export class FlightController {
  // Maps player input to thruster commands
  // Can have "flight assist" mode for arcade feel
  mapInputToThrusters(input: PlayerInput, mode: FlightMode): ThrusterInput;
}
```

---

## Playability Considerations

### Flight Assist System
Real space physics is **hard**. Consider a toggleable assist:

```typescript
interface FlightAssist {
  enabled: boolean;
  
  // When enabled:
  - Auto-dampens velocity when stick centered
  - Auto-levels orientation
  - Limits max rotation rate
  - Makes ship feel "atmospheric"
  
  // When disabled:
  - Full Newtonian physics
  - Drift continues indefinitely
  - Manual RCS braking required
  - Elite-style "drift driving"
}
```

### UI Enhancements
- **Velocity vector indicator** (show drift direction)
- **Rotation rate display** (deg/s per axis)
- **Delta-V remaining** (fuel efficiency)
- **G-force meter** (under acceleration)
- **Inertial dampener status** (assist mode)

---

## References & Inspiration

### Games Done Right
1. **Elite Dangerous** - Perfect balance of arcade/sim
2. **Kerbal Space Program** - Orbital mechanics teaching tool
3. **EVE Online** - Sub-light inertia + warp drives
4. **Children of a Dead Earth** - Hardest sci-fi physics
5. **Space Engineers** - Thruster-based 6DOF

### Physics Resources
- NASA Rocket Equation: https://www.grc.nasa.gov/www/k-12/airplane/rockeq.html
- Moment of Inertia: https://en.wikipedia.org/wiki/Moment_of_inertia
- Quaternion Rotation: https://en.wikipedia.org/wiki/Quaternions_and_spatial_rotation
- Orbital Mechanics: https://www.projectrho.com/public_html/rocket/mission.php

### Elite Dangerous FSD Audio
Your procedural audio is already inspired by Elite. For physics, study:
- How Elite handles sub-light inertia
- FSD spool time vs mass relationship
- Frame shift wake mechanics

---

## Conclusion

**Current Model**: 3/10 for realism, 7/10 for accessibility  
**Target Model**: 7/10 for realism, 8/10 for accessibility (with flight assist)

The prototype has excellent visual and audio design. Adding proper physics will:
1. ✅ Make ship variants feel truly different
2. ✅ Create skill ceiling for advanced pilots
3. ✅ Enable new gameplay (docking, orbital insertion, fuel management)
4. ✅ Justify the "simulator" label
5. ⚠️ Risk alienating casual players (mitigate with flight assist)

**Recommendation**: Implement Tier 1 improvements immediately, Tier 2 before beta, and offer flight assist toggle for accessibility.
