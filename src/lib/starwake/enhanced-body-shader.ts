/**
 * Enhanced Body Shader for Starwake
 * 
 * This shader provides detailed procedural textures for all celestial body types
 * with seeded variation for infinite diversity.
 */

import {
  HASH_FUNCTIONS,
  VALUE_NOISE,
  FBM,
  DOMAIN_WARPING,
  CRATER_NOISE,
  GAS_GIANT_BANDS,
  ROCKY_SURFACE,
  VOLCANIC_SURFACE,
  OCEAN_SURFACE,
  ICE_SURFACE,
  DESERT_SURFACE,
  STAR_GRANULATION,
  MOON_CRATERS,
  SPHERICAL_UTILS,
  COLOR_UTILS
} from './procedural-textures';

// Combine all procedural texture functions into a single shader block
const PROCEDURAL_FUNCTIONS = `
${HASH_FUNCTIONS}
${VALUE_NOISE}
${FBM}
${DOMAIN_WARPING}
${CRATER_NOISE}
${GAS_GIANT_BANDS}
${ROCKY_SURFACE}
${VOLCANIC_SURFACE}
${OCEAN_SURFACE}
${ICE_SURFACE}
${DESERT_SURFACE}
${STAR_GRANULATION}
${MOON_CRATERS}
${SPHERICAL_UTILS}
${COLOR_UTILS}
`;

