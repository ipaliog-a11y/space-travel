/**
 * Improved Flight Physics Implementation
 * 
 * This file demonstrates the recommended physics model for Starwake Sim.
 * It replaces the arcade-style movement in starwake.html with proper
 * Newtonian space flight physics while maintaining playability.
 */

// ============================================================================
// Vector3 Utility Class
// ============================================================================

class Vector3 {
  x: number;
  y: number;
  z: number;

  constructor(x = 0, y = 0, z = 0) {
    this.x = x;
    this.y = y;
    this.z = z;
  }

  static zero() { return new Vector3(); }
  static forward() { return new Vector3(0, 0, 1); }
  static up() { return new Vector3(0, 1, 0); }
  static right() { return new Vector3(1, 0, 0); }

  add(v: Vector3): Vector3 {
    return new Vector3(this.x + v.x, this.y + v.y, this.z + v.z);
  }

  subtract(v: Vector3): Vector3 {
    return new Vector3(this.x - v.x, this.y - v.y, this.z - v.z);
  }

  scale(s: number): Vector3 {
    return new Vector3(this.x * s, this.y * s, this.z * s);
  }

  negate(): Vector3 {
    return new Vector3(-this.x, -this.y, -this.z);
  }

  length(): number {
    return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z);
  }

  lengthSquared(): number {
    return this.x * this.x + this.y * this.y + this.z * this.z;
  }

  normalize(): Vector3 {
    const len = this.length();
    if (len < 0.0001) return Vector3.zero();
    return this.scale(1 / len);
  }

  dot(v: Vector3): number {
    return this.x * v.x + this.y * v.y + this.z * v.z;
  }

  cross(v: Vector3): Vector3 {
    return new Vector3(
      this.y * v.z - this.z * v.y,
      this.z * v.x - this.x * v.z,
      this.x * v.y - this.y * v.x
    );
  }

  clone(): Vector3 {
    return new Vector3(this.x, this.y, this.z);
  }
}

// ============================================================================
// Quaternion Class for 3D Rotation
// ============================================================================

class Quaternion {
  x: number;
  y: number;
  z: number;
  w: number;

  constructor(x = 0, y = 0, z = 0, w = 1) {
    this.x = x;
    this.y = y;
    this.z = z;
    this.w = w;
  }

  static identity() { return new Quaternion(0, 0, 0, 1); }

  static fromAxisAngle(axis: Vector3, angle: number): Quaternion {
    const halfAngle = angle * 0.5;
    const sinHalf = Math.sin(halfAngle);
    return new Quaternion(
      axis.x * sinHalf,
      axis.y * sinHalf,
      axis.z * sinHalf,
      Math.cos(halfAngle)
    );
  }

  static fromEuler(pitch: number, yaw: number, roll: number): Quaternion {
    const cp = Math.cos(pitch * 0.5);
    const sp = Math.sin(pitch * 0.5);
    const cy = Math.cos(yaw * 0.5);
    const sy = Math.sin(yaw * 0.5);
    const cr = Math.cos(roll * 0.5);
    const sr = Math.sin(roll * 0.5);

    return new Quaternion(
      sp * cy * cr - cp * sy * sr,
      cp * sy * cr + sp * cy * sr,
      cp * cy * sr - sp * sy * cr,
      cp * cy * cr + sp * sy * sr
    );
  }

  multiply(q: Quaternion): Quaternion {
    return new Quaternion(
      this.w * q.x + this.x * q.w + this.y * q.z - this.z * q.y,
      this.w * q.y - this.x * q.z + this.y * q.w + this.z * q.x,
      this.w * q.z + this.x * q.y - this.y * q.x + this.z * q.w,
      this.w * q.w - this.x * q.x - this.y * q.y - this.z * q.z
    );
  }

