/**
 * Procedural Texture Generation for Starwake Celestial Bodies
 * 
 * This module provides advanced procedural texture generation for planets, stars, and moons.
 * All textures are generated in WebGL fragment shaders using seeded noise functions.
 * 
 * Features:
 * - Multi-octave Perlin/Simplex noise with configurable lacunarity and persistence
 * - Domain warping for complex natural patterns
 * - Planet-specific detail (craters, bands, storms, flows, etc.)
 * - Star surface granulation and magnetic activity
 * - Moon crater density variations and ray systems
 * 
 * Performance budget: < 2ms per celestial body render
 * Octave count: 3-5 layers depending on feature complexity
 */

// ============================================================================
// NOISE PRIMITIVES
// ============================================================================

/**
 * Improved hash function for procedural noise
 * Uses prime number multiplication for better distribution
 */
export const HASH_FUNCTIONS = `
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

vec2 hash22(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * vec3(0.1031, 0.1030, 0.0973));
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.xx + p3.yz) * p3.zy);
}

vec3 hash33(vec3 p) {
  p = fract(p * vec3(0.1031, 0.1030, 0.0973));
  p += dot(p, p.yzx + 33.33);
  return fract(vec3(
    (p.x + p.y) * p.z,
    (p.x + p.z) * p.y,
    (p.y + p.z) * p.x
  ));
}
`;

/**
 * Value noise with smooth interpolation
 * Foundation for all procedural textures
 */
export const VALUE_NOISE = `
float vnoise(vec3 p) {
  vec3 i = floor(p);
  vec3 f = fract(p);
  
  // Quintic interpolation for smoother results
  f = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
  
  // Calculate corner values
  vec3 u = i + vec3(0.0, 0.0, 0.0);
  vec3 v = i + vec3(1.0, 0.0, 0.0);
  vec3 w = i + vec3(0.0, 1.0, 0.0);
  vec3 x = i + vec3(1.0, 1.0, 0.0);
  vec3 y = i + vec3(0.0, 0.0, 1.0);
  vec3 z = i + vec3(1.0, 0.0, 1.0);
  vec3 aa = i + vec3(0.0, 1.0, 1.0);
  vec3 ab = i + vec3(1.0, 1.0, 1.0);
  
  float n000 = hash13(u);
  float n100 = hash13(v);
  float n010 = hash13(w);
  float n110 = hash13(x);
  float n001 = hash13(y);
  float n101 = hash13(z);
  float n011 = hash13(aa);
  float n111 = hash13(ab);
  
  // Trilinear interpolation
  float nx00 = mix(n000, n100, f.x);
  float nx10 = mix(n010, n110, f.x);
  float nx01 = mix(n001, n101, f.x);
  float nx11 = mix(n011, n111, f.x);
  float nxy0 = mix(nx00, nx10, f.y);
  float nxy1 = mix(nx01, nx11, f.y);
  return mix(nxy0, nxy1, f.z);
}

// 2D value noise for surface patterns
float vnoise2D(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  
  float n00 = hash12(i);
  float n10 = hash12(i + vec2(1.0, 0.0));
  float n01 = hash12(i + vec2(0.0, 1.0));
  float n11 = hash12(i + vec2(1.0, 1.0));
  
  return mix(mix(n00, n10, f.x), mix(n01, n11, f.x), f.y);
}
`;

/**
 * Fractal Brownian Motion - multiple noise octaves
 * Creates natural-looking complexity through self-similar detail
 */
