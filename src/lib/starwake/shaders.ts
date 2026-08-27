export const STREAK_VS = `precision mediump float;
attribute vec2 aUv;
attribute vec3 aPosition;
attribute vec3 aColor;
attribute float aSize;
uniform mat4 uProj;
uniform mat4 uView;
uniform float uStreak;
uniform vec2 uResolution;
uniform float uDensityScale;
uniform float uBoost;
uniform float uWarp;
varying vec2 vUv;
varying vec3 vColor;
varying float vAlpha;

void main() {
  vUv = aUv;
  vColor = aColor;
  vec4 mv = uView * vec4(aPosition, 1.0);
  float vz = mv.z;
  float depthFade = smoothstep(4.0, -12.0, vz) * smoothstep(-520.0, -24.0, vz);
  float dens = clamp(uDensityScale, 0.25, 1.0);
  vAlpha = depthFade * dens * mix(0.55, 0.9, aSize / 1.7);

  vec3 head = aPosition;
  vec3 tail = aPosition - vec3(0.0, 0.0, uStreak);
  vec4 cH = uProj * uView * vec4(head, 1.0);
  vec4 cT = uProj * uView * vec4(tail, 1.0);
  if (cH.w < 0.08) {
    gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
    vAlpha = 0.0;
    return;
  }
  vec2 ndcH = cH.xy / cH.w;
  vec2 ndcT = cT.xy / max(cT.w, 0.08);
  vec2 dir = ndcH - ndcT;
  float len = length(dir);
  vec2 tanDir = len > 1.0e-5 ? dir / len : vec2(0.0, 1.0);
  vec2 nrm = vec2(-tanDir.y, tanDir.x);
  float aspect = uResolution.x / max(uResolution.y, 1.0);
  vec2 nPix = normalize(vec2(nrm.x * aspect, nrm.y));
  vec2 nNdc = vec2(nPix.x / aspect, nPix.y);
  float ahead = max(-vz, 0.35);
  float px = 1.0 / max(uResolution.y, 1.0);
  float basePx = mix(0.9, 1.8, aSize / 1.7);
  basePx *= mix(1.35, 0.75, clamp(ahead / 180.0, 0.0, 1.0));
  basePx *= mix(1.0, 1.35, uBoost);
  basePx *= mix(1.0, 1.7, clamp(uWarp, 0.0, 1.0));
  float thick = basePx * 2.0 * px;
  if (len < 0.002) {
    tanDir = vec2(0.0, 1.0);
    nrm = vec2(1.0, 0.0);
    nPix = normalize(vec2(nrm.x * aspect, nrm.y));
    nNdc = vec2(nPix.x / aspect, nPix.y);
  }
  vec2 ndc = mix(ndcT, ndcH, aUv.x) + nNdc * (aUv.y - 0.5) * thick * 2.0;
  float w = mix(cT.w, cH.w, aUv.x);
  float zc = mix(cT.z, cH.z, aUv.x);
  gl_Position = vec4(ndc * w, zc, w);
}`;

export const STREAK_FS = `precision mediump float;
varying vec2 vUv;
varying vec3 vColor;
varying float vAlpha;
uniform float uWarp;
void main() {
  float x = vUv.x;
  float y = abs(vUv.y - 0.5) * 2.0;
  float taper = mix(0.18, 1.0, pow(max(x, 0.001), 0.55));
  float d = y / max(taper, 0.12);
  float shaft = exp(-d * d * 9.5) * smoothstep(0.0, 0.08, x);
  float glow  = exp(-d * d * 2.2) * 0.18 * x;
  vec2 hp = vec2((x - 1.0) * 4.0, y * 1.8);
  float head = exp(-dot(hp, hp) * 7.0) * 0.85;
  float a = (shaft * 0.72 + glow + head) * vAlpha;
  if (a < 0.008) discard;
  vec3 tint = mix(vColor, vec3(0.86, 0.92, 1.0), clamp(uWarp, 0.0, 1.0) * 0.45);
  vec3 col = tint * a * mix(1.0, 1.35, clamp(uWarp, 0.0, 1.0));
  float lum = max(col.r, max(col.g, col.b));
  float soft = lum / (1.0 + lum * 0.65);
  col *= (soft / max(lum, 0.0001));
  gl_FragColor = vec4(col, 1.0);
}`;

export const WARP_VS = `attribute vec2 aUv;
varying vec2 vUv;
void main() {
  vUv = aUv * 2.0 - 1.0;
  gl_Position = vec4(vUv, 0.0, 1.0);
}`;

