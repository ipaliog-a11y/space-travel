export type Quat = [number, number, number, number];

export function clamp(v: number, a: number, b: number) {
  return Math.max(a, Math.min(b, v));
}

export function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

export function mulberry32(seed: number) {
  let s = seed >>> 0;
  return () => {
    s += 1831565813;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hashu(str: string) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function mat4() {
  return new Float32Array(16);
}

export function perspective(o: Float32Array, fovy: number, aspect: number, near: number, far: number) {
  const f = 1 / Math.tan(fovy / 2);
  const nf = 1 / (near - far);
  o.set([f / aspect, 0, 0, 0, 0, f, 0, 0, 0, 0, (far + near) * nf, -1, 0, 0, 2 * far * near * nf, 0]);
  return o;
}

export function multiply(o: Float32Array, a: Float32Array, b: Float32Array) {
  const a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3];
  const a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7];
  const a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11];
  const a30 = a[12], a31 = a[13], a32 = a[14], a33 = a[15];
  for (let i = 0; i < 4; i++) {
    const b0 = b[i * 4], b1 = b[i * 4 + 1], b2 = b[i * 4 + 2], b3 = b[i * 4 + 3];
    o[i * 4] = a00 * b0 + a10 * b1 + a20 * b2 + a30 * b3;
    o[i * 4 + 1] = a01 * b0 + a11 * b1 + a21 * b2 + a31 * b3;
    o[i * 4 + 2] = a02 * b0 + a12 * b1 + a22 * b2 + a32 * b3;
    o[i * 4 + 3] = a03 * b0 + a13 * b1 + a23 * b2 + a33 * b3;
  }
  return o;
}

