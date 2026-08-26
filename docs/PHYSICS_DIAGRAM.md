# Physics Model Visualization

## Current Model (Arcade-Style)

```
┌─────────────────────────────────────────────────────────────┐
│                    CURRENT PHYSICS MODEL                     │
└─────────────────────────────────────────────────────────────┘

Player Input (stickX, stickY)
       │
       ▼
┌──────────────────┐
│  Shape Axis      │  (Deadzone removal)
│  & Smoothing     │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  Direct Angle    │  yawDelta = input × turnRate × dt
│  Change          │  pitchDelta = input × turnRate × dt
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  headingYaw +=   │  INSTANT ROTATION
│  yawDelta        │  (No angular velocity)
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  Visual Roll     │  roll = -steerX × 0.22
│  (Cosmetic only) │  (Doesn't affect flight)
└──────────────────┘


Player Input (throttle 0-1)
       │
       ▼
┌──────────────────┐
│  Speed =         │  cruise = throttle × 420
│  throttle × max  │  boost = 1 + boostAmt × 2.8
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  worldSpeed =    │  INSTANT SPEED CHANGE
│  cruise × boost  │  (No acceleration)
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  Move forward    │  Only +Z axis
│  only (+Z)       │  (No lateral/vertical)
└──────────────────┘


PROBLEMS:
❌ No momentum (stops instantly)
❌ No angular velocity (rotation starts/stops instantly)
❌ Mass is cosmetic (doesn't affect physics)
❌ 2D rotation (pitch + yaw only)
❌ No roll physics (visual only)
❌ All ships feel the same (just faster/slower)
```

---

## Improved Model (Newtonian Physics)

```
┌─────────────────────────────────────────────────────────────┐
│                  IMPROVED PHYSICS MODEL                      │
└─────────────────────────────────────────────────────────────┘

                    Player Input
                        │
        ┌───────────────┼───────────────┐
        │               │               │
        ▼               ▼               ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│  Translation │ │   Rotation   │ │   Thrusters  │
│   Input      │ │    Input     │ │    Mapping   │
│ (WASD/stick) │ │ (Pitch/Yaw/  │ │              │
│              │ │   Roll)      │ │              │
└──────┬───────┘ └──────┬───────┘ └──────┬───────┘
       │                │                │
       │                │                │
       ▼                ▼                ▼
┌─────────────────────────────────────────────────┐
│           PHYSICS ENGINE INTEGRATION            │
│                                                 │
│  1. Calculate Forces from Thrusters            │
│     ┌─────────────────────────────────────┐    │
│     │ F_total = Σ(thruster_forces)        │    │
│     │                                     │    │
│     │ Main Engine:   +Z direction         │    │
│     │ Retro:         -Z direction         │    │
│     │ Lateral:       ±X direction         │    │
│     │ Vertical:      ±Y direction         │    │
│     └─────────────────────────────────────┘    │
│                                                 │
│  2. Calculate Torques from RCS                 │
│     ┌─────────────────────────────────────┐    │
│     │ τ = (pitch_torque, yaw_torque,      │    │
│     │      roll_torque)                   │    │
│     │                                     │    │
│     │ Pitch: rotates around X axis        │    │
│     │ Yaw:   rotates around Y axis        │    │
│     │ Roll:  rotates around Z axis        │    │
│     └─────────────────────────────────────┘    │
│                                                 │
│  3. Apply Newton's Laws                        │
│     ┌─────────────────────────────────────┐    │
│     │ Linear:  a = F / m                  │    │
│     │                                     │    │
│     │ Angular: α = τ / I                  │    │
│     │          (α = angular acceleration) │    │
│     │          (I = moment of inertia)    │    │
│     └─────────────────────────────────────┘    │
│                                                 │
│  4. Integrate Motion (Semi-Implicit Euler)    │
│     ┌─────────────────────────────────────┐    │
│     │ VELOCITY UPDATE:                    │    │
│     │ v.x += a.x × dt                     │    │
│     │ v.y += a.y × dt                     │    │
│     │ v.z += a.z × dt                     │    │
│     │                                     │    │
│     │ POSITION UPDATE:                    │    │
│     │ p.x += v.x × dt                     │    │
│     │ p.y += v.y × dt                     │    │
│     │ p.z += v.z × dt                     │    │
│     │                                     │    │
│     │ ANGULAR VELOCITY UPDATE:            │    │
│     │ ω.x += α.x × dt                     │    │
│     │ ω.y += α.y × dt                     │    │
│     │ ω.z += α.z × dt                     │    │
│     │                                     │    │
│     │ ORIENTATION UPDATE (Quaternion):    │    │
│     │ q_new = q_delta × q_current         │    │
│     └─────────────────────────────────────┘    │
│                                                 │
│  5. Apply Damping                              │
│     ┌─────────────────────────────────────┐    │
│     │ IF Flight Assist ON:                │    │
│     │   v *= 0.9995  (minimal drag)       │    │
│     │   ω *= 0.98    (auto-stabilize)     │    │
│     │                                     │    │
│     │ IF Flight Assist OFF:               │    │
│     │   v *= 0.9999  (near-zero drag)     │    │
│     │   ω *= 0.9995  (coasts)             │    │
│     └─────────────────────────────────────┘    │
│                                                 │
│  6. Burn Fuel                                  │
│     ┌─────────────────────────────────────┐    │
│     │ fuel_flow = thrust / (Isp × g₀)     │    │
│     │ fuel -= fuel_flow × throttle × dt   │    │
│     │ mass = dry_mass + fuel              │    │
│     └─────────────────────────────────────┘    │
└─────────────────────────────────────────────────┘
                        │
                        ▼
            ┌───────────────────────┐
            │   Updated State:      │
            │   - position (Vector3)│
            │   - velocity (Vector3)│
            │   - orientation       │
            │     (Quaternion)      │
            │   - angularVelocity   │
            │     (Vector3)         │
            │   - fuel, mass        │
            └───────────────────────┘
                        │
                        ▼
            ┌───────────────────────┐
            │   Render Camera       │
            │   Update HUD          │
            └───────────────────────┘
```