export const WARP_FS = `precision mediump float;
varying vec2 vUv;
uniform float uAmt;
uniform float uTime;
uniform float uCruise;
uniform vec2 uRes;

void main() {
  float amt = clamp(uAmt, 0.0, 1.0);
  if (amt < 0.012) discard;
  float aspect = uRes.x / max(uRes.y, 1.0);
  vec2 p = vec2(vUv.x * aspect, vUv.y);
  float r = length(p);
  float ang = atan(p.y, p.x);
  float z = 1.0 / max(r, 0.045);
  float travel = uTime * mix(3.1, 1.85, uCruise);

  float rings = 0.0;
  for (int i = 0; i < 5; i++) {
    float band = fract(z * 0.22 + travel + float(i) * 0.2);
    float w = 0.018 + float(i) * 0.004;
    rings += smoothstep(w, 0.0, abs(band - 0.52)) * (1.0 - float(i) * 0.12);
  }
  rings *= smoothstep(0.03, 0.14, r) * smoothstep(1.4, 0.48, r);

  float spokes = pow(0.5 + 0.5 * sin(ang * 12.0 + z * 0.55 - travel * 2.2), 18.0);
  spokes *= smoothstep(0.05, 0.2, r) * smoothstep(1.15, 0.55, r);

  float well = exp(-r * r * mix(48.0, 28.0, uCruise));
  float halo = exp(-pow(max(r - mix(0.18, 0.24, uCruise), 0.0), 2.0) * 48.0);

  vec3 cool = vec3(0.76, 0.86, 1.0);
  vec3 warm = vec3(0.97, 0.91, 0.78);
  vec3 tint = mix(cool, warm, uCruise);

  float fog = smoothstep(0.22, 1.2, r) * mix(0.14, 0.1, uCruise);
  float a = (rings * mix(0.78, 0.7, uCruise) + spokes * mix(0.2, 0.16, uCruise) + halo * mix(0.42, 0.34, uCruise)) * amt;
  float wellAmt = well * mix(0.18, 0.08, uCruise) * amt;
  vec3 col = tint * (a + wellAmt) + vec3(0.025, 0.03, 0.045) * fog * amt;

  vec2 split = vec2(0.012 * amt, 0.0);
  col.r += exp(-pow(length(p - split), 2.0) * 28.0) * mix(0.1, 0.04, uCruise) * amt;
  col.b += exp(-pow(length(p + split), 2.0) * 28.0) * 0.08 * amt * (1.0 - uCruise * 0.7);

  float lum = max(col.r, max(col.g, col.b));
  float soft = lum / (1.0 + lum * 0.75);
  col *= (soft / max(lum, 0.0001));
  gl_FragColor = vec4(col, 1.0);
}`;

export const STAR_VS = `attribute vec3 aPosition;
attribute vec3 aColor;
attribute float aSize;
uniform mat4 uProj;
uniform mat4 uView;
uniform float uPixelRatio;
varying vec3 vColor;
varying float vAlpha;
void main() {
  vColor = aColor;
  vec4 mv = uView * vec4(aPosition, 1.0);
  float depth = max(-mv.z, 0.25);
  vAlpha = smoothstep(0.35, 6.0, depth) * smoothstep(480.0, 28.0, depth);
  float mag = mix(1.4, 2.6, clamp(aSize / 1.7, 0.0, 1.0));
  gl_PointSize = clamp(mag * uPixelRatio * (160.0 / depth), 1.4, 6.5);
  gl_Position = uProj * mv;
}`;

export const STAR_FS = `precision mediump float;
varying vec3 vColor;
varying float vAlpha;
void main() {
  vec2 p = gl_PointCoord * 2.0 - 1.0;
  float d = dot(p, p);
  if (d > 1.0) discard;
  float core = exp(-d * 9.0);
  float halo = exp(-d * 2.4) * 0.42;
  float a = (core + halo) * vAlpha;
  if (a < 0.02) discard;
  gl_FragColor = vec4(vColor * a * 1.55, 1.0);
}`;

export const DUST_VS = `attribute vec3 aPosition;
attribute float aSize;
attribute vec3 aColor;
uniform mat4 uProj;
uniform mat4 uView;
uniform float uPixelRatio;
varying vec3 vColor;
varying float vAlpha;
void main() {
  vColor = aColor;
  vec4 mv = uView * vec4(aPosition, 1.0);
  float depth = max(-mv.z, 0.3);
  vAlpha = smoothstep(0.6, 8.0, depth) * smoothstep(380.0, 40.0, depth) * 0.35;
  gl_PointSize = clamp(aSize * uPixelRatio * (90.0 / depth), 0.5, 3.5);
  gl_Position = uProj * mv;
}`;

export const DUST_FS = `precision mediump float;
varying vec3 vColor;
varying float vAlpha;
void main() {
  vec2 p = gl_PointCoord * 2.0 - 1.0;
  float d = dot(p, p);
  if (d > 1.0) discard;
  float a = exp(-d * 4.0) * vAlpha;
  gl_FragColor = vec4(vColor * a, 1.0);
}`;

export const NEBULA_VS = `attribute vec3 aPosition;
varying vec3 vPos;
uniform mat4 uProj;
uniform mat4 uView;
void main() {
  vPos = aPosition;
  gl_Position = uProj * uView * vec4(aPosition, 1.0);
}`;