  normalize(): Quaternion {
    const len = Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z + this.w * this.w);
    if (len < 0.0001) return Quaternion.identity();
    return new Quaternion(this.x / len, this.y / len, this.z / len, this.w / len);
  }

  conjugate(): Quaternion {
    return new Quaternion(-this.x, -this.y, -this.z, this.w);
  }

  // Transform a vector by this quaternion
  transform(v: Vector3): Vector3 {
    const qv = new Quaternion(v.x, v.y, v.z, 0);
    const qConj = this.conjugate();
    const result = this.multiply(qv).multiply(qConj);
    return new Vector3(result.x, result.y, result.z);
  }

  // Get forward direction (local +Z axis)
  forward(): Vector3 {
    return this.transform(Vector3.forward());
  }

  // Get up direction (local +Y axis)
  up(): Vector3 {
    return this.transform(Vector3.up());
  }

  // Get right direction (local +X axis)
  right(): Vector3 {
    return this.transform(Vector3.right());
  }

  // Spherical linear interpolation
  slert(q: Quaternion, t: number): Quaternion {
    let dot = this.w * q.w + this.x * q.x + this.y * q.y + this.z * q.z;
    
    if (dot < 0) {
      q = new Quaternion(-q.x, -q.y, -q.z, -q.w);
      dot = -dot;
    }

    if (dot > 0.9995) {
      return new Quaternion(
        this.x + t * (q.x - this.x),
        this.y + t * (q.y - this.y),
        this.z + t * (q.z - this.z),
        this.w + t * (q.w - this.w)
      ).normalize();
    }

    const theta = Math.acos(dot);
    const sinTheta = Math.sin(theta);
    const a = Math.sin((1 - t) * theta) / sinTheta;
    const b = Math.sin(t * theta) / sinTheta;

    return new Quaternion(
      this.x * a + q.x * b,
      this.y * a + q.y * b,
      this.z * a + q.z * b,
      this.w * a + q.w * b
    );
  }
}

// ============================================================================
// Ship Definition with Realistic Physics Properties
// ============================================================================

interface ShipDef {
  id: string;
  name: string;
  
  // Mass properties
  dryMass: number;        // kg (ship without fuel)
  fuelCapacity: number;   // kg
  momentInertiaX: number; // kg⋅m² (pitch resistance)
  momentInertiaY: number; // kg⋅m² (yaw resistance)
  momentInertiaZ: number; // kg⋅m² (roll resistance)
  
  // Engine properties
  mainEngineThrust: number;    // Newtons
  retroEngineThrust: number;   // Newtons
  lateralThrust: number;       // Newtons (each thruster)
  verticalThrust: number;      // Newtons (each thruster)
  specificImpulse: number;     // seconds (efficiency)
  
  // RCS (Reaction Control System) for rotation
  rcsTorquePitch: number;  // N⋅m
  rcsTorqueYaw: number;    // N⋅m
  rcsTorqueRoll: number;   // N⋅m
  
  // Hull
  maxHull: number;
  
  // Visual/audio
  accent: string;
  audioPitch: number;
}

// Example ship definitions with realistic values
const SHIP_DEFS: Record<string, ShipDef> = {
  courier: {
    id: 'courier',
    name: 'Courier',
    dryMass: 2500,           // Light ship
    fuelCapacity: 1500,      // kg
    momentInertiaX: 8000,    // Relatively agile
    momentInertiaY: 12000,
    momentInertiaZ: 15000,
    mainEngineThrust: 180000,  // ~18 tons of thrust
    retroEngineThrust: 45000,
    lateralThrust: 15000,
    verticalThrust: 15000,
    specificImpulse: 400,      // Good efficiency
    rcsTorquePitch: 4000,
    rcsTorqueYaw: 4000,
    rcsTorqueRoll: 6000,
    maxHull: 60,
    accent: '#4fc3f7',
    audioPitch: 1.05,
  },
  
  hauler: {
    id: 'hauler',
    name: 'Hauler',
    dryMass: 12000,          // Heavy ship
    fuelCapacity: 4000,
    momentInertiaX: 180000,  // Very sluggish rotation
    momentInertiaY: 280000,
    momentInertiaZ: 350000,
    mainEngineThrust: 450000, // Lots of thrust but heavy
    retroEngineThrust: 90000,
    lateralThrust: 25000,
    verticalThrust: 25000,
    specificImpulse: 350,     // Lower efficiency
    rcsTorquePitch: 6000,
    rcsTorqueYaw: 6000,
    rcsTorqueRoll: 8000,
    maxHull: 120,
    accent: '#ffb74d',
    audioPitch: 0.85,
  },
  
  scout: {
    id: 'scout',
    name: 'Scout',
    dryMass: 4000,
    fuelCapacity: 3500,      // Large tank for exploration
    momentInertiaX: 15000,
    momentInertiaY: 22000,
    momentInertiaZ: 28000,
    mainEngineThrust: 200000,
    retroEngineThrust: 50000,
    lateralThrust: 18000,
    verticalThrust: 18000,
    specificImpulse: 450,     // Best efficiency
    rcsTorquePitch: 4500,
    rcsTorqueYaw: 4500,
    rcsTorqueRoll: 7000,
    maxHull: 80,
    accent: '#81c784',
    audioPitch: 1.0,
  },
  
  interceptor: {
    id: 'interceptor',
    name: 'Interceptor',
    dryMass: 3000,
    fuelCapacity: 1200,      // Small tank, high consumption
    momentInertiaX: 6000,    // Very agile
    momentInertiaY: 9000,
    momentInertiaZ: 11000,
    mainEngineThrust: 240000, // High thrust-to-mass
    retroEngineThrust: 60000,
    lateralThrust: 20000,
    verticalThrust: 20000,
    specificImpulse: 320,     // Burns fuel fast
    rcsTorquePitch: 5500,
    rcsTorqueYaw: 5500,
    rcsTorqueRoll: 8500,
    maxHull: 70,
    accent: '#e57373',
    audioPitch: 1.15,
  },
  
  liner: {
    id: 'liner',
    name: 'Liner',
    dryMass: 8000,
    fuelCapacity: 2500,
    momentInertiaX: 90000,
    momentInertiaY: 140000,
    momentInertiaZ: 180000,
    mainEngineThrust: 280000,
    retroEngineThrust: 70000,
    lateralThrust: 20000,
    verticalThrust: 20000,
    specificImpulse: 380,
    rcsTorquePitch: 5000,
    rcsTorqueYaw: 5000,
    rcsTorqueRoll: 7000,
    maxHull: 100,
    accent: '#ba68c8',
    audioPitch: 0.92,
  },
};