export const FBM = `
float fbm(vec3 p, int octaves, float lacunarity, float persistence) {
  float value = 0.0;
  float amplitude = 1.0;
  float frequency = 1.0;
  float maxValue = 0.0;
  
  for (int i = 0; i < 5; i++) {
    if (i >= octaves) break;
    value += amplitude * vnoise(p * frequency);
    maxValue += amplitude;
    amplitude *= persistence;
    frequency *= lacunarity;
  }
  
  return value / maxValue;
}

// Standard 4-octave FBM with default parameters
float fbm4(vec3 p) {
  return fbm(p, 4, 2.0, 0.5);
}

// 3-octave FBM for performance-critical paths
float fbm3(vec3 p) {
  return fbm(p, 3, 2.0, 0.5);
}

// 5-octave FBM for high-detail close-up views
float fbm5(vec3 p) {
  return fbm(p, 5, 2.0, 0.5);
}

// Ridged multifractal (absolute value creates ridges)
float ridgedFbm(vec3 p, int octaves) {
  float value = 0.0;
  float amplitude = 1.0;
  float frequency = 1.0;
  float maxValue = 0.0;
  
  for (int i = 0; i < 5; i++) {
    if (i >= octaves) break;
    float n = vnoise(p * frequency);
    n = 1.0 - abs(n);  // Create ridges
    n = n * n;  // Sharpen ridges
    value += amplitude * n;
    maxValue += amplitude;
    amplitude *= 0.5;
    frequency *= 2.0;
  }
  
  return value / maxValue;
}

// Billow noise (absolute value without inversion)
float billow(vec3 p, int octaves) {
  float value = 0.0;
  float amplitude = 1.0;
  float frequency = 1.0;
  float maxValue = 0.0;
  
  for (int i = 0; i < 5; i++) {
    if (i >= octaves) break;
    float n = abs(vnoise(p * frequency) - 0.5) * 2.0;
    value += amplitude * n;
    maxValue += amplitude;
    amplitude *= 0.5;
    frequency *= 2.0;
  }
  
  return value / maxValue;
}
`;

/**
 * Domain warping for complex natural patterns
 * Uses noise to distort coordinate space before sampling
 */
export const DOMAIN_WARPING = `
vec3 warpDomain(vec3 p, float strength, float scale) {
  vec3 warp = vec3(
    vnoise(p * scale + vec3(0.0, 0.0, 0.0)),
    vnoise(p * scale + vec3(5.2, 1.3, 9.1)),
    vnoise(p * scale + vec3(1.8, 7.4, 3.2))
  );
  return p + warp * strength;
}

// Advanced domain warping with multiple layers
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
`;

// ============================================================================
// PLANET-SPECIFIC TEXTURE FUNCTIONS
// ============================================================================

/**
 * Crater generation for rocky worlds and moons
 * Uses noise to place craters with size and depth variations
 */
export const CRATER_NOISE = `
float crater(vec2 uv, vec2 center, float radius, float depth) {
  float d = length(uv - center);
  float craterShape = smoothstep(radius, radius * 0.7, d);
  float rim = smoothstep(radius * 1.1, radius, d) * smoothstep(radius * 0.9, radius * 1.1, d);
  float bowl = smoothstep(radius * 0.6, 0.0, d);
  return craterShape * depth + rim * 0.3 + bowl * 0.5;
}

// Procedural crater field using noise
float craterField(vec2 uv, float density, float sizeVar, float seed) {
  float craters = 0.0;
  vec2 grid = floor(uv * density);
  
  for (float x = -1.0; x <= 1.0; x++) {
    for (float y = -1.0; y <= 1.0; y++) {
      vec2 cell = grid + vec2(x, y);
      float h = hash12(cell * seed);
      if (h > 0.7) {
        vec2 pos = cell / density + (hash12(cell * (seed + 1.0)) - 0.5) * sizeVar / density;
        float r = (hash12(cell * (seed + 2.0)) * 0.5 + 0.5) * sizeVar / density;
        float d = hash12(cell * (seed + 3.0));
        craters += crater(uv, pos, r, d);
      }
    }
  }
  
  return craters;
}

// Simplex-style crater noise for spherical surfaces
float craterNoise(vec3 p, float density, float seed) {
  vec2 uv = vec2(atan(p.z, p.x), asin(p.y));
  return craterField(uv, density, 0.8, seed);
}
`;

/**
 * Gas giant atmospheric bands with turbulence
 * Creates latitudinal banding with storm systems
 */