---

## 6DOF Thruster Layout

```
                    Ship Top View
                    
                         ↑ +Y (Up)
                         │
                    ┌────┴────┐
                    │  RCS ↑  │  Vertical thruster
                    │  ┌─┬─┐  │
              ←─────┼──┤ │ ├──┼─────→ +X (Right)
         RCS ←      │  └─┴─┘  │      RCS →
                    │  RCS ↓  │
                    └────┬────┘
                         │
                         │
                    ┌────┴────┐
                    │  MAIN   │  Main engine (+Z)
                    │ ENGINE  │  (thrust forward)
                    └─────────┘
                         │
                         │
                    ┌────┴────┐
                    │  RETRO  │  Retro thrusters (-Z)
                    │ THRUST  │  (braking)
                    └─────────┘


                    Ship Side View
                    
                         ↑ +Y
                         │
              RCS ↑      │
                ▲        │      RCS ↑
                │        │        │
    ────────────┼────────┼────────┼─────────── → +Z (Forward)
                │        │        │
                ▼        │        ▼
              RCS ↓      │      RCS ↓
                         │
                    ┌────┴────┐
                    │  MAIN   │
                    │ ENGINE  │ ← Thrust force
                    └─────────┘
                         │
                         ▼
                    Velocity


                    Ship Front View
                    
                    ↑ +Y
                    │
              RCS ← │ RCS →
                ◄───┼───►
                    │
                    │
         ┌──────────┼──────────┐
         │          │          │
         │  COCKPIT │          │
         │          │          │
         └──────────┼──────────┘
                    │
                    │
              RCS ← │ RCS →
                ◄───┼───►
                    │
                    │
```

---

## Rotation Axes