export const ENHANCED_BODY_FS = `precision mediump float;
varying vec3 vN;
varying vec3 vW;
varying vec3 vObj;
uniform vec3 uColor;
uniform vec3 uSunPos;
uniform vec3 uCamPos;
uniform float uEmissive;
uniform float uKind;
uniform float uSeed;

${PROCEDURAL_FUNCTIONS}

// ============================================================================
// ENHANCED PLANET TEXTURE FUNCTIONS
// ============================================================================

vec3 enhancedRocky(vec3 p, vec3 baseColor, float seed) {
  // Base terrain with elevation
  float terrain = fbm4(p * 4.0);
  
  // Elevation-based coloring
  vec3 lowland = baseColor * 0.7;
  vec3 highland = mix(baseColor, vec3(0.62, 0.58, 0.5), 0.45);
  vec3 color = mix(lowland, highland, smoothstep(0.38, 0.62, terrain));
  
  // Crater systems
  float craters = craterNoise(p, 8.0, seed);
  color *= 1.0 - craters * 0.28;
  
  // Maria (dark plains)
  float maria = smoothstep(0.72, 0.88, vnoise(p * 6.0 + seed * 5.0));
  color = mix(color, baseColor * 0.6, maria * 0.4);
  
  // Regolith variation
  float regolith = fbm3(p * 12.0);
  color *= 0.95 + regolith * 0.1;
  
  return color;
}

vec3 enhancedDesert(vec3 p, vec3 baseColor, float seed) {
  // Dune patterns with multiple scales
  float dune1 = sin(p.z * 28.0 + fbm3(p * 2.0) * 8.0);
  float dune2 = sin(p.x * 14.0 + fbm3(p * 4.0) * 4.0);
  float dune = 0.5 + 0.5 * ((dune1 + dune2 * 0.5) / 1.5);
  dune += fbm3(p * 6.0) * 0.3;
  dune = clamp(dune, 0.0, 1.0);
  
  // Sand and bedrock
  vec3 sand = mix(baseColor, vec3(0.82, 0.55, 0.28), 0.35);
  vec3 bedrock = baseColor * 0.55;
  vec3 color = mix(bedrock, sand, dune);
  
  // Canyon networks
  float canyon = ridgedFbm(p * 8.0, 3);
  color = mix(color, baseColor * 0.4, canyon * 0.5);
  
  // Rock outcroppings
  float rocks = smoothstep(0.78, 0.92, vnoise(p * 16.0 + seed * 4.0));
  color = mix(color, baseColor * 0.65, rocks * 0.3);
  
  // Overall variation
  color *= 0.85 + fbm3(p * 1.6) * 0.3;
  
  return color;
}

vec3 enhancedOcean(vec3 p, vec3 baseColor, float seed) {
  // Continent shapes
  float land = fbm4(p * 3.0);
  float coast = smoothstep(0.46, 0.54, land);
  
  // Bathymetry (water depth)
  float depth = fbm3(p * 6.0);
  vec3 deepOcean = vec3(0.02, 0.12, 0.28);
  vec3 shallowSea = mix(deepOcean, baseColor, 0.45);
  vec3 water = mix(deepOcean, shallowSea, 0.7 + 0.3 * depth);
  
  // Land features
  vec3 shore = vec3(0.18, 0.28, 0.22);
  vec3 landColor = mix(baseColor, vec3(0.22, 0.38, 0.18), 0.4);
  float elevation = smoothstep(0.52, 0.7, land);
  vec3 highLand = mix(landColor, vec3(0.35, 0.32, 0.28), elevation);
  vec3 landFinal = mix(shore, highLand, elevation);
  
  // Mix land and water
  vec3 color = mix(water, landFinal, coast);
  
  // Cloud cover with multiple layers
  float cloudBase = fbm3(p * 5.0 + vec3(2.1, 0.0, 1.4));
  float cloudDetail = vnoise(p * 12.0 + seed * 3.0);
  float cloud = smoothstep(0.55, 0.78, cloudBase);
  float cloudAlpha = cloud * (0.35 + 0.4 * cloudDetail);
  
  // Store cloud in alpha for later blending
  color = mix(color, vec3(0.92, 0.94, 0.97), cloudAlpha);
  
  return color;
}

vec3 enhancedIce(vec3 p, vec3 baseColor, float seed) {
  // Ice terrain
  float ice = fbm4(p * 4.0);
  
  // Snow and exposed ice
  vec3 snow = mix(vec3(0.86, 0.92, 0.96), baseColor, 0.25);
  vec3 exposedIce = mix(baseColor, vec3(0.35, 0.42, 0.48), 0.5);
  vec3 color = mix(exposedIce, snow, smoothstep(0.32, 0.58, ice));
  
  // Fracture patterns
  vec3 warped = warpDomain(p, 0.2, 4.0);
  float crackNoise = vnoise(warped * 22.0);
  float cracks = smoothstep(0.72, 0.88, crackNoise);
  color = mix(color, vec3(0.2, 0.35, 0.48), cracks * 0.35);
  
  // Polar caps
  float latitude = abs(p.y);
  float polarCap = smoothstep(0.7, 0.9, latitude);
  color = mix(color, snow, polarCap * 0.6);
  
  // Subsurface scattering hint (bluish tint in shadows)
  float ndl = max(0.0, dot(normalize(vN), normalize(uSunPos - vW)));
  color = mix(color, vec3(0.6, 0.75, 0.85), (1.0 - ndl) * 0.15);
  
  return color;
}

vec3 enhancedVolcanic(vec3 p, vec3 baseColor, float seed) {
  // Crust formation
  float crust = fbm4(p * 4.0);
  
  // Basalt and ash
  vec3 basalt = baseColor * 0.55;
  vec3 ash = vec3(0.28, 0.22, 0.18);
  vec3 color = mix(basalt, ash, smoothstep(0.4, 0.7, crust));
  
  // Heat map and vent systems
  float heat = fbm3(p * 2.0 + seed * 3.0);
  float ventDensity = pow(max(0.0, 0.55 - heat), 2.2);
  
  // Lava flow channels
  float flowNoise = vnoise(p * 8.0 + vec3(seed * 10.0, 0.0, seed * 5.0));
  float flows = smoothstep(0.65, 0.85, flowNoise) * ventDensity;
  
  // Lava coloring
  vec3 lavaCore = vec3(1.0, 0.32, 0.06);
  vec3 lavaEdge = vec3(1.0, 0.15, 0.02);
  float flowThickness = flows * (0.5 + 0.5 * vnoise(p * 16.0));
  color += lavaCore * flowThickness * 1.4;
  color += lavaEdge * pow(flowThickness, 2.0) * 0.8;
  
  // Caldera features
  float caldera = craterNoise(p, 3.0, seed + 7.0);
  color = mix(color, lavaCore, caldera * 0.5);
  
  return color;
}

vec3 enhancedGasGiant(vec3 p, vec3 baseColor, float seed) {
  float latitude = p.y;
  float lon = atan(p.z, p.x);
  
  // Band structure with multiple frequencies
  float warp = latitude + (fbm3(p) - 0.5) * 0.28;
  float bands = 0.5 + 0.5 * sin(warp * 18.0 + seed * 6.0);
  bands += 0.25 * sin(warp * 36.0 + seed * 12.0);
  bands += 0.125 * sin(warp * 72.0 + seed * 24.0);
  
  // Color variation in bands
  vec3 darkBand = baseColor * 0.45;
  vec3 lightBand = mix(baseColor, vec3(1.0, 0.92, 0.78), 0.28);
  vec3 color = mix(darkBand, lightBand, bands);
  
  // Turbulence and eddies
  vec3 warped = warpDomainAdvanced(p, 0.3, 0.15, 3.0, 8.0);
  float turbulence = fbm3(warped);
  color *= 0.85 + turbulence * 0.35;
  
  // Storm systems
  float storm1 = stormVortex(p, vec2(0.5, 0.2), 0.15, seed);
  float storm2 = stormVortex(p, vec2(-1.2, -0.15), 0.1, seed + 2.0);
  float storm3 = stormVortex(p, vec2(2.1, 0.3), 0.08, seed + 5.0);
  float storms = max(storm1, max(storm2, storm3));
  color = mix(color, baseColor * 0.35, storms * 0.4);
  
  // Great Red Spot-like feature (occasional)
  if (seed > 0.5) {
    float spot = stormVortex(p, vec2(0.8, -0.3), 0.25, seed + 10.0);
    color = mix(color, vec3(0.8, 0.3, 0.2), spot * 0.6);
  }
  
  return color;
}

vec3 enhancedRingedGiant(vec3 p, vec3 baseColor, float seed) {
  // Similar to gas giant but with more subtle bands
  float latitude = p.y;
  float warp = latitude + (fbm3(p) - 0.5) * 0.22;
  float bands = 0.5 + 0.5 * sin(warp * 14.0 + seed * 4.0);
  
  vec3 darkBand = baseColor * 0.5;
  vec3 lightBand = mix(baseColor, vec3(0.95, 0.88, 0.75), 0.3);
  vec3 color = mix(darkBand, lightBand, bands);
  
  // More subtle turbulence
  color *= 0.88 + fbm3(p * 1.4) * 0.25;
  
  return color;
}

vec3 enhancedIceGiant(vec3 p, vec3 baseColor, float seed) {
  float latitude = p.y;
  
  // Methane haze bands
  float warp = latitude + (fbm3(p) - 0.5) * 0.22;
  float bands = 0.5 + 0.5 * sin(warp * 14.0 + seed * 4.0);
  
  vec3 deepColor = mix(baseColor, vec3(0.12, 0.22, 0.4), 0.45);
  vec3 hazeColor = mix(baseColor, vec3(0.55, 0.82, 0.78), 0.4);
  vec3 color = mix(deepColor, hazeColor, bands);
  
  // Subtle cloud features
  color *= 0.88 + fbm3(p * 1.4) * 0.25;
  
  // Polar hood
  float polarHood = smoothstep(0.75, 0.95, abs(latitude));
  color = mix(color, vec3(0.7, 0.8, 0.9), polarHood * 0.4);
  
  return color;
}

// ============================================================================
// MAIN SHADER ENTRY POINT
// ============================================================================

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
    // Star (kind 0)
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
    // Rocky world (kind 1)
    col = enhancedRocky(p, uColor, uSeed);
    
  } else if (kind < 2.5) {
    // Desert world (kind 2)
    col = enhancedDesert(p, uColor, uSeed);
    
  } else if (kind < 3.5) {
    // Ocean world (kind 3)
    col = enhancedOcean(p, uColor, uSeed);
    
  } else if (kind < 4.5) {
    // Ice world (kind 4)
    col = enhancedIce(p, uColor, uSeed);
    
  } else if (kind < 5.5) {
    // Volcanic world (kind 5)
    col = enhancedVolcanic(p, uColor, uSeed);
    
  } else if (kind < 6.5) {
    // Gas giant (kind 6)
    col = enhancedGasGiant(p, uColor, uSeed);
    
  } else if (kind < 7.5) {
    // Ringed giant (kind 7)
    col = enhancedRingedGiant(p, uColor, uSeed);
    
  } else if (kind < 8.5) {
    // Ice giant (kind 9, skipping 8 for consistency)
    col = enhancedIceGiant(p, uColor, uSeed);
    
  } else if (kind < 9.5) {
    // Comet (kind 10)
    float noise = fbm3(p * 2.0);
    col = uColor * (0.55 + 0.45 * noise);
    
  } else if (kind < 10.5) {
    // Moon - rocky variant (kind 11)
    float craterDensity = 0.6 + 0.4 * hash11(uSeed);
    float rayStrength = hash11(uSeed + 5.0);
    col = moonSurface(p, uColor, uSeed, craterDensity, rayStrength);
    
  } else if (kind < 11.5) {
    // Moon - icy variant (kind 12)
    col = enhancedIce(p, uColor, uSeed + 10.0);
    
  } else if (kind < 12.5) {
    // Station - metallic (kind 13)
    float panel = vnoise(floor(p * 12.0 + 1.7));
    float seam = 1.0 - smoothstep(0.02, 0.07, 
      min(min(abs(fract(o.x * 8.0) - 0.5), abs(fract(o.y * 8.0) - 0.5)), 
          abs(fract(o.z * 8.0) - 0.5)));
    vec3 metal = uColor * (0.40 + panel * 0.42);
    metal *= 1.0 - seam * 0.38;
    col = metal;
    
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