export const GAS_GIANT_BANDS = `
float gasBands(vec3 p, float latitude, float seed) {
  float bands = sin(latitude * 18.0 + seed * 6.283);
  bands += sin(latitude * 9.0 + seed * 3.14) * 0.5;
  bands += sin(latitude * 36.0 + seed * 9.42) * 0.25;
  return bands * 0.5 + 0.5;
}

// Storm vortex generation
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

// Complete gas giant texture
vec3 gasGiantTexture(vec3 p, vec3 baseColor, vec3 bandColor, float seed) {
  float latitude = p.y;
  float bands = gasBands(p, latitude, seed);
  
  // Add turbulence
  vec3 warped = warpDomain(p, 0.3, 3.0);
  float turbulence = fbm3(warped);
  
  // Mix colors based on bands and turbulence
  vec3 color = mix(bandColor * 0.7, baseColor, bands);
  color = mix(color, baseColor * 1.2, turbulence * 0.4);
  
  // Add occasional storms
  float storm1 = stormVortex(p, vec2(0.5, 0.2), 0.15, seed);
  float storm2 = stormVortex(p, vec2(-1.2, -0.15), 0.1, seed + 2.0);
  color = mix(color, vec3(0.8, 0.3, 0.2), (storm1 + storm2 * 0.7) * 0.6);
  
  return color;
}
`;

/**
 * Rocky planet surface with elevation-based coloring
 * Simulates highlands, maria, and crater plains
 */
export const ROCKY_SURFACE = `
vec3 rockySurface(vec3 p, vec3 baseColor, float seed) {
  // Base terrain noise
  float terrain = fbm4(p * 4.0);
  
  // Elevation-based coloring
  vec3 lowland = baseColor * 0.7;
  vec3 highland = mix(baseColor, vec3(0.62, 0.58, 0.5), 0.45);
  vec3 terrainColor = mix(lowland, highland, smoothstep(0.38, 0.62, terrain));
  
  // Add craters
  float craters = craterNoise(p, 8.0, seed);
  terrainColor *= 1.0 - craters * 0.28;
  
  // Add maria (dark plains)
  float maria = smoothstep(0.72, 0.88, vnoise(p * 6.0 + seed * 5.0));
  terrainColor = mix(terrainColor, baseColor * 0.6, maria * 0.4);
  
  return terrainColor;
}
`;

/**
 * Volcanic world with lava flows and vent systems
 * Uses noise to create heat maps and flow channels
 */
export const VOLCANIC_SURFACE = `
vec3 volcanicSurface(vec3 p, vec3 baseColor, float seed) {
  // Crust noise
  float crust = fbm4(p * 4.0);
  
  // Base coloring
  vec3 basalt = baseColor * 0.55;
  vec3 ash = vec3(0.28, 0.22, 0.18);
  vec3 color = mix(basalt, ash, smoothstep(0.4, 0.7, crust));
  
  // Heat map for volcanic activity
  float heat = fbm3(p * 2.0 + seed * 3.0);
  float ventDensity = pow(max(0.0, 0.55 - heat), 2.2);
  
  // Lava flows
  float flowNoise = vnoise(p * 8.0 + vec3(seed * 10.0, 0.0, seed * 5.0));
  float flows = smoothstep(0.65, 0.85, flowNoise) * ventDensity;
  
  // Add lava glow
  color += vec3(1.0, 0.28, 0.05) * flows * 1.4;
  color += vec3(1.0, 0.7, 0.15) * pow(flows, 2.0) * 0.8;
  
  // Caldera features
  float caldera = craterNoise(p, 3.0, seed + 7.0);
  color = mix(color, vec3(0.8, 0.15, 0.05), caldera * 0.5);
  
  return color;
}
`;

/**
 * Ocean world with continents and bathymetry
 * Generates continent shapes and water depth variations
 */
export const OCEAN_SURFACE = `
vec3 oceanSurface(vec3 p, vec3 baseColor, float seed) {
  // Continent noise
  float land = fbm4(p * 3.0);
  float coast = smoothstep(0.46, 0.54, land);
  
  // Water coloring with depth
  vec3 deepOcean = vec3(0.02, 0.12, 0.28);
  vec3 shallowSea = mix(deepOcean, baseColor, 0.45);
  vec3 water = mix(deepOcean, shallowSea, 0.7 + 0.3 * fbm3(p * 6.0));
  
  // Land coloring
  vec3 shore = vec3(0.18, 0.28, 0.22);
  vec3 landColor = mix(baseColor, vec3(0.22, 0.38, 0.18), 0.4);
  vec3 highLand = mix(landColor, vec3(0.35, 0.32, 0.28), smoothstep(0.6, 0.8, land));
  
  // Mix land and water
  vec3 color = mix(water, mix(shore, highLand, smoothstep(0.52, 0.7, land)), coast);
  
  // Cloud cover
  float cloud = smoothstep(0.55, 0.78, fbm3(p * 5.0 + vec3(2.1, 0.0, 1.4)));
  color = mix(color, vec3(0.92, 0.94, 0.97), cloud * 0.45);
  
  return color;
}
`;

