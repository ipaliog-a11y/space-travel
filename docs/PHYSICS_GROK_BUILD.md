# Grok Build flight physics — current model and recommendations

**Applies to the live Starwake app** (`src/lib/starwake/engine.ts`, `orbit.ts`, `catalog.ts`).

Genre stays **Elite-style flight-assist arcade on Kepler worlds**. Not Kerbal. Not 6DOF.
Non-goals until named: station interiors, planet landings, 6DOF, multiplayer (`BUILD.md`).

Status: slices **1 (softer well), 2 (camera bank), 4 (regime HUD)** shipped in v0.1.15. Mass-in-thrust (3) and hull-forward (5) still later.

---

## What the live model actually does

The ship has a world position and velocity. Attitude is a quaternion. Drive is a **speed setpoint**, not a force. Mass is a hangar number; the integrator never divides by it.

### Three local-flight regimes

| Regime | When | Motion |
|--------|------|--------|
| **Free coast** | No planet SOI, throttle ≤ 3% | Full `gravityAt` (star + nearby planets). Coast is real. |
| **Free thrust** | No planet SOI, throttle > 3% | Velocity **lerps toward circular orbit + look-slaved thrust**. Gravity while thrusting is **40%**. |
| **Planet well** | Inside `planetSOI` (`radius × 8`, hold `× 1.28`) | Position is Kepler-relative. Coast damps at `1-exp(-0.35 h)` (not zeroed). Park spring on Arrive / first SOI capture only; throttle or OD clears hold. |

Integrator: `engine.ts` ~2168–2309. Gravity helper: `orbit.ts` `gravityAt` / `circularVelocity` / `keplerState`.

### Attitude and camera

- Stick / W S / arrows: pitch and yaw at `def.turnRate` (rate, not inertia).
- Q / E: writes `shipRoll` and `bankRoll`.
- Camera: `viewFromLook(view, clamp(bankRoll, ±0.35), lookYaw, lookPitch)`. Dock / berth / jump force `roll = 0`.
- Thrust vector is **look-slaved** (`thrustDir` = orient × look, not hull-forward). Head-look aims the drive.

### Drive, fuel, mass

- Throttle 0–75% maps onto `cruiseSpeed`. Above 75% is overdrive toward `overdriveSpeed`, then heat.
- Boost is discrete charges (5), not a second tank.
- T1 burns whenever `drive > 0.04`: `drive × dt × T1_PER_DIST`. T2 is FSD fuel (charge sip + hop). Boost stays discrete charges, not a second reaction-mass tank.
- Courier `mass 0.7` / Hauler `mass 1.7` plus module deltas. **`def.mass` is only returned to the HUD.** Hauler already feels heavier via lower `turnRate` and `cruiseSpeed`.

### Docking (leave this alone)

10-bay ring, approach along gate `out`, berth when aligned. Corridor is in `engine.ts` ~2105–2164. Station meshes (`station-mesh.ts`) sit on that contract. A handling pass must not change `GATE_COUNT`, `gateFrame`, or berth thresholds.

---

## What is wrong (in play, not on paper)

1. **Well was a parking brake (fixed v0.1.15).** Coast no longer zeros relative velocity. Park spring is capture-only. Playtest: throttle off should circle; Arrive still parks.
2. **Thrust fights gravity in free space.** 40% gravity + lerp-to-circular means the drive is a speed-hold, not a burn. Fine for arcade cruise, muddy when you try to raise or lower orbit by pointing.
3. **Q/E banks the camera (fixed v0.1.15).** Clamp ±0.35; dock/jump stay level.
4. **Mass is a label.** Loadouts that add mass do not spool slower. Do not mix into the well pass.
5. **HUD names the law (fixed v0.1.15).** Free / Well / Park / Od / Dock. Speed is `spd` / `rel` / `orb`.

These are handling bugs, not “needs KSP.”

---

## Do not do

The discarded list (Newtonian from scratch, 6DOF thrusters, rocket equation, atmospheric drag, gravity wells as a new feature) **does not apply**. This build already has gravity, Kepler bodies, wells, and momentum. Implementing that list would throw away docking, surveys, and the current feel.

Out until named:

- 6DOF / translation thrusters
- Maneuver nodes / delta-V map
- Surface landings
- Station interiors
- FA-off as a full sim (a lighter assist toggle is slice 7, below)

---

## Recommended slices (priority order)

Keep arcade. Each slice is independently shippable. 1 is the one that makes orbit feel like orbit.

### 1. Softer well — **shipped v0.1.15**

**Change only the bound-planet branch.** Free-space coast already works.

