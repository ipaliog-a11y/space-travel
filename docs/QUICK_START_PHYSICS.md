# Quick Start: Implementing Improved Physics

## 5-Minute Overview

**Current problem**: Your physics model is arcade-style (instant movement, no momentum). Ships don't feel different, and it's not really a "simulator."

**Solution**: Implement Newtonian physics with momentum, inertia, and configurable flight assist.

**Time to implement**: 1-2 days for core features

---

## Step-by-Step Implementation

### Step 1: Add Physics Classes (30 min)

Create `src/ship/physics.ts`:

```bash
# Copy the provided file
cp src/ship/physics.example.ts src/ship/physics.ts
```

This gives you:
- ✅ Vector3 class (3D math)
- ✅ Quaternion class (3D rotation)
- ✅ PhysicsEngine class (integration)
- ✅ Ship definitions (realistic stats)

---

### Step 2: Integrate into Game Loop (20 min)

In your main game file (or where `tick()` is):

```typescript
// 1. Import the physics engine
import { PhysicsEngine, FlightInput } from './ship/physics';

// 2. Initialize physics (replace current state)
const physics = new PhysicsEngine('courier');  // or load selected ship

// 3. In your tick() function, replace movement code with:
function tick(dt: number) {
  // Map your existing input to new format
  const input: FlightInput = {
    throttle: state.speed,      // Your existing throttle (0-1)
    pitch: pitchInput,          // Your existing pitch (-1 to 1)
    yaw: yawInput,              // Your existing yaw (-1 to 1)
    roll: 0,                    // Not used yet, or map to Q/E keys
    lateral: 0,                 // Not used yet
    vertical: 0,                // Not used yet
    retro: 0,                   // Not used yet
  };
  
  // Step physics
  physics.integrate(input, dt);
  
  // Extract for rendering
  const position = physics.state.position;
  const orientation = physics.state.orientation;
  
  // Update your camera/render with new position & orientation
  updateCamera(position, orientation);
  
  // Continue with rest of your render loop...
}
```

---

### Step 3: Update Camera (15 min)

Replace your current camera setup:

```typescript
// OLD (lines ~1562-1563 in starwake.html)
viewFromLook(view, roll, lookYaw, lookPitch);

// NEW - Use quaternion from physics
const pos = physics.state.position;
const orient = physics.state.orientation;

// Create view matrix from quaternion
const forward = orient.forward();
const up = orient.up();

// Your existing look offsets (for head-look)
const lookOffset = Quaternion.fromEuler(lookPitch, lookYaw, 0);
const finalOrient = lookOffset.multiply(orient);

// Build view matrix
const view = lookAt(pos, pos.add(finalOrient.forward()), finalOrient.up());
```

---

### Step 4: Test & Tune (30 min)

Run the game and adjust these values in `physics.ts`:

```typescript
const DEFAULT_CONFIG: PhysicsConfig = {
  flightAssist: true,        // Keep ON for testing
  rotationalDamping: 0.98,   // Increase = more damping (0.95-0.99)
  linearDamping: 0.9995,     // Increase = less drag (0.999-0.9999)
  maxAngularVelocity: 2.0,   // Max rotation speed (rad/s)
};
```

**If ship feels too "slippery"**: Increase damping to 0.99
**If ship feels too "stiff"**: Decrease damping to 0.97
**If rotation is too fast**: Decrease `maxAngularVelocity` to 1.5

---

### Step 5: Add Flight Assist Toggle (15 min)

Add a UI button:

```typescript
// In your UI code
let flightAssistEnabled = true;

btnFlightAssist.addEventListener('click', () => {
  flightAssistEnabled = !flightAssistEnabled;
  physics.config.flightAssist = flightAssistEnabled;
  btnFlightAssist.textContent = flightAssistEnabled ? 'FA: ON' : 'FA: OFF';
});
```

---

## Quick Troubleshooting

### Problem: Ship spins uncontrollably
**Fix**: Increase `rotationalDamping` to 0.99 or decrease `maxAngularVelocity`

### Problem: Ship doesn't move
**Fix**: Check that throttle is being mapped correctly (should be 0-1)

### Problem: Camera is upside down
**Fix**: Invert the quaternion or adjust initial orientation

### Problem: Ship accelerates too slowly
**Fix**: Increase `mainEngineThrust` in ship definition, or decrease mass

### Problem: Performance issues
**Fix**: Unlikely, but reduce star count or simplify shaders (physics is <0.5ms/frame)

---

## Ship Variant Quick Setup

Once core physics works, add ship selection:

```typescript
// In your ship select screen
function selectShip(shipId: string) {
  physics = new PhysicsEngine(shipId);  // Creates new physics with ship stats
}

// Ship IDs: 'courier', 'hauler', 'scout', 'interceptor', 'liner'
```

Each ship automatically has different:
- ✅ Mass (affects acceleration)
- ✅ Moment of inertia (affects rotation)
- ✅ Thrust (affects acceleration)
- ✅ Fuel capacity (affects range)