export function identity(o: Float32Array) {
  o.set([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
  return o;
}

export function translation(o: Float32Array, x: number, y: number, z: number) {
  o.set([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, x, y, z, 1]);
  return o;
}

export function composeModel(o: Float32Array, x: number, y: number, z: number, s: number) {
  o.set([s, 0, 0, 0, 0, s, 0, 0, 0, 0, s, 0, x, y, z, 1]);
  return o;
}

export function composeAlongY(
  o: Float32Array,
  px: number, py: number, pz: number,
  ax: number, ay: number, az: number,
  sx: number, sy: number, sz: number,
) {
  const al = Math.hypot(ax, ay, az) || 1;
  ax /= al; ay /= al; az /= al;
  let rx: number, ry: number, rz: number;
  if (Math.abs(ay) < 0.94) {
    rx = az; ry = 0; rz = -ax;
  } else {
    rx = 0; ry = az; rz = -ay;
  }
  const rl = Math.hypot(rx, ry, rz) || 1;
  rx /= rl; ry /= rl; rz /= rl;
  const zx = ry * az - rz * ay;
  const zy = rz * ax - rx * az;
  const zz = rx * ay - ry * ax;
  o.set([
    rx * sx, ry * sx, rz * sx, 0,
    ax * sy, ay * sy, az * sy, 0,
    zx * sz, zy * sz, zz * sz, 0,
    px, py, pz, 1,
  ]);
  return o;
}

export function composeAlongZ(
  o: Float32Array,
  px: number, py: number, pz: number,
  ax: number, ay: number, az: number,
  sx: number, sy: number, sz: number,
) {
  const al = Math.hypot(ax, ay, az) || 1;
  ax /= al; ay /= al; az /= al;
  let rx: number, ry: number, rz: number;
  if (Math.abs(ay) < 0.94) {
    rx = az; ry = 0; rz = -ax;
  } else {
    rx = 0; ry = az; rz = -ay;
  }
  const rl = Math.hypot(rx, ry, rz) || 1;
  rx /= rl; ry /= rl; rz /= rl;
  const yx = ay * rz - az * ry;
  const yy = az * rx - ax * rz;
  const yz = ax * ry - ay * rx;
  o.set([
    rx * sx, ry * sx, rz * sx, 0,
    yx * sy, yy * sy, yz * sy, 0,
    ax * sz, ay * sz, az * sz, 0,
    px, py, pz, 1,
  ]);
  return o;
}

export function viewFromLook(o: Float32Array, roll: number, lookY: number, lookP: number) {
  const cy = Math.cos(lookY), sy = Math.sin(lookY);
  const cp = Math.cos(lookP), sp = Math.sin(lookP);
  const cr = Math.cos(roll), sr = Math.sin(roll);
  const m00 = cy, m01 = 0, m02 = sy;
  const m10 = sp * sy, m11 = cp, m12 = -sp * cy;
  const m20 = -cp * sy, m21 = sp, m22 = cp * cy;
  const a00 = cr * m00 - sr * m10;
  const a01 = sr * m00 + cr * m10;
  const a02 = m20;
  const a10 = cr * m01 - sr * m11;
  const a11 = sr * m01 + cr * m11;
  const a12 = m21;
  const a20 = cr * m02 - sr * m12;
  const a21 = sr * m02 + cr * m12;
  const a22 = m22;
  o.set([a00, a01, a02, 0, a10, a11, a12, 0, a20, a21, a22, 0, 0, 0, 0, 1]);
  return o;
}

export function quatMul(a: Quat, b: Quat): Quat {
  return [
    a[3] * b[0] + a[0] * b[3] + a[1] * b[2] - a[2] * b[1],
    a[3] * b[1] - a[0] * b[2] + a[1] * b[3] + a[2] * b[0],
    a[3] * b[2] + a[0] * b[1] - a[1] * b[0] + a[2] * b[3],
    a[3] * b[3] - a[0] * b[0] - a[1] * b[1] - a[2] * b[2],
  ];
}

export function quatFromEuler(pitch: number, yaw: number): Quat {
  const hp = pitch * 0.5, hy = yaw * 0.5;
  const sp = Math.sin(hp), cp = Math.cos(hp);
  const sy = Math.sin(hy), cy = Math.cos(hy);
  return [sp * cy, cp * sy, -sp * sy, cp * cy];
}

export function quatFromAxisAngle(x: number, y: number, z: number, angle: number): Quat {
  const h = angle * 0.5;
  const s = Math.sin(h);
  return [x * s, y * s, z * s, Math.cos(h)];
}

export function quatInvert(q: Quat): Quat {
  return [-q[0], -q[1], -q[2], q[3]];
}

export function quatNormalize(q: Quat): Quat {
  const n = Math.hypot(q[0], q[1], q[2], q[3]) || 1;
  return [q[0] / n, q[1] / n, q[2] / n, q[3] / n];
}

export function quatToMat4(o: Float32Array, q: Quat) {
  const x = q[0], y = q[1], z = q[2], w = q[3];
  const x2 = x + x, y2 = y + y, z2 = z + z;
  const xx = x * x2, xy = x * y2, xz = x * z2;
  const yy = y * y2, yz = y * z2, zz = z * z2;
  const wx = w * x2, wy = w * y2, wz = w * z2;
  o.set([
    1 - (yy + zz), xy + wz, xz - wy, 0,
    xy - wz, 1 - (xx + zz), yz + wx, 0,
    xz + wy, yz - wx, 1 - (xx + yy), 0,
    0, 0, 0, 1,
  ]);
  return o;
}

export function rotateVec(q: Quat, v: [number, number, number]): [number, number, number] {
  const [qx, qy, qz, qw] = q;
  const [vx, vy, vz] = v;
  const ix = qw * vx + qy * vz - qz * vy;
  const iy = qw * vy + qz * vx - qx * vz;
  const iz = qw * vz + qx * vy - qy * vx;
  const iw = -qx * vx - qy * vy - qz * vz;
  return [
    ix * qw + iw * -qx + iy * -qz - iz * -qy,
    iy * qw + iw * -qy + iz * -qx - ix * -qz,
    iz * qw + iw * -qz + ix * -qy - iy * -qx,
  ];
}

export function wrapDelta(a: number) {
  return Math.atan2(Math.sin(a), Math.cos(a));
}

export function quatLook(dx: number, dy: number, dz: number): Quat {
  const yaw = Math.atan2(-dx, -dz);
  const pitch = Math.atan2(-dy, Math.hypot(dx, dz));
  return quatFromEuler(pitch, yaw);
}

export function quatSlerp(a: Quat, b: Quat, t: number): Quat {
  let ax = a[0], ay = a[1], az = a[2], aw = a[3];
  let bx = b[0], by = b[1], bz = b[2], bw = b[3];
  let dot = ax * bx + ay * by + az * bz + aw * bw;
  if (dot < 0) {
    bx = -bx;
    by = -by;
    bz = -bz;
    bw = -bw;
    dot = -dot;
  }
  if (dot > 0.9994) {
    return quatNormalize([
      ax + (bx - ax) * t,
      ay + (by - ay) * t,
      az + (bz - az) * t,
      aw + (bw - aw) * t,
    ]);
  }
  const th = Math.acos(Math.min(1, dot));
  const s = 1 / Math.sin(th);
  const wa = Math.sin((1 - t) * th) * s;
  const wb = Math.sin(t * th) * s;
  return quatNormalize([
    ax * wa + bx * wb,
    ay * wa + by * wb,
    az * wa + bz * wb,
    aw * wa + bw * wb,
  ]);
}