// ============================================================================
// Physics State
// ============================================================================

interface PhysicsState {
  // Linear motion
  position: Vector3;
  velocity: Vector3;
  acceleration: Vector3;
  
  // Angular motion
  orientation: Quaternion;
  angularVelocity: Vector3;  // radians/second
  angularAcceleration: Vector3;
  
  // Current mass (changes as fuel burns)
  fuel: number;
  mass: number;
  
  // Hull integrity
  hull: number;
  
  // Engine state
  throttle: number;    // 0-1
  fsdCooldown: number; // seconds
}

// ============================================================================
// Physics Engine
// ============================================================================

interface PhysicsConfig {
  flightAssist: boolean;  // Auto-dampening for accessibility
  rotationalDamping: number;  // 0-1, higher = faster stop
  linearDamping: number;      // Very low for space (0.999+)
  maxAngularVelocity: number; // rad/s cap for playability
}

const DEFAULT_CONFIG: PhysicsConfig = {
  flightAssist: true,
  rotationalDamping: 0.98,  // 2% damping per second
  linearDamping: 0.9995,    // Minimal drag in space
  maxAngularVelocity: 2.0,  // ~115 deg/s max rotation
};

class PhysicsEngine {
  state: PhysicsState;
  config: PhysicsConfig;
  shipDef: ShipDef;

  constructor(shipId: string, config: PhysicsConfig = DEFAULT_CONFIG) {
    this.shipDef = SHIP_DEFS[shipId];
    this.config = config;
    
    this.state = {
      position: Vector3.zero(),
      velocity: Vector3.zero(),
      acceleration: Vector3.zero(),
      orientation: Quaternion.identity(),
      angularVelocity: Vector3.zero(),
      angularAcceleration: Vector3.zero(),
      fuel: this.shipDef.fuelCapacity,
      mass: this.shipDef.dryMass + this.shipDef.fuelCapacity,
      hull: this.shipDef.maxHull,
      throttle: 0,
      fsdCooldown: 0,
    };
  }

  /**
   * Main physics integration step
   * @param input Player input (-1 to 1 for each axis)
   * @param dt Delta time in seconds
   */
  integrate(input: FlightInput, dt: number) {
    // Clamp delta time to prevent instability
    dt = Math.min(dt, 0.1);
    
    // 1. Calculate forces from thrusters
    const forces = this.calculateForces(input);
    
    // 2. Calculate torques from RCS
    const torques = this.calculateTorques(input);
    
    // 3. Apply Newton's laws: F=ma and τ=Iα
    this.applyForces(forces, dt);
    this.applyTorques(torques, dt);
    
    // 4. Integrate motion (semi-implicit Euler)
    this.integrateLinear(dt);
    this.integrateAngular(dt);
    
    // 5. Apply damping (flight assist or minimal space drag)
    this.applyDamping();
    
    // 6. Update fuel and mass
    this.burnFuel(input, dt);
    
    // 7. Update FSD cooldown
    if (this.state.fsdCooldown > 0) {
      this.state.fsdCooldown -= dt;
    }
  }