- Coast in well: keep the Kepler-relative frame (so the planet does not run away), but **drop or heavily weaken** the relative-velocity damp. A light residual damp (`~0.15×` current) is enough to kill numerical drift.
- Park spring: fire **on Arrive / first SOI capture only** (or while a “hold altitude” assist is on). Do not run it every frame during local flight.
- Keep: surface keep-out (`radius × 1.13`), OD/boost punch-out, station-nav exception, docking corridor.
- Optional: if throttle is zero and relative speed is already small, allow a *gentle* tangential circularize so new players still “fall into” a park orbit instead of escaping on a leftover vector.

**Success:** you can circle a planet at constant altitude with throttle off and see the world rotate. Arrive still drops you in a safe park. Punch-out still leaves.

### 2. Camera bank — **shipped v0.1.15**

Pass `bankRoll` (already recovered toward 0) into `viewFromLook` instead of `0`. Clamp (~±0.35 rad). Do **not** auto-bank from yaw — that is aircraft.

**Success:** Q/E rolls the horizon; release recenters. Docking view stays readable.

### 3. Mass in acceleration

Use `def.mass` where velocity is pushed:

- Well cruise thrust: `acc = drive * 2.2 / max(0.45, def.mass)` (today mass is ignored).
- Free-space lerp rate: slightly slower for the hauler (e.g. `3.1 / mass`).
- Do not retune `turnRate` here — it already differs per hull.

**Success:** a full hauler spools later than a light courier on the same throttle. Modules that add mass are felt.

### 4. Regime HUD — **shipped v0.1.15**

Surface the actual law, not just Well/Free:

| Chip | Meaning |
|------|---------|
| Free | no SOI, gravity on |
| Well | in SOI, flying relative |
| Park | park spring holding |
| Od / Boost | speed-setpoint punch |
| Dock | corridor |

Speed: always say whether the number is **relative** or **inertial**. Keep `orb` for coast-in-well.

Small chrome change, big “I understand why I stuck.”

### 5. Hull-forward thrust (optional, after 1)

Today drive follows the camera. Elite points the nose; look is independent.

- Default: thrust along hull forward (`rotateVec(orientQuat, [0,0,-1])`).
- Keep look for camera / lock line.
- If look-aim stays, label it in Options (“look steers drive”).

Do not ship this in the same pass as the well change — two feel shifts at once.

### 6. Two-tank fuel (BUILD.md, separate slice)

1. Hydrogen / jump — FSD charge and interstellar jump.
2. Reaction mass / boost — in-system boost and overdrive.
Cruise throttle cheap or free.

Courier: small jump tank, sips boost. Hauler: fat jump tank, hungry boost.  
Do not mix this into 1–4.

### 7. Assist toggle (later)

- **Assist on (default):** slice-1 well (soft damp + capture park).
- **Assist off:** no park spring, no circular lerp while thrusting, full gravity always. Still no 6DOF, still look or hull forward only.

---

## Suggested first handling pass

v0.1.15 shipped **1 + 2 + 4**. Leave **3 (mass)** for a later handling pass.

Leave docking, jump, transit, surveys, and station meshes untouched.

### Tune targets (start here, then play)

| Knob | Today | First try |
|------|-------|-----------|
| Well coast damp | `1 - exp(-0.35 h)` (shipped) | leave unless orbit still glues |
| Park spring | Arrive / first SOI only (shipped) | leave |
| Gravity while thrusting (free) | 0.4 | leave until well is right |
| Camera roll | `clamp(bankRoll, -0.35, 0.35)` (shipped) | leave |
| Mass in well acc | unused | `2.2 / max(0.45, mass)` — next handling pass |

### QA (existing Playwright + hands)

- Arrive Helion I: still parks, no lithobrake.
- Throttle off in well: drift / orbit, not glue.
- OD out of well: still punches free.
- Dock Helion I Lock: same 10-bay corridor, berth thresholds unchanged.
- Q/E: horizon banks, recenters.
- Courier vs hauler: spool difference on the same throttle.
- Survey: still requires well; no pause regression.

---

## Code map

| What | Where |
|------|--------|
| Integrator (three laws) | `src/lib/starwake/engine.ts` `tick`, ~2168–2309 |
| Camera bank | same file, `clamp(bankRoll, ±0.35)` into `viewFromLook` |
| Look-slaved thrust | `thrustDir()` ~796 |
| Docking corridor | ~2105–2164 |
| Kepler / gravity | `src/lib/starwake/orbit.ts` |
| SOI / park / keep-out | `planetSOI` (`radius×8`), `planetPark` (`×1.52`), `planetKeepOut` (`×1.13`) |
| Hull stats | `src/lib/starwake/catalog.ts` |
| HUD Free / Well / Park / Od / Dock | `src/components/starwake/FlightChrome.tsx` |
| Non-goals | `BUILD.md` |