/**
 * Ice world with frost patterns and fracture networks
 * Creates cryogenic surface features
 */
export const ICE_SURFACE = `
vec3 iceSurface(vec3 p, vec3 baseColor, float seed) {
  // Ice terrain
  float ice = fbm4(p * 4.0);
  
  // Snow and ice mixing
  vec3 snow = mix(vec3(0.86, 0.92, 0.96), baseColor, 0.25);
  vec3 rock = mix(baseColor, vec3(0.35, 0.42, 0.48), 0.5);
  vec3 color = mix(rock, snow, smoothstep(0.32, 0.58, ice));
  
  // Fracture patterns (cracks in ice)
  float crackNoise = vnoise(p * 22.0);
  float cracks = smoothstep(0.72, 0.88, crackNoise);
  color = mix(color, vec3(0.2, 0.35, 0.48), cracks * 0.35);
  
  // Polar caps
  float latitude = abs(p.y);
  float polarCap = smoothstep(0.7, 0.9, latitude);
  color = mix(color, snow, polarCap * 0.6);
  
  return color;
}
`;

/**
 * Desert world with dune patterns and canyon networks
 * Creates arid surface features
 */
export const DESERT_SURFACE = `
vec3 desertSurface(vec3 p, vec3 baseColor, float seed) {
  // Dune patterns
  float dune = 0.5 + 0.5 * sin(p.z * 28.0 + fbm3(p * 2.0) * 8.0);
  dune += fbm3(p * 6.0) * 0.3;
  dune = clamp(dune, 0.0, 1.0);
  
  // Sand and rock mixing
  vec3 sand = mix(baseColor, vec3(0.82, 0.55, 0.28), 0.35);
  vec3 darkRock = baseColor * 0.55;
  vec3 color = mix(darkRock, sand, dune);
  
  // Canyon networks
  float canyon = ridgedFbm(p * 8.0, 3);
  color = mix(color, baseColor * 0.4, canyon * 0.5);
  
  // Overall variation
  color *= 0.85 + fbm3(p * 1.6) * 0.3;
  
  return color;
}
`;

// ============================================================================
// STAR SURFACE TEXTURES
// ============================================================================

/**
 * Stellar granulation pattern
 * Simulates convection cells on star surface
 */
export const STAR_GRANULATION = `
float granulation(vec3 p, float scale, float seed) {
  float g1 = vnoise(p * scale + seed * 10.0);
  float g2 = vnoise(p * scale * 0.5 + vec3(5.2, 1.3, 9.1) + seed * 5.0);
  float g3 = vnoise(p * scale * 2.0 + vec3(1.8, 7.4, 3.2) + seed * 15.0);
  
  return g1 * 0.6 + g2 * 0.3 + g3 * 0.1;
}

// Sunspot generation
float sunspot(vec3 p, vec2 spotPos, float size, float seed) {
  vec2 uv = vec2(atan(p.z, p.x), asin(p.y));
  vec2 d = uv - spotPos;
  float dist = length(d);
  
  if (dist > size) return 0.0;
  
  // Umbra (dark center)
  float umbra = smoothstep(size * 0.4, 0.0, dist);
  
  // Penumbra (lighter outer region)
  float penumbra = smoothstep(size, size * 0.3, dist);
  
  // Magnetic field lines (subtle striations)
  float angle = atan(d.y, d.x);
  float striations = sin(angle * 12.0 + dist * 8.0) * 0.1 + 0.5;
  
  return umbra * 0.7 + penumbra * striations * 0.3;
}

// Complete star surface
vec3 starSurface(vec3 p, vec3 baseColor, float seed, float limbDarkening) {
  // Granulation
  float gran = granulation(p, 12.0, seed);
  vec3 color = baseColor * (0.92 + gran * 0.12);
  
  // Sunspot groups
  float spot1 = sunspot(p, vec2(0.3, 0.15), 0.2, seed);
  float spot2 = sunspot(p, vec2(-0.8, -0.2), 0.15, seed + 3.0);
  float spot3 = sunspot(p, vec2(1.5, 0.05), 0.1, seed + 7.0);
  float spots = max(spot1, max(spot2, spot3));
  color = mix(color, baseColor * 0.6, spots * 0.7);
  
  // Limb darkening
  float r = length(p.xz);
  float limbFactor = pow(r, 2.0);
  color *= mix(1.0, 0.6, limbDarkening * limbFactor);
  
  // Faculae (bright regions)
  float faculae = smoothstep(0.75, 0.95, gran);
  color += faculae * 0.15;
  
  return color;
}
`;