export const NEBULA_FS = `precision mediump float;
varying vec3 vPos;
uniform vec3 uTint;
uniform float uKind;
uniform float uSeed;
uniform float uIntensity;

float hash13(vec3 p) {
  p = fract(p * 0.1031 + uSeed);
  p += dot(p, p.yzx + 33.33);
  return fract((p.x + p.y) * p.z);
}
float vnoise(vec3 p) {
  vec3 i = floor(p);
  vec3 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float n000 = hash13(i);
  float n100 = hash13(i + vec3(1.0, 0.0, 0.0));
  float n010 = hash13(i + vec3(0.0, 1.0, 0.0));
  float n110 = hash13(i + vec3(1.0, 1.0, 0.0));
  float n001 = hash13(i + vec3(0.0, 0.0, 1.0));
  float n101 = hash13(i + vec3(1.0, 0.0, 1.0));
  float n011 = hash13(i + vec3(0.0, 1.0, 1.0));
  float n111 = hash13(i + vec3(1.0, 1.0, 1.0));
  float nx00 = mix(n000, n100, f.x);
  float nx10 = mix(n010, n110, f.x);
  float nx01 = mix(n001, n101, f.x);
  float nx11 = mix(n011, n111, f.x);
  return mix(mix(nx00, nx10, f.y), mix(nx01, nx11, f.y), f.z);
}
float fbm(vec3 p) {
  float s = 0.0;
  float a = 0.5;
  s += a * vnoise(p); p *= 2.09; a *= 0.5;
  s += a * vnoise(p); p *= 2.13; a *= 0.5;
  s += a * vnoise(p); p *= 2.05; a *= 0.5;
  s += a * vnoise(p); p *= 2.17; a *= 0.5;
  s += a * vnoise(p); p *= 2.03; a *= 0.5;
  s += a * vnoise(p);
  return s;
}

void main() {
  vec3 n = normalize(vPos);
  float lat = n.y;
  float lon = atan(n.z, n.x);
  vec3 p = n * 3.35 + vec3(uSeed * 6.1, uSeed * 2.4, -uSeed * 4.7);
  float w1 = fbm(p);
  float w2 = fbm(p + vec3(5.2, 1.3, 9.1));
  vec3 w = p + vec3(w1, w2, w1 - w2) * 0.58;
  float dust = fbm(w);
  float fine = fbm(w * 3.5 + 8.0);
  float micro = fbm(w * 8.4 + 14.0);
  float kind = uKind;
  float lane = exp(-pow(lat + 0.08 * sin(lon * 2.1 + dust * 4.4) + 0.05 * (fine - 0.5), 2.0) * 13.0);
  vec3 voidCol = vec3(0.01, 0.012, 0.028);
  vec3 col = voidCol;
  float glow = 0.0;

  if (kind < 0.5) {
    float arm = pow(clamp(dust * 1.12, 0.0, 1.0), 1.45);
    float rift = smoothstep(0.38, 0.74, arm + fine * 0.16);
    vec3 indigo = vec3(0.11, 0.07, 0.30) * uTint;
    vec3 magenta = vec3(0.40, 0.08, 0.16) * uTint;
    vec3 teal = vec3(0.04, 0.17, 0.26) * uTint;
    vec3 gold = vec3(0.36, 0.24, 0.10) * uTint;
    col = mix(col, indigo, lane * 0.95);
    col = mix(col, magenta, lane * rift * arm * 0.88);
    col = mix(col, teal, lane * (1.0 - rift) * arm * 0.72);
    col += gold * pow(arm, 3.0) * lane * 0.5;
    glow = lane * arm;
  } else if (kind < 1.5) {
    float bulge = exp(-pow(lat, 2.0) * 7.0) * (0.55 + dust * 0.55);
    vec3 amber = vec3(0.42, 0.22, 0.08) * uTint;
    vec3 rust = vec3(0.28, 0.08, 0.04);
    vec3 gold = vec3(0.55, 0.38, 0.14);
    col = mix(col, rust, bulge * 0.85);
    col = mix(col, amber, bulge * dust * 0.9);
    col += gold * pow(bulge * dust, 2.4) * 0.65;
    col += vec3(0.18, 0.08, 0.03) * exp(-pow(lat, 2.0) * 3.2) * 0.25;
    glow = bulge;
  } else if (kind < 2.5) {
    float dark = smoothstep(0.40, 0.78, dust + fine * 0.12);
    float edge = smoothstep(0.22, 0.55, dust) * (1.0 - dark);
    vec3 brown = vec3(0.10, 0.05, 0.03);
    vec3 ember = vec3(0.28, 0.09, 0.05) * uTint;
    col = mix(voidCol, brown, lane * 0.7);
    col = mix(col, vec3(0.015, 0.012, 0.02), dark * lane);
    col += ember * edge * lane * 0.55;
    glow = edge * lane;
  } else if (kind < 3.5) {
    float knot = pow(clamp(dust * 1.2, 0.0, 1.0), 1.35);
    float rim = pow(clamp(fine, 0.0, 1.0), 2.2);
    vec3 halpha = vec3(0.78, 0.14, 0.28);
    vec3 oiii = vec3(0.06, 0.42, 0.36);
    vec3 core = vec3(0.95, 0.48, 0.62);
    col = mix(col, halpha * uTint, lane * knot * 0.95);
    col = mix(col, oiii, lane * (1.0 - knot) * rim * 0.7);
    col += core * pow(knot, 3.4) * lane * 0.45;
    col += vec3(0.4, 0.08, 0.14) * micro * lane * 0.2;
    glow = lane * knot;
  } else if (kind < 4.5) {
    float scatter = pow(clamp(dust * 1.05, 0.0, 1.0), 1.2);
    vec3 blue = vec3(0.18, 0.32, 0.62) * uTint;
    vec3 ice = vec3(0.42, 0.58, 0.82);
    col = mix(col, blue, lane * scatter * 0.85);
    col += ice * pow(scatter, 2.6) * lane * 0.4;
    col += vec3(0.55, 0.62, 0.78) * pow(max(0.0, micro - 0.55), 2.0) * lane * 0.25;
    glow = lane * scatter;
  } else if (kind < 5.5) {
    float ridge = pow(1.0 - abs(sin(w.x * 11.0 + w.z * 8.5 + dust * 7.0)), 9.0);
    float veil = pow(1.0 - abs(sin(w.y * 9.0 + w.x * 6.0 + fine * 5.0)), 8.0);
    float fil = max(ridge, veil * 0.85) * (0.45 + fine * 0.55);
    vec3 orange = vec3(0.62, 0.28, 0.10);
    vec3 shock = vec3(0.18, 0.42, 0.72) * uTint;
    col += orange * fil * 0.85;
    col += shock * veil * 0.55;
    col += vec3(0.9, 0.7, 0.5) * pow(fil, 2.5) * 0.35;
    glow = fil;
  } else if (kind < 6.5) {
    float rad = length(n.xz);
    float shell = exp(-pow(rad - 0.52 - dust * 0.1, 2.0) * 28.0);
    float inner = exp(-pow(rad - 0.28, 2.0) * 18.0) * (0.4 + fine * 0.4);
    vec3 rim = vec3(0.72, 0.16, 0.18);
    vec3 wind = vec3(0.10, 0.28, 0.55) * uTint;
    col += wind * inner * 0.8;
    col += rim * shell * (0.7 + micro * 0.4);
    col += vec3(0.95, 0.55, 0.4) * pow(shell, 2.0) * 0.35;
    glow = max(shell, inner);
  } else {
    float cir = pow(clamp(dust * 0.95 + (1.0 - lane) * 0.2, 0.0, 1.0), 1.6);
    float wis = smoothstep(0.48, 0.82, fine + abs(lat) * 0.25);
    vec3 silver = vec3(0.22, 0.20, 0.28) * uTint;
    col = mix(col, silver, cir * wis * 0.55);
    col += vec3(0.32, 0.28, 0.36) * pow(cir * wis, 2.2) * 0.25;
    glow = cir * wis * 0.45;
  }

  float spark = pow(max(0.0, vnoise(n * 92.0 + uSeed) - 0.84) / 0.16, 6.0) * (0.35 + glow);
  col += vec3(0.6, 0.56, 0.68) * spark * 0.5;
  col += voidCol * (1.0 - smoothstep(0.0, 0.45, glow)) * 0.15;
  col *= mix(0.78, 1.22, glow);
  col *= uIntensity;
  gl_FragColor = vec4(col, 1.0);
}`;