**No additional code needed!**

---

## Next Steps After Core Works

### Week 2: Add 6DOF Controls
```typescript
// Map keyboard to 6DOF
const input: FlightInput = {
  throttle: keys['KeyW'] ? 1 : 0,
  retro: keys['KeyS'] ? 1 : 0,
  lateral: (keys['KeyD'] ? 1 : 0) - (keys['KeyA'] ? 1 : 0),
  vertical: (keys['KeyE'] ? 1 : 0) - (keys['KeyQ'] ? 1 : 0),
  pitch: stickY,
  yaw: stickX,
  roll: (keys['KeyR'] ? 1 : 0) - (keys['KeyF'] ? 1 : 0),
};
```

### Week 3: Add Fuel Consumption
```typescript
// Already implemented in physics.example.ts!
// Just display it in HUD:
const fuelPercent = (physics.state.fuel / physics.shipDef.fuelCapacity) * 100;
fuelDisplay.textContent = `${fuelPercent.toFixed(0)}%`;
```

### Week 4: Add Delta-V Readout
```typescript
// Already implemented!
const deltaV = physics.getDeltaV();
deltaVDisplay.textContent = `${deltaV.toFixed(0)} m/s`;
```

---

## Files to Modify

| File | Changes | Time |
|------|---------|------|
| `src/ship/physics.ts` | Create from example | 5 min |
| Your main game loop | Integrate physics | 20 min |
| Camera setup | Use quaternion | 15 min |
| UI (optional) | Add FA toggle | 15 min |
| Ship select (optional) | Wire up ship ID | 10 min |
| **TOTAL** | | **65 min** |

---

## Testing Checklist

- [ ] Ship accelerates when throttle pressed
- [ ] Ship drifts when throttle released
- [ ] Ship rotates when stick moved
- [ ] Ship continues rotating briefly after stick centers
- [ ] Flight assist toggle stops rotation when ON
- [ ] Different ships feel different (test Courier vs Hauler)
- [ ] 60 FPS maintained
- [ ] No physics glitches or instabilities

---

## Code Snippets

### Extract Physics State for Rendering

```typescript
// Get position and orientation
const { position, orientation } = physics.state;

// Convert to your camera system
camera.position.set(position.x, position.y, position.z);
camera.quaternion.set(
  orientation.x,
  orientation.y,
  orientation.z,
  orientation.w
);
```

### Get Speed for HUD

```typescript
const speed = physics.getSpeed();  // m/s
speedDisplay.textContent = `${speed.toFixed(0)} m/s`;
```

### Check if Can Jump

```typescript
const canJump = physics.canJump(distanceLy, fuelRequired);
if (!canJump) {
  alert('Not enough fuel or FSD charging!');
}
```

### Get Local Velocity (for drift indicator)

```typescript
const localVel = physics.getLocalVelocity();
// localVel.z = forward/backward drift
// localVel.x = left/right drift
// localVel.y = up/down drift
```

---

## Performance Tips

The physics engine is already optimized, but:

1. **Reuse Vector3/Quaternion objects** (avoid garbage collection)
2. **Use semi-implicit Euler** (already implemented - stable at 60 FPS)
3. **Don't call integrate() more than 60x/sec** (cap dt if needed)
4. **Profile before optimizing** (physics is likely <1% of frame time)

---

## Common Mistakes to Avoid

❌ **Don't** modify physics state directly (use integrate())
❌ **Don't** call integrate() with dt > 0.1 (unstable)
❌ **Don't** forget to normalize quaternions (drift over time)
❌ **Don't** mix old and new movement code (pick one)

✅ **Do** keep flight assist ON for casual players
✅ **Do** test with all 5 ship variants
✅ **Do** profile after integration
✅ **Do** add debug HUD for physics values

---

## Debug Commands

Add these for testing:

```typescript
// In browser console
window.debugPhysics = () => {
  console.log('Position:', physics.state.position);
  console.log('Velocity:', physics.state.velocity);
  console.log('Speed:', physics.getSpeed());
  console.log('Angular Velocity:', physics.state.angularVelocity);
  console.log('Fuel:', physics.state.fuel);
  console.log('Delta-V:', physics.getDeltaV());
};

// Call every frame for live debug
setInterval(window.debugPhysics, 1000);
```

---

## Success!

If you followed these steps, you now have:
- ✅ Newtonian space flight physics
- ✅ Momentum and drift
- ✅ Angular velocity and inertia
- ✅ Meaningful ship variants
- ✅ Flight assist toggle
- ✅ Foundation for advanced features

**Time spent**: ~2 hours  
**Benefit**: Transforms game from arcade to simulator

---

## Questions?

Refer to:
- `PHYSICS_ANALYSIS.md` - Technical deep-dive
- `PHYSICS_COMPARISON.md` - Before/after comparison
- `PHYSICS_DIAGRAM.md` - Visual diagrams
- `physics.example.ts` - Full implementation

All in `/docs` folder.