  private calculateForces(input: FlightInput): Vector3 {
    const ship = this.shipDef;
    const orientation = this.state.orientation;
    
    let totalForce = Vector3.zero();
    
    // Main engine (+Z direction in local space)
    if (input.throttle > 0) {
      const thrust = orientation.forward().scale(
        input.throttle * ship.mainEngineThrust
      );
      totalForce = totalForce.add(thrust);
    }
    
    // Retro thrusters (-Z)
    if (input.retro > 0) {
      const retroThrust = orientation.forward().scale(
        -input.retro * ship.retroEngineThrust
      );
      totalForce = totalForce.add(retroThrust);
    }
    
    // Lateral thrusters (±X)
    if (Math.abs(input.lateral) > 0.01) {
      const direction = input.lateral > 0 ? 1 : -1;
      const lateralThrust = orientation.right().scale(
        direction * Math.abs(input.lateral) * ship.lateralThrust
      );
      totalForce = totalForce.add(lateralThrust);
    }
    
    // Vertical thrusters (±Y)
    if (Math.abs(input.vertical) > 0.01) {
      const direction = input.vertical > 0 ? 1 : -1;
      const verticalThrust = orientation.up().scale(
        direction * Math.abs(input.vertical) * ship.verticalThrust
      );
      totalForce = totalForce.add(verticalThrust);
    }
    
    return totalForce;
  }

  private calculateTorques(input: FlightInput): Vector3 {
    const ship = this.shipDef;
    
    return new Vector3(
      input.pitch * ship.rcsTorquePitch,   // Pitch torque
      input.yaw * ship.rcsTorqueYaw,       // Yaw torque
      input.roll * ship.rcsTorqueRoll      // Roll torque
    );
  }

  private applyForces(forces: Vector3, dt: number) {
    // F = ma → a = F/m
    const mass = this.state.mass;
    this.state.acceleration = forces.scale(1 / mass);
  }

  private applyTorques(torques: Vector3, dt: number) {
    const inertia = new Vector3(
      this.shipDef.momentInertiaX,
      this.shipDef.momentInertiaY,
      this.shipDef.momentInertiaZ
    );
    
    // τ = Iα → α = τ/I
    this.state.angularAcceleration = new Vector3(
      torques.x / inertia.x,
      torques.y / inertia.y,
      torques.z / inertia.z
    );
  }

  private integrateLinear(dt: number) {
    // Semi-implicit Euler integration
    this.state.velocity = this.state.velocity.add(
      this.state.acceleration.scale(dt)
    );
    
    this.state.position = this.state.position.add(
      this.state.velocity.scale(dt)
    );
  }

  private integrateAngular(dt: number) {
    // Update angular velocity
    this.state.angularVelocity = this.state.angularVelocity.add(
      this.state.angularAcceleration.scale(dt)
    );
    
    // Clamp angular velocity for playability
    const angVel = this.state.angularVelocity;
    const maxAngVel = this.config.maxAngularVelocity;
    const angVelLen = angVel.length();
    
    if (angVelLen > maxAngVel) {
      this.state.angularVelocity = angVel.normalize().scale(maxAngVel);
    }
    
    // Apply rotation using quaternion
    const rotationAxis = this.state.angularVelocity.normalize();
    const rotationAngle = this.state.angularVelocity.length() * dt;
    
    if (rotationAngle > 0.0001) {
      const deltaRotation = Quaternion.fromAxisAngle(rotationAxis, rotationAngle);
      this.state.orientation = deltaRotation.multiply(this.state.orientation).normalize();
    }
  }

  private applyDamping() {
    // Flight assist: automatic stabilization
    if (this.config.flightAssist) {
      // Strong rotational damping for "atmospheric" feel
      this.state.angularVelocity = this.state.angularVelocity.scale(
        this.config.rotationalDamping
      );
      
      // Some linear damping too
      this.state.velocity = this.state.velocity.scale(
        this.config.linearDamping
      );
    } else {
      // Minimal space drag - drift continues
      this.state.velocity = this.state.velocity.scale(0.9999);
      // Very slight rotational damping (internal friction only)
      this.state.angularVelocity = this.state.angularVelocity.scale(0.9995);
    }
  }