```
                    3D Rotation Axes
                    
                         Y (Yaw)
                         ↑
                         │
                        ╱│
                       ╱ │
                      ╱  │
                     ╱   │
                    ╱    │
                   ╱     │
                  ╱      │
                 ╱       │
                ╱        │
               ╱         │
              ╱          │
             ╱           │
            ╱────────────┼──────────→ X (Pitch)
           ╱            ╱│
          ╱            ╱ │
         ╱            ╱  │
        ╱            ╱   │
       ╱            ╱    │
      ╱            ╱     │
     ╱            ╱      │
    ╱            ╱       │
   ╱            ╱        │
  ╱            ╱         │
 ╱            ╱          │
╱────────────╱───────────┘
            ╱
           ╱
          ╱
         ╱
        Z (Roll)
        ↓


PITCH (X-axis rotation):
  Nose up/down
  Controlled by: stick Y / W-S keys
  Torque: τ_x = input_pitch × rcsTorquePitch

YAW (Y-axis rotation):
  Nose left/right
  Controlled by: stick X / A-D keys
  Torque: τ_y = input_yaw × rcsTorqueYaw

ROLL (Z-axis rotation):
  Bank left/right
  Controlled by: Q-E keys / controller triggers
  Torque: τ_z = input_roll × rcsTorqueRoll
```

---

## Force & Torque Diagram

```
┌────────────────────────────────────────────────────────────┐
│                    FORCE DIAGRAM                            │
└────────────────────────────────────────────────────────────┘

                    +Y
                     ↑
                     │
              ┌──────┴──────┐
              │   Vertical  │  F_vertical (up)
              │  Thruster   │
              └──────┬──────┘
                     │
                     │
    ┌────────────────┼────────────────┐
    │                │                │
    │                │                │
    │           ┌────┴────┐           │
    │           │  COCK   │           │
    │           │  PIT    │           │
    │           └────┬────┘           │
    │                │                │
    │                │                │
    └────────────────┼────────────────┘
                     │
                     │
              ┌──────┴──────┐
              │   Vertical  │  F_vertical (down)
              │  Thruster   │
              └──────┬──────┘
                     │
                     │
                     │
              ┌──────┴──────┐
              │   MAIN      │  F_main (+Z)
              │   ENGINE    │  ────────→
              └─────────────┘
                     │
                     │
                     │
              ┌──────┴──────┐
              │   RETRO     │  F_retro (-Z)
              │   THRUST    │  ←────────
              └─────────────┘
                     │
                     ↓
                    +Z


┌────────────────────────────────────────────────────────────┐
│                    TORQUE DIAGRAM                           │
└────────────────────────────────────────────────────────────┘

                    Pitch Torque (τ_x)
                    
                         ↑
                    ┌────┴────┐
                    │  RCS ↑  │  Force up creates
                    │  ┌─┬─┐  │  clockwise torque
              ◄─────┼──┤ │ ├──┼─────►
         Thrust ◄   │  └─┴─┘  │   ► Thrust
                    │  RCS ↓  │
                    └────┬────┘
                         │
                         ↓
                    Pitch down


                    Yaw Torque (τ_y)
                    
                         ↑
                    ┌────┴────┐
                    │   RCS   │  Force right creates
                    │  ┌─┬─┐  │  yaw to the right
              ◄─────┼──┤ │ ├──┼─────►
                    │  └─┴─┘  │
                    │   RCS   │
                    └────┬────┘
                         │
                         ↓
                    Yaw right


                    Roll Torque (τ_z)
                    
                         ↑
                    ┌────┴────┐
                    │  RCS ↑  │
                    │  ┌─┬─┐  │
              ◄─────┼──┤ │ ├──┼─────►
         Thrust ◄   │  └─┴─┘  │   ► Thrust
                    │  RCS ↓  │  Creates rolling moment
                    └────┬────┘  around Z axis
                         │
                         ↓
                    Roll right
```

---

## Momentum Conservation

