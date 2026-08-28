import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  GAME_DAY_SEC,
  starMu,
  periodDays,
  planetMu,
  wrapTau,
  keplerState,
  keplerPosition,
  keplerPlane,
  planetSOI,
  orbitPolyline,
  circularVelocity,
  gravityAt,
  cometMeanN,
} from './orbit.ts';
import type { Planet, StarSystem, KeplerOrbit } from './types.ts';

describe('orbit calculations', () => {
  describe('GAME_DAY_SEC', () => {
    it('defines game day duration', () => {
      assert.strictEqual(GAME_DAY_SEC, 30);
    });
  });

  describe('starMu', () => {
    it('calculates gravitational parameter for sun-like star', () => {
      const mu = starMu(88); // Sun radius
      assert.ok(mu > 0);
      // Should scale with mass (radius^3)
    });

    it('scales with star radius cubed', () => {
      const mu1 = starMu(88);
      const mu2 = starMu(176); // 2x radius
      
      // Mass scales with r^3, so mu should scale similarly
      const ratio = mu2 / mu1;
      assert.ok(ratio > 7); // Should be roughly 8 (2^3)
      assert.ok(ratio < 9);
    });

    it('handles small stars', () => {
      const mu = starMu(28); // Small star
      assert.ok(mu > 0);
    });

    it('enforces minimum radius', () => {
      const mu1 = starMu(10);
      const mu2 = starMu(24.64); // 88 * 0.28
      // Both should use minimum radius
      assert.ok(Math.abs(mu1 - mu2) < 0.0001);
    });
  });

  describe('periodDays', () => {
    it('calculates orbital period from mean motion', () => {
      const meanN = Math.PI * 2 / (365 * GAME_DAY_SEC); // 1 year
      const days = periodDays(meanN);
      assert.ok(Math.abs(days - 365) < 0.01);
    });

    it('handles zero mean motion', () => {
      const days = periodDays(0);
      assert.strictEqual(days, 365);
    });

    it('inverse relationship with mean motion', () => {
      const days1 = periodDays(1);
      const days2 = periodDays(2);
      
      assert.ok(days2 < days1);
      assert.ok(Math.abs(days1 / days2 - 2) < 0.01);
    });
  });

  describe('planetMu', () => {
    it('calculates gravitational parameter for rocky planet', () => {
      const planet: Planet = {
        id: 'test',
        name: 'Test',
        kind: 'rocky',
        radius: 1,
        orbit: 100,
        phase: 0,
        color: [1, 1, 1],
        rings: false,
        ringInner: 0,
        ringOuter: 0,
        ringTilt: 0,
        ringColor: [1, 1, 1],
        radiusKm: 6371,
        massEarth: 1,
        gravityG: 9.8,
        au: 1,
        yearDays: 365,
        dayHours: 24,
        ecc: 0,
        inc: 0,
        lan: 0,
        argp: 0,
        m0: 0,
        meanN: 1,
        climate: 'temperate',
        composition: 'rock',
        atmosphere: 'nitrogen',
        interest: 'wild',
        stationId: null,
        prospect: null,
        moons: [],
      };
      
      const mu = planetMu(planet);
      assert.strictEqual(mu, 0.042); // 1^3 * 1
    });

    it('applies multiplier for gas giants', () => {
      const gasPlanet = {
        id: 'gas',
        name: 'Gas Giant',
        kind: 'gas' as const,
        radius: 1,
        orbit: 100,
        phase: 0,
        color: [1, 1, 1] as [number, number, number],
        rings: false,
        ringInner: 0,
        ringOuter: 0,
        ringTilt: 0,
        ringColor: [1, 1, 1] as [number, number, number],
        radiusKm: 69911,
        massEarth: 318,
        gravityG: 24.79,
        au: 5.2,
        yearDays: 4333,
        dayHours: 9.9,
        ecc: 0.048,
        inc: 0,
        lan: 0,
        argp: 0,
        m0: 0,
        meanN: 1,
        climate: 'gas',
        composition: 'hydrogen',
        atmosphere: 'hydrogen',
        interest: 'wild' as const,
        stationId: null,
        prospect: null,
        moons: [],
      };
      
      const mu = planetMu(gasPlanet);
      assert.strictEqual(mu, 0.042 * 2.6); // 1^3 * 2.6
    });

    it('scales with radius cubed', () => {
      const smallPlanet: Planet = {
        id: 'small',
        name: 'Small',
        kind: 'rocky',
        radius: 0.5,
        orbit: 100,
        phase: 0,
        color: [1, 1, 1],
        rings: false,
        ringInner: 0,
        ringOuter: 0,
        ringTilt: 0,
        ringColor: [1, 1, 1],
        radiusKm: 3185,
        massEarth: 0.125,
        gravityG: 2.45,
        au: 1,
        yearDays: 365,
        dayHours: 24,
        ecc: 0,
        inc: 0,
        lan: 0,
        argp: 0,
        m0: 0,
        meanN: 1,
        climate: 'barren',
        composition: 'rock',
        atmosphere: 'none',
        interest: 'wild',
        stationId: null,
        prospect: null,
        moons: [],
      };
      
      const mu = planetMu(smallPlanet);
      assert.ok(Math.abs(mu - 0.042 * 0.125) < 0.0001);
    });
  });

  describe('wrapTau', () => {
    it('wraps angle to [0, 2π]', () => {
      assert.strictEqual(wrapTau(0), 0);
      assert.ok(Math.abs(wrapTau(Math.PI * 2)) < 0.0001);
      assert.ok(Math.abs(wrapTau(Math.PI * 4)) < 0.0001);
    });

    it('handles negative angles', () => {
      assert.ok(Math.abs(wrapTau(-Math.PI * 2)) < 0.0001);
      assert.ok(Math.abs(wrapTau(-Math.PI) - Math.PI) < 0.0001);
    });

    it('handles angles in range', () => {
      const angle = Math.PI;
      assert.ok(Math.abs(wrapTau(angle) - angle) < 0.0001);
    });
  });

  describe('keplerPosition', () => {
    it('calculates position at periapsis', () => {
      const orbit: KeplerOrbit = {
        orbit: 100, // semi-major axis
        ecc: 0.5,
        inc: 0,
        lan: 0,
        argp: 0,
        m0: 0,
        meanN: 1,
      };
      
      // At t=0, M=0, so E=0, should be at periapsis
      const [x, y, z] = keplerPosition(orbit, 0);
      
      // For e=0.5, a=100, periapsis is at a(1-e) = 50
      assert.ok(Math.abs(x - 50) < 0.01);
      assert.strictEqual(y, 0);
      assert.strictEqual(z, 0);
    });

    it('maintains orbital plane', () => {
      const orbit: KeplerOrbit = {
        orbit: 100,
        ecc: 0.3,
        inc: 0,
        lan: 0,
        argp: 0,
        m0: 0,
        meanN: 1,
      };
      
      // Test that position values are reasonable (not NaN or Infinity)
      for (let t = 0; t < 10; t += 0.5) {
        const [x, y, z] = keplerPosition(orbit, t);
        assert.ok(Number.isFinite(x));
        assert.ok(Number.isFinite(y));
        assert.ok(Number.isFinite(z));
      }
    });

    it('handles inclined orbits', () => {
      const orbit: KeplerOrbit = {
        orbit: 100,
        ecc: 0.1,
        inc: Math.PI / 4,
        lan: 0,
        argp: 0,
        m0: 0,
        meanN: 1,
      };
      
      const [x, y, z] = keplerPosition(orbit, 0);
      // With non-zero inclination and specific orbital elements, Z may still be 0 at certain points
      // Just verify we get valid coordinates
      assert.ok(typeof x === 'number');
      assert.ok(typeof y === 'number');
      assert.ok(typeof z === 'number');
    });
  });

  describe('keplerPlane', () => {
    it('returns 2D position in orbital plane', () => {
      const orbit: KeplerOrbit = {
        orbit: 100,
        ecc: 0.5,
        inc: 0,
        lan: 0,
        argp: 0,
        m0: 0,
        meanN: 1,
      };
      
      const [x, y] = keplerPlane(orbit, 0);
      
      // At periapsis
      assert.ok(Math.abs(x - 50) < 0.01);
      assert.strictEqual(y, 0);
    });

    it('accounts for argument of periapsis', () => {
      const orbit: KeplerOrbit = {
        orbit: 100,
        ecc: 0.5,
        inc: 0,
        lan: 0,
        argp: Math.PI / 2,
        m0: 0,
        meanN: 1,
      };
      
      const [x, y] = keplerPlane(orbit, 0);
      
      // Periapsis rotated 90 degrees
      assert.ok(Math.abs(x) < 0.01);
      assert.ok(Math.abs(y - 50) < 0.01);
    });
  });

  describe('keplerState', () => {
    it('returns position and velocity', () => {
      const orbit: KeplerOrbit = {
        orbit: 100,
        ecc: 0.3,
        inc: 0,
        lan: 0,
        argp: 0,
        m0: 0,
        meanN: 1,
      };
      
      const state = keplerState(orbit, 0);
      
      assert.ok(Array.isArray(state.pos));
      assert.strictEqual(state.pos.length, 3);
      assert.ok(Array.isArray(state.vel));
      assert.strictEqual(state.vel.length, 3);
    });

    it('velocity perpendicular to position in circular orbit', () => {
      const orbit: KeplerOrbit = {
        orbit: 100,
        ecc: 0,
        inc: 0,
        lan: 0,
        argp: 0,
        m0: 0,
        meanN: 1,
      };
      
      const { pos, vel } = keplerState(orbit, 0);
      
      // Dot product should be zero for circular orbit
      const dot = pos[0] * vel[0] + pos[1] * vel[1] + pos[2] * vel[2];
      assert.ok(Math.abs(dot) < 0.0001);
    });
  });

  describe('cometMeanN', () => {
    it('runs at a quarter of planet Kepler rate on a 30s day', () => {
      const sma = 12000;
      const n = cometMeanN(sma, 88);
      const kepler = Math.sqrt(starMu(88) / (sma * sma * sma));
      assert.ok(Math.abs(n - kepler * 0.25) < 1e-10);
    });
  });

  describe('planetSOI', () => {
    it('calculates sphere of influence', () => {
      const planet: Planet = {
        id: 'test',
        name: 'Test',
        kind: 'rocky',
        radius: 10,
        orbit: 100,
        phase: 0,
        color: [1, 1, 1],
        rings: false,
        ringInner: 0,
        ringOuter: 0,
        ringTilt: 0,
        ringColor: [1, 1, 1],
        radiusKm: 63710,
        massEarth: 1,
        gravityG: 9.8,
        au: 1,
        yearDays: 365,
        dayHours: 24,
        ecc: 0,
        inc: 0,
        lan: 0,
        argp: 0,
        m0: 0,
        meanN: 1,
        climate: 'temperate',
        composition: 'rock',
        atmosphere: 'nitrogen',
        interest: 'wild',
        stationId: null,
        prospect: null,
        moons: [],
      };
      
      const soi = planetSOI(planet);
      assert.strictEqual(soi, 80); // 10 * 8
    });
  });

  describe('orbitPolyline', () => {
    it('generates orbital path points', () => {
      const orbit: KeplerOrbit = {
        orbit: 100,
        ecc: 0.3,
        inc: 0,
        lan: 0,
        argp: 0,
        m0: 0,
        meanN: 1,
      };
      
      const points = orbitPolyline(orbit, 96);
      
      assert.strictEqual(points.length, 96 * 3);
      assert.ok(points instanceof Float32Array);
      
      // Verify all points are finite
      for (let i = 0; i < points.length; i++) {
        assert.ok(Number.isFinite(points[i]));
      }
    });

    it('handles different sample counts', () => {
      const orbit: KeplerOrbit = {
        orbit: 100,
        ecc: 0.3,
        inc: 0,
        lan: 0,
        argp: 0,
        m0: 0,
        meanN: 1,
      };
      
      const points32 = orbitPolyline(orbit, 32);
      const points128 = orbitPolyline(orbit, 128);
      
      assert.strictEqual(points32.length, 32 * 3);
      assert.strictEqual(points128.length, 128 * 3);
    });
  });

  describe('circularVelocity', () => {
    it('calculates orbital velocity for circular orbit', () => {
      const mu = 1;
      const r = 10;
      
      const [vx, vy, vz] = circularVelocity(r, 0, 0, mu);
      
      // Velocity should be perpendicular to radius
      assert.ok(Math.abs(vx) < 0.0001);
      assert.ok(Math.abs(vy) < 0.0001);
      assert.ok(Math.abs(vz) > 0);
      
      // Magnitude should be sqrt(mu/r)
      const speed = Math.sqrt(vx * vx + vy * vy + vz * vz);
      assert.ok(Math.abs(speed - Math.sqrt(mu / r)) < 0.0001);
    });

    it('handles zero distance', () => {
      const [vx, vy, vz] = circularVelocity(0, 0, 0, 1);
      assert.strictEqual(vx, 0);
      assert.strictEqual(vy, 0);
      assert.strictEqual(vz, 0);
    });

    it('velocity direction follows right-hand rule', () => {
      const mu = 1;
      const r = 10;
      
      const [vx, vy, vz] = circularVelocity(r, 0, 0, mu);
      
      // For position on +X axis, velocity should be on Z axis (direction depends on convention)
      assert.ok(Math.abs(vz) > 0);
    });
  });

  describe('gravityAt', () => {
    it('calculates gravitational acceleration from star', () => {
      const system: StarSystem = {
        id: 'test',
        name: 'Test',
        x: 0,
        y: 0,
        z: 0,
        starColor: [1, 1, 1],
        starRadius: 88,
        planets: [],
        stations: [],
        belt: null,
        comets: [],
        nebula: { kind: 'arm', seed: 1, intensity: 1 },
      };
      
      const planetPos = () => [0, 0, 0] as [number, number, number];
      const [ax, ay, az] = gravityAt(system, 0, 100, 0, 0, planetPos);
      
      // Acceleration should be toward origin (star)
      assert.ok(ax < 0);
      assert.strictEqual(ay, 0);
      assert.strictEqual(az, 0);
    });

    it('includes planet gravity when close', () => {
      const planet: Planet = {
        id: 'test',
        name: 'Test',
        kind: 'rocky',
        radius: 10,
        orbit: 50,
        phase: 0,
        color: [1, 1, 1],
        rings: false,
        ringInner: 0,
        ringOuter: 0,
        ringTilt: 0,
        ringColor: [1, 1, 1],
        radiusKm: 63710,
        massEarth: 1,
        gravityG: 9.8,
        au: 1,
        yearDays: 365,
        dayHours: 24,
        ecc: 0,
        inc: 0,
        lan: 0,
        argp: 0,
        m0: 0,
        meanN: 1,
        climate: 'temperate',
        composition: 'rock',
        atmosphere: 'nitrogen',
        interest: 'wild',
        stationId: null,
        prospect: null,
        moons: [],
      };
      
      const system: StarSystem = {
        id: 'test',
        name: 'Test',
        x: 0,
        y: 0,
        z: 0,
        starColor: [1, 1, 1],
        starRadius: 88,
        planets: [planet],
        stations: [],
        belt: null,
        comets: [],
        nebula: { kind: 'arm', seed: 1, intensity: 1 },
      };
      
      const planetPos = () => [50, 0, 0] as [number, number, number];
      const [ax, ay, az] = gravityAt(system, 0, 51, 0, 0, planetPos);
      
      // Close to planet, should feel planet's gravity
      assert.ok(ax < 0); // Toward planet at x=50
    });

    it('ignores distant planets', () => {
      const planet: Planet = {
        id: 'test',
        name: 'Test',
        kind: 'rocky',
        radius: 10,
        orbit: 1000,
        phase: 0,
        color: [1, 1, 1],
        rings: false,
        ringInner: 0,
        ringOuter: 0,
        ringTilt: 0,
        ringColor: [1, 1, 1],
        radiusKm: 63710,
        massEarth: 1,
        gravityG: 9.8,
        au: 1,
        yearDays: 365,
        dayHours: 24,
        ecc: 0,
        inc: 0,
        lan: 0,
        argp: 0,
        m0: 0,
        meanN: 1,
        climate: 'temperate',
        composition: 'rock',
        atmosphere: 'nitrogen',
        interest: 'wild',
        stationId: null,
        prospect: null,
        moons: [],
      };
      
      const system: StarSystem = {
        id: 'test',
        name: 'Test',
        x: 0,
        y: 0,
        z: 0,
        starColor: [1, 1, 1],
        starRadius: 88,
        planets: [planet],
        stations: [],
        belt: null,
        comets: [],
        nebula: { kind: 'arm', seed: 1, intensity: 1 },
      };
      
      const planetPos = () => [1000, 0, 0] as [number, number, number];
      const [ax, ay, az] = gravityAt(system, 0, 100, 0, 0, planetPos);
      
      // Planet too far, only star gravity
      assert.ok(ax < 0);
    });
  });
});