// ============================================================================
// MOON TEXTURE VARIATIONS
// ============================================================================

/**
 * Moon crater age variations
 * Fresh craters have sharp rims and rays, old craters are eroded
 */
export const MOON_CRATERS = `
float freshCrater(vec2 uv, vec2 center, float radius) {
  float d = length(uv - center);
  float rim = smoothstep(radius * 1.15, radius * 0.85, d);
  float bowl = smoothstep(radius * 0.7, 0.0, d);
  float rays = 0.0;
  
  // Ray system
  for (float i = 0.0; i < 8.0; i++) {
    float angle = i * 0.785 + 0.1;
    vec2 rayDir = vec2(cos(angle), sin(angle));
    float rayDist = dot(uv - center, rayDir);
    float rayWidth = 0.03 + hash11(i) * 0.02;
    rays += smoothstep(rayWidth, 0.0, abs(cross(vec3(uv - center, 0), vec3(rayDir, 0)).z)) 
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

// Complete moon texture
vec3 moonSurface(vec3 p, vec3 baseColor, float seed, float craterDensity, float raySystemStrength) {
  vec2 uv = vec2(atan(p.z, p.x), asin(p.y));
  
  // Base terrain
  float terrain = fbm3(p * 3.0);
  vec3 highland = mix(baseColor, vec3(0.72, 0.68, 0.62), 0.35);
  vec3 lowland = baseColor * 0.75;
  vec3 color = mix(lowland, highland, terrain);
  
  // Crater density variation
  float youngRegion = smoothstep(0.3, 0.7, vnoise(p * 2.0 + seed * 5.0));
  float density = mix(craterDensity * 0.5, craterDensity * 1.5, youngRegion);
  
  // Generate craters
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
        
        if (age > 0.7 && raySystemStrength > 0.5) {
          craters += freshCrater(uv, pos, r);
        } else {
          craters += erodedCrater(uv, pos, r);
        }
      }
    }
  }
  
  color *= 1.0 - craters * 0.35;
  
  // Maria (dark plains)
  float maria = smoothstep(0.68, 0.85, vnoise(p * 4.0 + seed * 8.0));
  color = mix(color, baseColor * 0.55, maria * 0.5);
  
  return color;
}
`;

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Spherical coordinate helpers
 */
export const SPHERICAL_UTILS = `
vec3 sphericalToCartesian(float radius, float theta, float phi) {
  return vec3(
    radius * sin(phi) * cos(theta),
    radius * cos(phi),
    radius * sin(phi) * sin(theta)
  );
}

vec2 cartesianToSpherical(vec3 p) {
  float r = length(p);
  float theta = atan(p.z, p.x);
  float phi = acos(p.y / r);
  return vec2(theta, phi);
}

// Latitude from position on unit sphere
float latitude(vec3 p) {
  return asin(p.y);
}

// Longitude from position on unit sphere
float longitude(vec3 p) {
  return atan(p.z, p.x);
}
`;

/**
 * Color manipulation utilities
 */
export const COLOR_UTILS = `
vec3 saturate(vec3 color, float saturation) {
  float luminance = dot(color, vec3(0.299, 0.587, 0.114));
  return mix(vec3(luminance), color, saturation);
}

vec3 adjustBrightness(vec3 color, float brightness) {
  return color * brightness;
}

vec3 adjustContrast(vec3 color, float contrast) {
  vec3 pivot = vec3(0.5);
  return (color - pivot) * contrast + pivot;
}

// Atmospheric scattering approximation
vec3 atmosphericScatter(vec3 surfaceColor, vec3 atmosphereColor, float density, vec3 normal, vec3 viewDir) {
  float fresnel = pow(1.0 - max(0.0, dot(normal, viewDir)), 3.0);
  return mix(surfaceColor, atmosphereColor, fresnel * density);
}
`;