```
┌────────────────────────────────────────────────────────────┐
│                 LINEAR MOMENTUM (Drift)                     │
└────────────────────────────────────────────────────────────┘

Scenario: Ship accelerates forward, then throttle = 0

CURRENT MODEL:
  t=0:  throttle = 1.0  →  speed = 420 m/s
  t=1:  throttle = 0.0  →  speed = 0 m/s  ❌ WRONG!
  
  (Stops instantly - no momentum)


IMPROVED MODEL:
  t=0:  throttle = 1.0
        F = 180,000 N
        a = F/m = 180000/4000 = 45 m/s²
        v = 0 + 45×1 = 45 m/s
        
  t=1:  throttle = 0.0
        F = 0 N
        a = 0 m/s²
        v = 45 + 0×1 = 45 m/s  ✅ CORRECT!
        (continues drifting)
        
  t=2:  throttle = 0.0
        v = 45 m/s  (still drifting)
        
  To stop: Must fire retro thrusters or flip & burn main


┌────────────────────────────────────────────────────────────┐
│                ANGULAR MOMENTUM (Spin)                      │
└────────────────────────────────────────────────────────────┘

Scenario: Ship rotates 90° left, then stick centers

CURRENT MODEL:
  t=0:  stickX = -1.0  →  yaw = -5°
  t=1:  stickX = 0.0   →  yaw stops immediately  ❌ WRONG!
  
  (No angular momentum)


IMPROVED MODEL:
  t=0:  stickX = -1.0
        τ = -4000 N⋅m (RCS torque)
        α = τ/I = -4000/12000 = -0.33 rad/s²
        ω = 0 + (-0.33)×1 = -0.33 rad/s
        θ = 0 + (-0.33)×1 = -0.33 rad ≈ -19°
        
  t=1:  stickX = 0.0
        τ = 0 N⋅m
        α = 0 rad/s²
        ω = -0.33 rad/s  (still rotating!)
        θ = -0.33 + (-0.33)×1 = -0.66 rad ≈ -38°
        
  t=2:  stickX = 0.0
        ω = -0.33 rad/s  (conservation of angular momentum)
        θ = -0.66 + (-0.33)×1 = -1.0 rad ≈ -57°
        
  To stop: Must apply opposite torque (stick right)
```

---

## Flight Assist System

```
┌────────────────────────────────────────────────────────────┐
│              FLIGHT ASSIST: ON vs OFF                       │
└────────────────────────────────────────────────────────────┘

FLIGHT ASSIST ON (Default - Accessible)
══════════════════════════════════════════════════════════════

Input: Stick centered
  │
  ▼
┌─────────────────────────────────────┐
│ Auto-dampen angular velocity        │
│ ω *= 0.98  (2% damping per frame)  │
│                                     │
│ Auto-dampen linear velocity         │
│ v *= 0.9995 (minimal drag)         │
│                                     │
│ Feels like: Atmospheric flight      │
│ (like an airplane)                  │
└─────────────────────────────────────┘
  │
  ▼
Result: Ship stabilizes, stops rotating


FLIGHT ASSIST OFF (Realistic - Hardcore)
══════════════════════════════════════════════════════════════

Input: Stick centered
  │
  ▼
┌─────────────────────────────────────┐
│ Minimal damping                     │
│ ω *= 0.9995  (0.05% damping)       │
│                                     │
│ Near-zero drag                      │
│ v *= 0.9999  (0.01% drag)          │
│                                     │
│ Feels like: True space flight       │
│ (drifts indefinitely)               │
└─────────────────────────────────────┘
  │
  ▼
Result: Ship coasts, continues rotating


COMPARISON SCENARIOS
══════════════════════════════════════════════════════════════

1. EMERGENCY STOP
   ─────────────────────────────────────────────────────────
   Flight Assist ON:
   - Release stick → auto-stabilizes
   - Auto-applies retro thrust
   - Stops in ~3 seconds
   
   Flight Assist OFF:
   - Must manually flip 180°
   - Must fire retro thrusters
   - Requires planning & skill

2. DOCKING APPROACH
   ─────────────────────────────────────────────────────────
   Flight Assist ON:
   - Point at target
   - Apply gentle thrust
   - Auto-damps drift
   
   Flight Assist OFF:
   - Match velocity with station
   - Cancel all rotation
   - Use RCS for fine adjustments
   - Much harder!

3. COMBAT MANEUVER
   ─────────────────────────────────────────────────────────
   Flight Assist ON:
   - Turn and shoot
   - Auto-stabilizes after turn
   - Easier targeting
   
   Flight Assist OFF:
   - Turn, then counter-turn
   - Manage angular momentum
   - Drift while shooting
   - Higher skill ceiling
```

