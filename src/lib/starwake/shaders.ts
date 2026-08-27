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
  s += a * vnoise(p); p *= 2.05; a *= 0.5;
  s += a * vnoise(p); p *= 2.03; a *= 0.5;
  s += a * vnoise(p); p *= 2.07; a *= 0.5;
  s += a * vnoise(p);
  return s;
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

  if (kind < 0.5) {
    float g = fbm(o * 5.5);
    col = uColor * (0.92 + g * 0.12);
    vec3 sunLit = col * (0.55 + ndl * 0.5);
    sunLit += col * (1.8 + uEmissive);
    sunLit += vec3(1.0, 0.96, 0.88) * rim * 0.35;
    gl_FragColor = vec4(sunLit, 1.0);
    return;
  } else if (kind < 1.5) {
    float land = fbm(p);
    float crat = smoothstep(0.62, 0.78, vnoise(o * 18.0 + 3.0));
    vec3 dirt = uColor * 0.72;
    vec3 high = mix(uColor, vec3(0.62, 0.58, 0.5), 0.45);
    col = mix(dirt, high, smoothstep(0.38, 0.62, land));
    col *= 1.0 - crat * 0.28;
  } else if (kind < 2.5) {
    float dune = 0.5 + 0.5 * sin(o.z * 28.0 + fbm(p) * 8.0);
    vec3 sand = mix(uColor, vec3(0.82, 0.55, 0.28), 0.35);
    vec3 dark = uColor * 0.55;
    col = mix(dark, sand, dune);
    col *= 0.85 + fbm(p * 1.6) * 0.3;
  } else if (kind < 3.5) {
    float land = fbm(p * 0.9);
    float coast = smoothstep(0.46, 0.54, land);
    vec3 sea = mix(vec3(0.02, 0.12, 0.28), uColor, 0.45);
    vec3 deep = vec3(0.01, 0.05, 0.14);
    vec3 shore = vec3(0.18, 0.28, 0.22);
    vec3 landC = mix(uColor, vec3(0.22, 0.38, 0.18), 0.4);
    col = mix(mix(deep, sea, 0.7 + 0.3 * fbm(p * 2.0)), mix(shore, landC, smoothstep(0.52, 0.7, land)), coast);
    float cloud = smoothstep(0.55, 0.78, fbm(p * 1.4 + vec3(2.1, 0.0, 1.4)));
    col = mix(col, vec3(0.92, 0.94, 0.97), cloud * 0.45 * (0.4 + ndl));
  } else if (kind < 4.5) {
    float ice = fbm(p * 1.2);
    vec3 snow = mix(vec3(0.86, 0.92, 0.96), uColor, 0.25);
    vec3 rock = mix(uColor, vec3(0.35, 0.42, 0.48), 0.5);
    col = mix(rock, snow, smoothstep(0.32, 0.58, ice));
    float crack = smoothstep(0.72, 0.88, vnoise(o * 22.0));
    col = mix(col, vec3(0.2, 0.35, 0.48), crack * 0.35);
  } else if (kind < 5.5) {
    float crust = fbm(p);
    vec3 basalt = mix(uColor, vec3(0.12, 0.1, 0.1), 0.55);
    vec3 ash = vec3(0.28, 0.22, 0.18);
    col = mix(basalt, ash, smoothstep(0.4, 0.7, crust));
    float vent = pow(max(0.0, 0.55 - crust), 2.2);
    col += vec3(1.0, 0.28, 0.05) * vent * 1.4;
    col += vec3(1.0, 0.7, 0.15) * pow(vent, 2.0) * 0.8;
  } else if (kind < 7.5) {
    float lat = o.y;
    float warp = lat + (fbm(p) - 0.5) * 0.28;
    float bands = 0.5 + 0.5 * sin(warp * 18.0 + uSeed * 6.0);
    vec3 dark = uColor * 0.45;
    vec3 light = mix(uColor, vec3(1.0, 0.92, 0.78), 0.28);
    col = mix(dark, light, bands);
    col *= 0.85 + fbm(vec3(o.x * 3.0, warp * 8.0, o.z * 3.0)) * 0.35;
    float storm = smoothstep(0.72, 0.9, vnoise(vec3(o.x, lat, o.z) * 6.0 + 4.0));
    col = mix(col, uColor * 0.35, storm * 0.4);
  } else if (kind < 8.5) {
    col = uColor * (0.55 + 0.45 * vnoise(o * 10.0));
  } else if (kind < 9.5) {
    float lat = o.y;
    float warp = lat + (fbm(p) - 0.5) * 0.22;
    float bands = 0.5 + 0.5 * sin(warp * 14.0 + uSeed * 4.0);
    vec3 deep = mix(uColor, vec3(0.12, 0.22, 0.4), 0.45);
    vec3 haze = mix(uColor, vec3(0.55, 0.82, 0.78), 0.4);
    col = mix(deep, haze, bands);
    col *= 0.88 + fbm(p * 1.4) * 0.25;
  } else if (kind < 10.5) {
    float ice = fbm(p * 1.6);
    vec3 snow = mix(vec3(0.9, 0.94, 0.98), uColor, 0.3);
    vec3 dust = mix(uColor, vec3(0.4, 0.42, 0.38), 0.5);
    col = mix(dust, snow, smoothstep(0.3, 0.62, ice));
    col += vec3(0.45, 0.7, 0.9) * 0.2;
  } else if (kind < 11.5) {
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
  } else if (kind < 12.5) {
    float grid = max(step(0.9, fract(o.x * 16.0)), step(0.9, fract(o.y * 16.0)));
    vec3 cell = mix(vec3(0.04, 0.07, 0.14), vec3(0.10, 0.22, 0.40), vnoise(o * 9.0));
    col = mix(cell * uColor * 1.4, vec3(0.16, 0.18, 0.22), grid);
    vec3 H = normalize(L + V);
    float spec = pow(max(0.0, dot(n, H)), 48.0);
    vec3 litS = col * mix(0.08, 1.15, ndl) + vec3(0.55, 0.72, 1.0) * spec * 0.45;
    litS += col * rim * 0.12;
    gl_FragColor = vec4(litS, 1.0);
    return;
  } else if (kind < 13.5) {
    col = mix(uColor, vec3(0.82, 0.92, 1.0), 0.45);
    vec3 litD = col * mix(0.22, 1.05, ndl) + col * uEmissive * 1.55;
    litD += vec3(0.7, 0.85, 1.0) * rim * 0.35;
    gl_FragColor = vec4(litD, 1.0);
    return;
  } else {
    float heat = pow(max(0.0, 1.0 - abs(o.x) * 1.8), 2.2) + vnoise(o * 6.0) * 0.25;
    vec3 cool = vec3(0.10, 0.09, 0.09);
    vec3 hot = vec3(0.92, 0.38, 0.12);
    col = mix(cool, mix(uColor, hot, 0.7), clamp(heat, 0.0, 1.0));
    vec3 litR = col * mix(0.12, 0.7, ndl) + hot * heat * (0.18 + uEmissive);
    litR += col * rim * 0.1;
    gl_FragColor = vec4(litR, 1.0);
    return;
  }

  vec3 lit = col * mix(0.07, 1.0, ndl);
  if (kind > 4.5 && kind < 5.5) {
    float crust = fbm(p);
    float vent = pow(max(0.0, 0.55 - crust), 2.2);
    lit += vec3(1.0, 0.32, 0.06) * vent * 0.85;
  }
  lit += col * rim * 0.22;
  lit += col * uEmissive;
  gl_FragColor = vec4(lit, 1.0);
}`;

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