  private burnFuel(input: FlightInput, dt: number) {
    // Calculate fuel consumption based on thrust used
    const ship = this.shipDef;
    const totalThrustRatio = Math.abs(input.throttle);
    
    // Fuel flow rate: kg/s
    const maxFuelFlow = ship.mainEngineThrust / (ship.specificImpulse * 9.81);
    const fuelConsumed = maxFuelFlow * totalThrustRatio * dt;
    
    this.state.fuel = Math.max(0, this.state.fuel - fuelConsumed);
    this.state.mass = ship.dryMass + this.state.fuel;
  }

  // ============================================================================
  // Utility Methods
  // ============================================================================

  getSpeed(): number {
    return this.state.velocity.length();
  }

  getDeltaV(): number {
    // Tsiolkovsky rocket equation: Δv = Isp × g₀ × ln(m₀/m₁)
    const g0 = 9.81;
    const dryMass = this.shipDef.dryMass;
    const wetMass = dryMass + this.state.fuel;
    return this.shipDef.specificImpulse * g0 * Math.log(wetMass / dryMass);
  }

  canJump(distanceLy: number, fuelRequired: number): boolean {
    return (
      this.state.fuel >= fuelRequired &&
      this.state.fsdCooldown <= 0 &&
      distanceLy <= this.getJumpRange()
    );
  }

  getJumpRange(): number {
    // Simplified: based on fuel efficiency
    return this.getDeltaV() / 1000; // Convert to light-years (scaled)
  }

  // Get velocity in local ship coordinates
  getLocalVelocity(): Vector3 {
    const orientation = this.state.orientation.conjugate();
    return orientation.transform(this.state.velocity);
  }

  // Angle to target (in degrees)
  angleToTarget(targetDirection: Vector3): number {
    const forward = this.state.orientation.forward();
    const dot = forward.normalize().dot(targetDirection.normalize());
    return Math.acos(Math.max(-1, Math.min(1, dot))) * (180 / Math.PI);
  }
}

// ============================================================================
// Input Interface
// ============================================================================

interface FlightInput {
  throttle: number;   // 0 to 1 (main engine)
  retro: number;      // 0 to 1 (retro thrusters)
  lateral: number;    // -1 to 1 (strafe left/right)
  vertical: number;   // -1 to 1 (strafe up/down)
  pitch: number;      // -1 to 1 (rotate nose up/down)
  yaw: number;        // -1 to 1 (rotate nose left/right)
  roll: number;       // -1 to 1 (roll around Z axis)
}

// ============================================================================
// Example Usage
// ============================================================================

/*
// Initialize physics for Courier
const physics = new PhysicsEngine('courier', {
  flightAssist: true,
  rotationalDamping: 0.98,
  linearDamping: 0.9995,
  maxAngularVelocity: 2.0,
});

// Game loop
let lastTime = performance.now();

function gameLoop() {
  const now = performance.now();
  const dt = (now - lastTime) / 1000; // Convert to seconds
  lastTime = now;
  
  // Map player input to flight controls
  const input: FlightInput = {
    throttle: keyboard['KeyW'] ? 1 : 0,
    retro: keyboard['KeyS'] ? 1 : 0,
    lateral: (keyboard['KeyD'] ? 1 : 0) - (keyboard['KeyA'] ? 1 : 0),
    vertical: (keyboard['KeyE'] ? 1 : 0) - (keyboard['KeyQ'] ? 1 : 0),
    pitch: stickY,  // From virtual stick or mouse
    yaw: stickX,
    roll: (keyboard['KeyR'] ? 1 : 0) - (keyboard['KeyF'] ? 1 : 0),
  };
  
  // Step physics
  physics.integrate(input, dt);
  
  // Update visual representation
  updateCamera(
    physics.state.position,
    physics.state.orientation
  );
  
  // Update HUD
  updateHUD({
    speed: physics.getSpeed(),
    deltaV: physics.getDeltaV(),
    fuel: physics.state.fuel,
    hull: physics.state.hull,
  });
  
  requestAnimationFrame(gameLoop);
}

gameLoop();
*/

// Export for use in app
export {
  Vector3,
  Quaternion,
  PhysicsEngine,
  PhysicsState,
  PhysicsConfig,
  FlightInput,
  ShipDef,
  SHIP_DEFS,
  DEFAULT_CONFIG,
};