---

## Ship Variant Comparison

```
┌────────────────────────────────────────────────────────────┐
│                    SHIP COMPARISON                          │
└────────────────────────────────────────────────────────────┘

                    MASS COMPARISON (kg)
══════════════════════════════════════════════════════════════

Courier      ████░░░░░░░░░░░░  2,500 kg  (Light)
Interceptor  █████░░░░░░░░░░░  3,000 kg  (Light-Medium)
Scout        ███████░░░░░░░░░  4,000 kg  (Medium)
Liner        █████████████░░░  8,000 kg  (Heavy)
Hauler       ██████████████████ 12,000 kg (Very Heavy)


                MOMENT OF INERTIA (Yaw) - kg⋅m²
══════════════════════════════════════════════════════════════

Courier      ████░░░░░░░░░░░░  12,000  (Easy to rotate)
Interceptor  ███░░░░░░░░░░░░░  9,000   (Very easy)
Scout        ██████░░░░░░░░░░  22,000  (Medium)
Liner        ██████████████░░  140,000 (Hard)
Hauler       ██████████████████ 280,000 (Very hard)


                    ENGINE THRUST - Newtons
══════════════════════════════════════════════════════════════

Courier      █████████░░░░░░░  180,000 N
Interceptor  ███████████░░░░░  240,000 N
Scout        ██████████░░░░░░  200,000 N
Liner        ██████████████░░  280,000 N
Hauler       ████████████████████ 450,000 N


                THRUST-TO-WEIGHT RATIO (m/s²)
══════════════════════════════════════════════════════════════

Interceptor  ██████████████████  80 m/s²  (Insane!)
Courier      ████████████████░░  72 m/s²  (Excellent)
Scout        ████████████░░░░░░  50 m/s²  (Good)
Liner        ██████████░░░░░░░░  35 m/s²  (Moderate)
Hauler       ████████░░░░░░░░░░  37.5 m/s² (Moderate)


                    ROTATIONAL AGILITY
══════════════════════════════════════════════════════════════

Interceptor  ██████████████████  Fastest (snappy)
Courier      ███████████████░░░  Fast
Scout        ████████████░░░░░░  Medium
Liner        ██████░░░░░░░░░░░░  Slow
Hauler       ████░░░░░░░░░░░░░░  Slowest (sluggish)


                    FUEL EFFICIENCY (Isp)
══════════════════════════════════════════════════════════════

Scout        ██████████████████  450s  (Best)
Courier      ███████████████░░░  400s  (Good)
Liner        █████████████░░░░░  380s  (Moderate)
Hauler       ████████████░░░░░░  350s  (Poor)
Interceptor  ██████████░░░░░░░░  320s  (Worst - burns fast)
```

---

## Performance Profile

```
┌────────────────────────────────────────────────────────────┐
│                  COMPUTATIONAL COST                         │
└────────────────────────────────────────────────────────────┘

CURRENT MODEL (per frame):
────────────────────────────────────────────────────────────
Operation                    FLOPs      Time (est.)
────────────────────────────────────────────────────────────
Input shaping                ~10        0.01 μs
Angle calculation            ~5         0.005 μs
Position update              ~3         0.003 μs
────────────────────────────────────────────────────────────
TOTAL:                       ~18        ~0.02 μs


IMPROVED MODEL (per frame):
────────────────────────────────────────────────────────────
Operation                    FLOPs      Time (est.)
────────────────────────────────────────────────────────────
Force calculation            ~50        0.05 μs
Torque calculation           ~30        0.03 μs
Newton's laws (F=ma, τ=Iα)   ~20        0.02 μs
Velocity integration         ~18        0.02 μs
Position integration         ~18        0.02 μs
Quaternion multiply          ~40        0.04 μs
Quaternion normalize         ~25        0.03 μs
Damping application          ~12        0.01 μs
Fuel calculation             ~15        0.02 μs
────────────────────────────────────────────────────────────
TOTAL:                       ~228       ~0.24 μs


OVERHEAD: +0.22 μs per frame
At 60 FPS: +13.2 μs per second (0.013 ms)
CONCLUSION: Completely negligible (<0.1% CPU time)


MEMORY USAGE:
────────────────────────────────────────────────────────────
CURRENT:
- 5 scalar floats (yaw, pitch, speed, etc.)
- ~20 bytes

IMPROVED:
- 2 Vector3 positions (24 bytes)
- 2 Vector3 velocities (24 bytes)
- 1 Quaternion (16 bytes)
- 2 Vector3 angular (24 bytes)
- 4 scalars (fuel, mass, etc.) (16 bytes)
- ~104 bytes

OVERHEAD: +84 bytes per ship
CONCLUSION: Negligible (less than one texture pixel)
```