export const BODY_VS = `attribute vec3 aPosition;
attribute vec3 aNormal;
uniform mat4 uProj;
uniform mat4 uView;
uniform mat4 uModel;
varying vec3 vN;
varying vec3 vW;
varying vec3 vObj;
void main() {
  vec4 w = uModel * vec4(aPosition, 1.0);
  vW = w.xyz;
  vN = mat3(uModel) * aNormal;
  vObj = aPosition;
  gl_Position = uProj * uView * w;
}`;

export const BODY_FS = `precision mediump float;
varying vec3 vN;
varying vec3 vW;
varying vec3 vObj;
uniform vec3 uColor;
uniform vec3 uSunPos;
uniform vec3 uCamPos;
uniform float uEmissive;
uniform float uKind;
uniform float uSeed;

// ============================================================================
// ENHANCED PROCEDURAL TEXTURE FUNCTIONS
// ============================================================================

float hash11(float p) {
  p = fract(p * 0.1031);
  p *= p + 33.33;
  p *= p + p;
  return fract(p);
}

float hash12(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

float hash13(vec3 p3) {
  p3 = fract(p3 * 0.1031);
  p3 += dot(p3, p3.zyx + 31.32);
  return fract((p3.x + p3.y) * p3.z);
}

float vnoise(vec3 p) {
  vec3 i = floor(p);
  vec3 f = fract(p);
  f = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
  float n000 = hash13(i);
  float n100 = hash13(i + vec3(1.0, 0.0, 0.0));
  float n010 = hash13(i + vec3(0.0, 1.0, 0.0));
  float n110 = hash13(i + vec3(1.0, 1.0, 0.0));
  float n001 = hash13(i + vec3(0.0, 0.0, 1.0));
  float n101 = hash13(i + vec3(1.0, 0.0, 1.0));
  float n011 = hash13(i + vec3(0.0, 1.0, 1.0));
  float n111 = hash13(i + vec3(1.0, 1.0, 1.0));
  float nx00 = mix(n000, n100, f.x);
  float nx10 = mix(n010, n110, f.x);
  float nx01 = mix(n001, n101, f.x);
  float nx11 = mix(n011, n111, f.x);
  float nxy0 = mix(nx00, nx10, f.y);
  float nxy1 = mix(nx01, nx11, f.y);
  return mix(nxy0, nxy1, f.z);
}

float fbm(vec3 p) {
  float s = 0.0;
  float a = 0.5;
  s += a * vnoise(p); p *= 2.05; a *= 0.5;
  s += a * vnoise(p); p *= 2.03; a *= 0.5;
  s += a * vnoise(p); p *= 2.07; a *= 0.5;
  s += a * vnoise(p); p *= 2.01; a *= 0.5;
  s += a * vnoise(p);
  return s;
}

float ridgedFbm(vec3 p) {
  float value = 0.0;
  float amplitude = 1.0;
  float frequency = 1.0;
  for (int i = 0; i < 4; i++) {
    float n = vnoise(p * frequency);
    n = 1.0 - abs(n);
    n = n * n;
    value += amplitude * n;
    amplitude *= 0.5;
    frequency *= 2.0;
  }
  return value;
}

vec3 warpDomain(vec3 p, float strength, float scale) {
  vec3 warp = vec3(
    vnoise(p * scale),
    vnoise(p * scale + vec3(5.2, 1.3, 9.1)),
    vnoise(p * scale + vec3(1.8, 7.4, 3.2))
  );
  return p + warp * strength;
}

vec3 warpDomainAdvanced(vec3 p, float strength1, float strength2, float scale1, float scale2) {
  vec3 warp1 = vec3(
    vnoise(p * scale1),
    vnoise(p * scale1 + vec3(5.2, 1.3, 9.1)),
    vnoise(p * scale1 + vec3(1.8, 7.4, 3.2))
  );
  p = p + warp1 * strength1;
  vec3 warp2 = vec3(
    vnoise(p * scale2 + vec3(8.3, 2.1, 4.7)),
    vnoise(p * scale2 + vec3(3.9, 6.5, 1.2)),
    vnoise(p * scale2 + vec3(7.4, 9.8, 5.6))
  );
  return p + warp2 * strength2;
}

float crater(vec2 uv, vec2 center, float radius, float depth) {
  float d = length(uv - center);
  float craterShape = smoothstep(radius, radius * 0.7, d);
  float rim = smoothstep(radius * 1.1, radius, d) * smoothstep(radius * 0.9, radius * 1.1, d);
  float bowl = smoothstep(radius * 0.6, 0.0, d);
  return craterShape * depth + rim * 0.3 + bowl * 0.5;
}

float craterNoise(vec3 p, float density, float seed) {
  vec2 uv = vec2(atan(p.z, p.x), asin(p.y));
  float craters = 0.0;
  vec2 grid = floor(uv * density);
  for (float x = -1.0; x <= 1.0; x++) {
    for (float y = -1.0; y <= 1.0; y++) {
      vec2 cell = grid + vec2(x, y);
      float h = hash12(cell * seed);
      if (h > 0.7) {
        vec2 pos = cell / density + (hash12(cell * (seed + 1.0)) - 0.5) * 0.8 / density;
        float r = (hash12(cell * (seed + 2.0)) * 0.5 + 0.5) * 0.8 / density;
        float d = hash12(cell * (seed + 3.0));
        craters += crater(uv, pos, r, d);
      }
    }
  }
  return craters;
}

float stormVortex(vec3 p, vec2 stormPos, float size, float seed) {
  vec2 uv = vec2(atan(p.z, p.x), asin(p.y));
  vec2 d = uv - stormPos;
  float dist = length(d);
  if (dist > size * 2.0) return 0.0;
  float angle = atan(d.y, d.x);
  float swirl = sin(angle * 8.0 + dist * 4.0 - seed * 10.0);
  float vortex = exp(-dist * dist * 4.0 / (size * size));
  return vortex * (0.5 + 0.5 * swirl);
}

float gasBands(vec3 p, float latitude, float seed) {
  float bands = sin(latitude * 18.0 + seed * 6.283);
  bands += sin(latitude * 9.0 + seed * 3.14) * 0.5;
  bands += sin(latitude * 36.0 + seed * 9.42) * 0.25;
  return bands * 0.5 + 0.5;
}

float granulation(vec3 p, float scale, float seed) {
  float g1 = vnoise(p * scale + seed * 10.0);
  float g2 = vnoise(p * scale * 0.5 + vec3(5.2, 1.3, 9.1) + seed * 5.0);
  float g3 = vnoise(p * scale * 2.0 + vec3(1.8, 7.4, 3.2) + seed * 15.0);
  return g1 * 0.6 + g2 * 0.3 + g3 * 0.1;
}

float sunspot(vec3 p, vec2 spotPos, float size, float seed) {
  vec2 uv = vec2(atan(p.z, p.x), asin(p.y));
  vec2 d = uv - spotPos;
  float dist = length(d);
  if (dist > size) return 0.0;
  float umbra = smoothstep(size * 0.4, 0.0, dist);
  float penumbra = smoothstep(size, size * 0.3, dist);
  float angle = atan(d.y, d.x);
  float striations = sin(angle * 12.0 + dist * 8.0) * 0.1 + 0.5;
  return umbra * 0.7 + penumbra * striations * 0.3;
}

float freshCrater(vec2 uv, vec2 center, float radius) {
  float d = length(uv - center);
  float rim = smoothstep(radius * 1.15, radius * 0.85, d);
  float bowl = smoothstep(radius * 0.7, 0.0, d);
  float rays = 0.0;
  for (float i = 0.0; i < 8.0; i++) {
    float angle = i * 0.785 + 0.1;
    vec2 rayDir = vec2(cos(angle), sin(angle));
    float rayDist = dot(uv - center, rayDir);
    float rayWidth = 0.03 + hash11(i) * 0.02;
    float crossProd = (uv.x - center.x) * rayDir.y - (uv.y - center.y) * rayDir.x;
    rays += smoothstep(rayWidth, 0.0, abs(crossProd)) 
            * smoothstep(radius * 3.0, 0.0, rayDist)
            * (hash11(i + 2.0) * 0.5 + 0.5);
  }
  return rim * 0.8 + bowl * 0.4 + rays * 0.3;
}

float erodedCrater(vec2 uv, vec2 center, float radius) {
  float d = length(uv - center);
  float rim = smoothstep(radius * 1.2, radius * 0.7, d) * 0.4;
  float bowl = smoothstep(radius * 0.8, 0.0, d) * 0.2;
  return rim + bowl;
}

vec3 moonSurface(vec3 p, vec3 baseColor, float seed, float craterDensity) {
  vec2 uv = vec2(atan(p.z, p.x), asin(p.y));
  float terrain = fbm(p * 3.0);
  vec3 highland = mix(baseColor, vec3(0.72, 0.68, 0.62), 0.35);
  vec3 lowland = baseColor * 0.75;
  vec3 color = mix(lowland, highland, terrain);
  float youngRegion = smoothstep(0.3, 0.7, vnoise(p * 2.0 + seed * 5.0));
  float density = mix(craterDensity * 0.5, craterDensity * 1.5, youngRegion);
  float craters = 0.0;
  vec2 grid = floor(uv * density);
  for (float x = -1.0; x <= 1.0; x++) {
    for (float y = -1.0; y <= 1.0; y++) {
      vec2 cell = grid + vec2(x, y);
      float h = hash12(cell * seed);
      if (h > 0.6) {
        vec2 pos = cell / density + (hash12(cell * (seed + 1.0)) - 0.5) * 0.8 / density;
        float r = (hash12(cell * (seed + 2.0)) * 0.6 + 0.4) * 0.8 / density;
        float age = hash12(cell * (seed + 3.0));
        float rayStrength = hash11(seed + 5.0);
        if (age > 0.7 && rayStrength > 0.5) {
          craters += freshCrater(uv, pos, r);
        } else {
          craters += erodedCrater(uv, pos, r);
        }
      }
    }
  }
  color *= 1.0 - craters * 0.35;
  float maria = smoothstep(0.68, 0.85, vnoise(p * 4.0 + seed * 8.0));
  color = mix(color, baseColor * 0.55, maria * 0.5);
  return color;
}

void main() {
  vec3 n = normalize(vN);
  vec3 o = normalize(vObj);
  vec3 L = normalize(uSunPos - vW);
  float ndl = max(0.0, dot(n, L));
  vec3 V = normalize(uCamPos - vW);
  float rim = pow(1.0 - max(0.0, dot(n, V)), 2.4);
  
  vec3 col = uColor;
  float kind = uKind;
  vec3 p = o * 4.0 + uSeed * 12.0;
  
  // Enhanced texture generation based on planet kind
  if (kind < 0.5) {
    // Star (kind 0) - Enhanced with granulation and sunspots
    float gran = granulation(o, 12.0, uSeed);
    col = uColor * (0.92 + gran * 0.12);
    
    // Sunspots
    float spot1 = sunspot(o, vec2(0.3, 0.15), 0.2, uSeed);
    float spot2 = sunspot(o, vec2(-0.8, -0.2), 0.15, uSeed + 3.0);
    float spots = max(spot1, spot2);
    col = mix(col, uColor * 0.6, spots * 0.7);
    
    // Limb darkening
    float r = length(o.xz);
    float limbFactor = pow(r, 2.0);
    col *= mix(1.0, 0.6, 0.5 * limbFactor);
    
    vec3 sunLit = col * (0.55 + ndl * 0.5);
    sunLit += col * (1.8 + uEmissive);
    sunLit += vec3(1.0, 0.96, 0.88) * rim * 0.35;
    gl_FragColor = vec4(sunLit, 1.0);
    return;
    
  } else if (kind < 1.5) {
    // Rocky world (kind 1) - Enhanced with craters and maria
    float terrain = fbm(p * 4.0);
    vec3 lowland = uColor * 0.7;
    vec3 highland = mix(uColor, vec3(0.62, 0.58, 0.5), 0.45);
    col = mix(lowland, highland, smoothstep(0.38, 0.62, terrain));
    
    float craters = craterNoise(p, 8.0, uSeed);
    col *= 1.0 - craters * 0.28;
    
    float maria = smoothstep(0.72, 0.88, vnoise(p * 6.0 + uSeed * 5.0));
    col = mix(col, uColor * 0.6, maria * 0.4);
    
  } else if (kind < 2.5) {
    // Desert world (kind 2) - Enhanced with dunes and canyons
    float dune1 = sin(o.z * 28.0 + fbm(p * 2.0) * 8.0);
    float dune2 = sin(o.x * 14.0 + fbm(p * 4.0) * 4.0);
    float dune = 0.5 + 0.5 * ((dune1 + dune2 * 0.5) / 1.5);
    dune += fbm(p * 6.0) * 0.3;
    dune = clamp(dune, 0.0, 1.0);
    
    vec3 sand = mix(uColor, vec3(0.82, 0.55, 0.28), 0.35);
    vec3 bedrock = uColor * 0.55;
    col = mix(bedrock, sand, dune);
    
    float canyon = ridgedFbm(p * 8.0);
    col = mix(col, uColor * 0.4, canyon * 0.5);
    
    col *= 0.85 + fbm(p * 1.6) * 0.3;
    
  } else if (kind < 3.5) {
    // Ocean world (kind 3) - Enhanced with continents and clouds
    float land = fbm(p * 3.0);
    float coast = smoothstep(0.46, 0.54, land);
    
    vec3 deepOcean = vec3(0.02, 0.12, 0.28);
    vec3 shallowSea = mix(deepOcean, uColor, 0.45);
    vec3 water = mix(deepOcean, shallowSea, 0.7 + 0.3 * fbm(p * 6.0));
    
    vec3 shore = vec3(0.18, 0.28, 0.22);
    vec3 landColor = mix(uColor, vec3(0.22, 0.38, 0.18), 0.4);
    vec3 highLand = mix(landColor, vec3(0.35, 0.32, 0.28), smoothstep(0.6, 0.8, land));
    vec3 landFinal = mix(shore, highLand, smoothstep(0.52, 0.7, land));
    
    col = mix(water, landFinal, coast);
    
    float cloud = smoothstep(0.55, 0.78, fbm(p * 5.0 + vec3(2.1, 0.0, 1.4)));
    col = mix(col, vec3(0.92, 0.94, 0.97), cloud * 0.45 * (0.4 + ndl));
    
  } else if (kind < 4.5) {
    // Ice world (kind 4) - Enhanced with fractures and polar caps
    float ice = fbm(p * 4.0);
    vec3 snow = mix(vec3(0.86, 0.92, 0.96), uColor, 0.25);
    vec3 exposedIce = mix(uColor, vec3(0.35, 0.42, 0.48), 0.5);
    col = mix(exposedIce, snow, smoothstep(0.32, 0.58, ice));
    
    vec3 warped = warpDomain(p, 0.2, 4.0);
    float crack = smoothstep(0.72, 0.88, vnoise(warped * 22.0));
    col = mix(col, vec3(0.2, 0.35, 0.48), crack * 0.35);
    
    float latitude = abs(o.y);
    float polarCap = smoothstep(0.7, 0.9, latitude);
    col = mix(col, snow, polarCap * 0.6);
    
  } else if (kind < 5.5) {
    // Volcanic world (kind 5) - Enhanced with lava flows
    float crust = fbm(p * 4.0);
    vec3 basalt = uColor * 0.55;
    vec3 ash = vec3(0.28, 0.22, 0.18);
    col = mix(basalt, ash, smoothstep(0.4, 0.7, crust));
    
    float heat = fbm(p * 2.0 + uSeed * 3.0);
    float ventDensity = pow(max(0.0, 0.55 - heat), 2.2);
    
    float flowNoise = vnoise(p * 8.0 + vec3(uSeed * 10.0, 0.0, uSeed * 5.0));
    float flows = smoothstep(0.65, 0.85, flowNoise) * ventDensity;
    
    col += vec3(1.0, 0.32, 0.06) * flows * 1.4;
    col += vec3(1.0, 0.7, 0.15) * pow(flows, 2.0) * 0.8;
    
  } else if (kind < 6.5) {
    // Gas giant (kind 6) - Enhanced with storms and bands
    float latitude = o.y;
    float warp = latitude + (fbm(p) - 0.5) * 0.28;
    float bands = 0.5 + 0.5 * sin(warp * 18.0 + uSeed * 6.0);
    bands += 0.25 * sin(warp * 36.0 + uSeed * 12.0);
    
    vec3 darkBand = uColor * 0.45;
    vec3 lightBand = mix(uColor, vec3(1.0, 0.92, 0.78), 0.28);
    col = mix(darkBand, lightBand, bands);
    
    vec3 warped = warpDomainAdvanced(p, 0.3, 0.15, 3.0, 8.0);
    float turbulence = fbm(warped);
    col *= 0.85 + turbulence * 0.35;
    
    float storm1 = stormVortex(p, vec2(0.5, 0.2), 0.15, uSeed);
    float storm2 = stormVortex(p, vec2(-1.2, -0.15), 0.1, uSeed + 2.0);
    float storms = max(storm1, storm2);
    col = mix(col, uColor * 0.35, storms * 0.4);
    
  } else if (kind < 7.5) {
    // Ringed giant (kind 7)
    float latitude = o.y;
    float warp = latitude + (fbm(p) - 0.5) * 0.22;
    float bands = 0.5 + 0.5 * sin(warp * 14.0 + uSeed * 4.0);
    
    vec3 darkBand = uColor * 0.5;
    vec3 lightBand = mix(uColor, vec3(0.95, 0.88, 0.75), 0.3);
    col = mix(darkBand, lightBand, bands);
    
    col *= 0.88 + fbm(p * 1.4) * 0.25;
    
  } else if (kind < 8.5) {
    // Ice giant (kind 8/9)
    float latitude = o.y;
    float warp = latitude + (fbm(p) - 0.5) * 0.22;
    float bands = 0.5 + 0.5 * sin(warp * 14.0 + uSeed * 4.0);
    
    vec3 deepColor = mix(uColor, vec3(0.12, 0.22, 0.4), 0.45);
    vec3 hazeColor = mix(uColor, vec3(0.55, 0.82, 0.78), 0.4);
    col = mix(deepColor, hazeColor, bands);
    
    col *= 0.88 + fbm(p * 1.4) * 0.25;
    
    float polarHood = smoothstep(0.75, 0.95, abs(latitude));
    col = mix(col, vec3(0.7, 0.8, 0.9), polarHood * 0.4);
    
  } else if (kind < 9.5) {
    // Comet (kind 10)
    float noise = fbm(p * 2.0);
    col = uColor * (0.55 + 0.45 * noise);
    
  } else if (kind < 10.5) {
    // Moon - rocky variant (kind 11)
    float craterDensity = 0.6 + 0.4 * hash11(uSeed);
    col = moonSurface(p, uColor, uSeed, craterDensity);
    
  } else if (kind < 11.5) {
    // Moon - icy variant (kind 12)
    col = moonSurface(p, uColor, uSeed + 10.0, 0.8);
    
  } else if (kind < 12.5) {
    // Station - metallic (kind 13)
    float gy = o.y;
    float ang = atan(o.z, o.x);
    float panel = vnoise(floor(o * 12.0 + 1.7));
    float seam = 1.0 - smoothstep(0.02, 0.07, min(min(abs(fract(o.x * 8.0) - 0.5), abs(fract(o.y * 8.0) - 0.5)), abs(fract(o.z * 8.0) - 0.5)));
    float rib = pow(abs(sin(ang * 8.0)), 22.0);
    float winRow = step(0.12, abs(gy)) * step(0.0, sin(gy * 58.0));
    float winCol = step(0.28, sin(ang * 26.0 + uSeed * 6.0));
    float window = winRow * winCol * step(0.48, panel);
    vec3 metal = uColor * (0.40 + panel * 0.42);
    metal *= 1.0 - seam * 0.38 - rib * 0.18;
    vec3 glow = vec3(0.72, 0.88, 1.0);
    col = mix(metal, glow, window);
    vec3 H = normalize(L + V);
    float spec = pow(max(0.0, dot(n, H)), 36.0) * (1.0 - window);
    vec3 litH = col * mix(0.10, 1.08, ndl) + vec3(0.85, 0.9, 1.0) * spec * 0.32;
    litH += glow * window * (0.32 + uEmissive);
    litH += col * rim * 0.16;
    litH += col * uEmissive * 0.35;
    gl_FragColor = vec4(litH, 1.0);
    return;
    
  } else if (kind < 13.5) {
    // Additional station/structure types
    float grid = max(step(0.9, fract(o.x * 16.0)), step(0.9, fract(o.y * 16.0)));
    vec3 cell = mix(vec3(0.04, 0.07, 0.14), vec3(0.10, 0.22, 0.40), vnoise(o * 9.0));
    col = mix(cell * uColor * 1.4, vec3(0.16, 0.18, 0.22), grid);
    vec3 H = normalize(L + V);
    float spec = pow(max(0.0, dot(n, H)), 48.0);
    vec3 litS = col * mix(0.08, 1.15, ndl) + vec3(0.55, 0.72, 1.0) * spec * 0.45;
    litS += col * rim * 0.12;
    gl_FragColor = vec4(litS, 1.0);
    return;
    
  } else if (kind < 14.5) {
    // Generic icy body
    float ice = fbm(p * 1.6);
    vec3 snow = mix(vec3(0.9, 0.94, 0.98), uColor, 0.3);
    vec3 dust = mix(uColor, vec3(0.4, 0.42, 0.38), 0.5);
    col = mix(dust, snow, smoothstep(0.3, 0.62, ice));
    
  } else {
    // Fallback
    col = uColor * (0.55 + 0.45 * vnoise(o * 10.0));
  }
  
  // Lighting calculation
  vec3 lit = col * mix(0.07, 1.0, ndl);
  
  // Add volcanic glow for appropriate kinds
  if (kind > 4.5 && kind < 5.5) {
    float heat = pow(max(0.0, 1.0 - abs(o.x) * 1.8), 2.2) + vnoise(o * 6.0) * 0.25;
    lit += vec3(1.0, 0.32, 0.06) * heat * 0.85;
  }
  
  // Rim lighting
  lit += col * rim * 0.22;
  
  // Emissive glow
  lit += col * uEmissive;
  
  gl_FragColor = vec4(lit, 1.0);
}
`;

export const RING_VS = `attribute vec2 aUnit;
uniform mat4 uProj;
uniform mat4 uView;
uniform vec3 uCenter;
uniform vec3 uAxisX;
uniform vec3 uAxisY;
uniform float uRadius;
void main() {
  vec3 p = uCenter + (aUnit.x * uAxisX + aUnit.y * uAxisY) * uRadius;
  gl_Position = uProj * uView * vec4(p, 1.0);
}`;

export const RING_FS = `precision mediump float;
uniform vec3 uColor;
uniform float uAlpha;
void main() {
  gl_FragColor = vec4(uColor * uAlpha, uAlpha);
}`;

export const LINE_VS = `attribute vec3 aPosition;
uniform mat4 uProj;
uniform mat4 uView;
void main() {
  gl_Position = uProj * uView * vec4(aPosition, 1.0);
}`;

export const LINE_FS = `precision mediump float;
uniform vec3 uColor;
uniform float uAlpha;
void main() {
  gl_FragColor = vec4(uColor * uAlpha, uAlpha);
}`;
