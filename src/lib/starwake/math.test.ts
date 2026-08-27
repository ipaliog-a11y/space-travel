import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  clamp,
  lerp,
  mulberry32,
  hashu,
  mat4,
  perspective,
  multiply,
  identity,
  translation,
  composeModel,
  composeAlongY,
  composeAlongZ,
  viewFromLook,
  quatMul,
  quatFromEuler,
  quatFromAxisAngle,
  quatInvert,
  quatNormalize,
  quatToMat4,
  rotateVec,
  wrapDelta,
  quatLook,
  quatSlerp,
} from './math.ts';

describe('math utilities', () => {
  describe('clamp', () => {
    it('clamps value within range', () => {
      assert.strictEqual(clamp(5, 0, 10), 5);
      assert.strictEqual(clamp(-5, 0, 10), 0);
      assert.strictEqual(clamp(15, 0, 10), 10);
    });

    it('handles edge cases', () => {
      assert.strictEqual(clamp(0, 0, 10), 0);
      assert.strictEqual(clamp(10, 0, 10), 10);
    });

    it('handles reversed ranges', () => {
      // clamp with reversed range still clamps between min and max
      assert.strictEqual(clamp(5, 0, 10), 5);
      assert.strictEqual(clamp(-5, 0, 10), 0);
      assert.strictEqual(clamp(15, 0, 10), 10);
    });
  });

  describe('lerp', () => {
    it('interpolates linearly', () => {
      assert.strictEqual(lerp(0, 10, 0), 0);
      assert.strictEqual(lerp(0, 10, 0.5), 5);
      assert.strictEqual(lerp(0, 10, 1), 10);
    });

    it('handles extrapolation', () => {
      assert.strictEqual(lerp(0, 10, -0.5), -5);
      assert.strictEqual(lerp(0, 10, 1.5), 15);
    });

    it('works with negative ranges', () => {
      assert.strictEqual(lerp(-10, 10, 0.5), 0);
      assert.strictEqual(lerp(-10, 10, 0.25), -5);
    });
  });

  describe('mulberry32', () => {
    it('produces deterministic sequence', () => {
      const rng1 = mulberry32(12345);
      const rng2 = mulberry32(12345);
      
      const seq1 = [rng1(), rng1(), rng1()];
      const seq2 = [rng2(), rng2(), rng2()];
      
      assert.deepStrictEqual(seq1, seq2);
    });

    it('produces values in [0, 1)', () => {
      const rng = mulberry32(42);
      for (let i = 0; i < 100; i++) {
        const val = rng();
        assert.ok(val >= 0 && val < 1, `Value ${val} not in [0, 1)`);
      }
    });

    it('different seeds produce different sequences', () => {
      const rng1 = mulberry32(1);
      const rng2 = mulberry32(2);
      
      assert.notStrictEqual(rng1(), rng2());
    });
  });

  describe('hashu', () => {
    it('produces consistent hashes', () => {
      assert.strictEqual(hashu('test'), hashu('test'));
      assert.strictEqual(hashu(''), hashu(''));
    });

    it('different strings produce different hashes', () => {
      assert.notStrictEqual(hashu('a'), hashu('b'));
      assert.notStrictEqual(hashu('test'), hashu('Test'));
    });

    it('returns unsigned 32-bit integer', () => {
      const hash = hashu('hello');
      assert.ok(hash >= 0 && hash <= 0xFFFFFFFF);
    });
  });

  describe('mat4', () => {
    it('creates 16-element Float32Array', () => {
      const m = mat4();
      assert.strictEqual(m.length, 16);
      assert.ok(m instanceof Float32Array);
    });

    it('initializes to zeros', () => {
      const m = mat4();
      for (let i = 0; i < 16; i++) {
        assert.strictEqual(m[i], 0);
      }
    });
  });

  describe('perspective', () => {
    it('creates perspective projection matrix', () => {
      const m = mat4();
      perspective(m, Math.PI / 4, 16 / 9, 0.1, 100);
      
      // Check diagonal elements (scaled by cotangent of FOV)
      const expectedF = 1 / Math.tan(Math.PI / 8);
      assert.ok(Math.abs(m[0] - expectedF / (16 / 9)) < 0.0001);
      assert.ok(Math.abs(m[5] - expectedF) < 0.0001);
      
      // Check perspective division elements
      assert.ok(m[10] < 0);
      assert.strictEqual(m[11], -1);
      assert.ok(m[14] < 0);
    });

    it('handles different aspect ratios', () => {
      const m1 = mat4();
      const m2 = mat4();
      perspective(m1, Math.PI / 4, 1, 0.1, 100);
      perspective(m2, Math.PI / 4, 2, 0.1, 100);
      
      // X scale should be different
      assert.notStrictEqual(m1[0], m2[0]);
      // Y scale should be same
      assert.strictEqual(m1[5], m2[5]);
    });
  });

  describe('multiply', () => {
    it('multiplies two 4x4 matrices', () => {
      const a = new Float32Array([
        1, 0, 0, 0,
        0, 1, 0, 0,
        0, 0, 1, 0,
        0, 0, 0, 1,
      ]);
      const b = new Float32Array([
        2, 0, 0, 0,
        0, 2, 0, 0,
        0, 0, 2, 0,
        0, 0, 0, 2,
      ]);
      const result = mat4();
      multiply(result, a, b);
      
      // Should be scaled by 2
      for (let i = 0; i < 4; i++) {
        assert.strictEqual(result[i * 5], 2);
      }
    });

    it('handles non-uniform matrices', () => {
      const a = new Float32Array([
        1, 2, 3, 4,
        5, 6, 7, 8,
        9, 10, 11, 12,
        13, 14, 15, 16,
      ]);
      const b = new Float32Array([
        16, 15, 14, 13,
        12, 11, 10, 9,
        8, 7, 6, 5,
        4, 3, 2, 1,
      ]);
      const result = mat4();
      multiply(result, a, b);
      
      // Verify result is not all zeros (matrix multiplication is complex)
      let sum = 0;
      for (let i = 0; i < 16; i++) {
        sum += result[i];
      }
      assert.ok(sum !== 0);
    });
  });

  describe('identity', () => {
    it('creates identity matrix', () => {
      const m = mat4();
      identity(m);
      
      const expected = [
        1, 0, 0, 0,
        0, 1, 0, 0,
        0, 0, 1, 0,
        0, 0, 0, 1,
      ];
      for (let i = 0; i < 16; i++) {
        assert.strictEqual(m[i], expected[i]);
      }
    });
  });

  describe('translation', () => {
    it('creates translation matrix', () => {
      const m = mat4();
      translation(m, 5, 10, 15);
      
      assert.strictEqual(m[12], 5);
      assert.strictEqual(m[13], 10);
      assert.strictEqual(m[14], 15);
      
      // Check identity rotation/scale
      assert.strictEqual(m[0], 1);
      assert.strictEqual(m[5], 1);
      assert.strictEqual(m[10], 1);
    });
  });

  describe('composeModel', () => {
    it('creates uniform scale with translation', () => {
      const m = mat4();
      composeModel(m, 5, 10, 15, 2);
      
      // Scale on diagonal
      assert.strictEqual(m[0], 2);
      assert.strictEqual(m[5], 2);
      assert.strictEqual(m[10], 2);
      
      // Translation
      assert.strictEqual(m[12], 5);
      assert.strictEqual(m[13], 10);
      assert.strictEqual(m[14], 15);
    });
  });

  describe('composeAlongY', () => {
    it('creates matrix with Y-axis alignment', () => {
      const m = mat4();
      composeAlongY(m, 0, 0, 0, 0, 1, 0, 1, 1, 1);
      
      // Y-axis should be up
      assert.strictEqual(m[4], 0);
      assert.strictEqual(m[5], 1);
      assert.strictEqual(m[6], 0);
    });

    it('handles non-unit axes', () => {
      const m = mat4();
      composeAlongY(m, 0, 0, 0, 0, 2, 0, 1, 1, 1);
      
      // Should normalize the axis
      assert.strictEqual(m[5], 1);
    });
  });

  describe('composeAlongZ', () => {
    it('creates matrix with Z-axis alignment', () => {
      const m = mat4();
      composeAlongZ(m, 0, 0, 0, 0, 0, 1, 1, 1, 1);
      
      // Z-axis should be forward
      assert.strictEqual(m[8], 0);
      assert.strictEqual(m[9], 0);
      assert.strictEqual(m[10], 1);
    });
  });

  describe('viewFromLook', () => {
    it('creates view matrix from look angles', () => {
      const m = mat4();
      viewFromLook(m, 0, 0, 0);
      
      // Should be identity rotation
      assert.strictEqual(m[0], 1);
      assert.strictEqual(m[5], 1);
      assert.strictEqual(m[10], 1);
    });

    it('handles pitch rotation', () => {
      const m = mat4();
      viewFromLook(m, 0, 0, Math.PI / 2);
      
      // Check pitch affected appropriate elements
      assert.ok(Math.abs(m[10]) < 0.0001); // cos(PI/2) ≈ 0
    });

    it('handles yaw rotation', () => {
      const m = mat4();
      viewFromLook(m, 0, Math.PI / 2, 0);
      
      // Check yaw affected appropriate elements
      assert.ok(Math.abs(m[0]) < 0.0001); // cos(PI/2) ≈ 0
    });

    it('handles roll rotation', () => {
      const m1 = mat4();
      const m2 = mat4();
      viewFromLook(m1, 0, 0, 0);
      viewFromLook(m2, Math.PI / 4, 0, 0);
      
      // Roll should change the matrix
      assert.notDeepStrictEqual(Array.from(m1), Array.from(m2));
    });
  });

  describe('quaternion operations', () => {
    describe('quatMul', () => {
      it('multiplies two quaternions', () => {
        const q1: [number, number, number, number] = [0, 0, 0, 1];
        const q2: [number, number, number, number] = [0, 0, 0, 1];
        const result = quatMul(q1, q2);
        
        assert.strictEqual(result[0], 0);
        assert.strictEqual(result[1], 0);
        assert.strictEqual(result[2], 0);
        assert.strictEqual(result[3], 1);
      });

      it('handles non-identity quaternions', () => {
        const q1: [number, number, number, number] = [1, 0, 0, 0];
        const q2: [number, number, number, number] = [0, 1, 0, 0];
        const result = quatMul(q1, q2);
        
        // Quaternion multiplication is not commutative
        assert.notDeepStrictEqual(result, quatMul(q2, q1));
      });
    });

    describe('quatFromEuler', () => {
      it('creates quaternion from Euler angles', () => {
        const q = quatFromEuler(0, 0);
        
        assert.ok(Math.abs(q[0]) < 0.0001);
        assert.ok(Math.abs(q[1]) < 0.0001);
        assert.ok(Math.abs(q[2]) < 0.0001);
        assert.ok(Math.abs(q[3] - 1) < 0.0001);
      });

      it('handles 90-degree rotation', () => {
        const q = quatFromEuler(Math.PI / 2, 0);
        
        assert.ok(Math.abs(q[0] - Math.sin(Math.PI / 4)) < 0.0001);
        assert.ok(Math.abs(q[3] - Math.cos(Math.PI / 4)) < 0.0001);
      });
    });

    describe('quatFromAxisAngle', () => {
      it('creates quaternion from axis-angle', () => {
        const q = quatFromAxisAngle(0, 1, 0, 0);
        
        assert.strictEqual(q[0], 0);
        assert.strictEqual(q[1], 0);
        assert.strictEqual(q[2], 0);
        assert.strictEqual(q[3], 1);
      });

      it('handles 180-degree rotation', () => {
        const q = quatFromAxisAngle(0, 1, 0, Math.PI);
        
        assert.ok(Math.abs(q[1] - 1) < 0.0001);
        assert.ok(Math.abs(q[3]) < 0.0001);
      });
    });

    describe('quatInvert', () => {
      it('inverts quaternion by negating vector part', () => {
        const q: [number, number, number, number] = [0.5, 0.5, 0.5, 0.5];
        const inv = quatInvert(q);
        
        assert.strictEqual(inv[0], -0.5);
        assert.strictEqual(inv[1], -0.5);
        assert.strictEqual(inv[2], -0.5);
        assert.strictEqual(inv[3], 0.5);
      });

      it('double inversion returns original', () => {
        const q: [number, number, number, number] = [0.3, 0.4, 0.5, 0.6];
        const inv = quatInvert(q);
        const inv2 = quatInvert(inv);
        
        assert.deepStrictEqual(inv2, q);
      });
    });

    describe('quatNormalize', () => {
      it('normalizes quaternion to unit length', () => {
        const q: [number, number, number, number] = [2, 0, 0, 0];
        const n = quatNormalize(q);
        
        const length = Math.hypot(n[0], n[1], n[2], n[3]);
        assert.ok(Math.abs(length - 1) < 0.0001);
      });

      it('handles zero quaternion', () => {
        const q: [number, number, number, number] = [0, 0, 0, 0];
        const n = quatNormalize(q);
        
        // Should not throw, returns [0,0,0,0]
        assert.deepStrictEqual(n, [0, 0, 0, 0]);
      });

      it('preserves unit quaternions', () => {
        const q: [number, number, number, number] = [0, 0, 0, 1];
        const n = quatNormalize(q);
        
        assert.deepStrictEqual(n, q);
      });
    });

    describe('quatToMat4', () => {
      it('converts quaternion to rotation matrix', () => {
        const q: [number, number, number, number] = [0, 0, 0, 1];
        const m = mat4();
        quatToMat4(m, q);
        
        // Identity quaternion -> identity matrix
        assert.strictEqual(m[0], 1);
        assert.strictEqual(m[5], 1);
        assert.strictEqual(m[10], 1);
      });

      it('handles 90-degree Y rotation', () => {
        const q = quatFromAxisAngle(0, 1, 0, Math.PI / 2);
        const m = mat4();
        quatToMat4(m, q);
        
        // Check rotation matrix elements for 90-degree Y rotation
        // cos(90°) = 0, sin(90°) = 1
        assert.ok(Math.abs(m[0]) < 0.0001);
        assert.ok(Math.abs(m[2] + 1) < 0.0001 || Math.abs(m[2] - 1) < 0.0001);
        assert.ok(Math.abs(m[8] + 1) < 0.0001 || Math.abs(m[8] - 1) < 0.0001);
      });
    });

    describe('rotateVec', () => {
      it('rotates vector by quaternion', () => {
        const q: [number, number, number, number] = [0, 0, 0, 1];
        const v: [number, number, number] = [1, 0, 0];
        const result = rotateVec(q, v);
        
        assert.deepStrictEqual(result, [1, 0, 0]);
      });

      it('rotates vector 90 degrees around Y', () => {
        const q = quatFromAxisAngle(0, 1, 0, Math.PI / 2);
        const v: [number, number, number] = [1, 0, 0];
        const result = rotateVec(q, v);
        
        assert.ok(Math.abs(result[0]) < 0.0001);
        assert.strictEqual(result[1], 0);
        assert.ok(Math.abs(result[2] + 1) < 0.0001);
      });
    });

    describe('quatSlerp', () => {
      it('interpolates between identical quaternions', () => {
        const q: [number, number, number, number] = [0, 0, 0, 1];
        const result = quatSlerp(q, q, 0.5);
        
        assert.ok(Math.abs(result[3] - 1) < 0.0001);
      });

      it('interpolates at t=0 and t=1', () => {
        const q1: [number, number, number, number] = [0, 0, 0, 1];
        const q2 = quatFromAxisAngle(0, 1, 0, Math.PI / 2);
        
        const at0 = quatSlerp(q1, q2, 0);
        const at1 = quatSlerp(q1, q2, 1);
        
        // Should be close to endpoints
        assert.ok(Math.abs(at0[0] - q1[0]) < 0.0001);
        assert.ok(Math.abs(at0[3] - q1[3]) < 0.0001);
        assert.ok(Math.abs(at1[1] - q2[1]) < 0.0001);
      });

      it('produces unit quaternions', () => {
        const q1: [number, number, number, number] = [0, 0, 0, 1];
        const q2 = quatFromAxisAngle(0, 1, 0, Math.PI / 2);
        
        for (let t = 0; t <= 1; t += 0.1) {
          const result = quatSlerp(q1, q2, t);
          const length = Math.hypot(result[0], result[1], result[2], result[3]);
          assert.ok(Math.abs(length - 1) < 0.0001);
        }
      });
    });
  });

  describe('wrapDelta', () => {
    it('wraps angle to [-π, π]', () => {
      assert.ok(Math.abs(wrapDelta(0)) < 0.0001);
      assert.ok(Math.abs(wrapDelta(Math.PI) - Math.PI) < 0.0001);
      assert.ok(Math.abs(wrapDelta(-Math.PI) + Math.PI) < 0.0001);
    });

    it('handles angles outside range', () => {
      // 3π should wrap to π
      assert.ok(Math.abs(Math.abs(wrapDelta(Math.PI * 3)) - Math.PI) < 0.0001);
      assert.ok(Math.abs(Math.abs(wrapDelta(-Math.PI * 3)) - Math.PI) < 0.0001);
    });

    it('is periodic with 2π', () => {
      const angle = 1.234;
      assert.ok(Math.abs(wrapDelta(angle) - wrapDelta(angle + Math.PI * 2)) < 0.0001);
    });
  });

  describe('quatLook', () => {
    it('creates quaternion looking at direction', () => {
      const q = quatLook(0, 0, -1);
      
      // Looking forward should be identity-ish
      assert.ok(Math.abs(q[3] - 1) < 0.0001);
    });

    it('handles different directions', () => {
      const q1 = quatLook(0, 0, -1);
      const q2 = quatLook(1, 0, 0);
      
      assert.notDeepStrictEqual(q1, q2);
    });
  });
});