---

## Integration Flowchart

```
┌────────────────────────────────────────────────────────────┐
│                 MIGRATION FLOWCHART                         │
└────────────────────────────────────────────────────────────┘

START: Current starwake.html
  │
  ▼
┌─────────────────────────────────────┐
│ Step 1: Add Vector3 & Quaternion    │
│ - Copy utility classes              │
│ - No behavior change yet            │
│ Time: 30 minutes                    │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│ Step 2: Wrap Existing State         │
│ - Create PhysicsState interface     │
│ - Map old variables to new struct   │
│ Time: 20 minutes                    │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│ Step 3: Implement PhysicsEngine     │
│ - Copy integrate() method           │
│ - Keep flight assist ON by default  │
│ Time: 60 minutes                    │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│ Step 4: Map Input to New Model      │
│ - Old throttle → new throttle       │
│ - Old stick → pitch/yaw input       │
│ - Roll = 0 (not used yet)           │
│ Time: 20 minutes                    │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│ Step 5: Update Render Loop          │
│ - Extract position from physics     │
│ - Extract orientation from physics  │
│ - Update camera matrix              │
│ Time: 30 minutes                    │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│ Step 6: Test & Tune                 │
│ - Adjust damping values             │
│ - Tune thruster power               │
│ - Playtest with flight assist ON    │
│ Time: 90 minutes                    │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│ Step 7: Add Flight Assist Toggle    │
│ - UI button for on/off              │
│ - Different damping profiles        │
│ Time: 30 minutes                    │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│ Step 8: Enable 6DOF Controls        │
│ - Add keyboard bindings (Q,E,etc.)  │
│ - Add UI for lateral/vertical       │
│ Time: 40 minutes                    │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│ Step 9: Implement Fuel Burn         │
│ - Add consumption during thrust     │
│ - Add delta-V calculation           │
│ - Update HUD                        │
│ Time: 40 minutes                    │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│ Step 10: Balance Ship Variants      │
│ - Tune each ship's physics          │
│ - Playtest all 5 ships              │
│ Time: 120 minutes                   │
└──────────────┬──────────────────────┘
               │
               ▼
COMPLETE: Newtonian flight model
TOTAL TIME: ~7 hours (1 day of work)
```

---

## Summary

```
┌────────────────────────────────────────────────────────────┐
│                      KEY TAKEAWAYS                          │
└────────────────────────────────────────────────────────────┘

CURRENT MODEL:
✓ Simple, works
✓ Accessible
✓ Low CPU usage
✗ Not realistic
✗ Ships feel same
✗ No skill ceiling
✗ Misleading "simulator" label

IMPROVED MODEL:
✓ Realistic space flight
✓ Ships feel meaningfully different
✓ High skill ceiling (with toggle)
✓ Enables new gameplay
✓ Production-proven approach
✓ Still accessible (flight assist)
✓ Negligible performance cost
✗ Steeper learning curve (mitigated)

RECOMMENDATION:
══════════════════════════════════════════════════════════════

1. Implement improved physics model
2. Keep flight assist ON by default
3. Add toggle for hardcore players
4. Tune ship variants for distinct feel
5. Add delta-V and fuel HUD elements
6. Consider 6DOF controls as advanced feature

This brings Starwake Sim from "arcade game" to "simulator"
while maintaining accessibility for casual players.

The provided physics.example.ts is production-ready and
can be dropped into the project with minimal changes.
```
