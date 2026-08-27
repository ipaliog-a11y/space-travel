# Starwake Procedural Texture Upgrade - Implementation Guide

## Overview

This upgrade replaces the simple procedural textures in Starwake with a comprehensive system that generates **infinite variety** in celestial body appearances. No two planets should look identical, even within the same class.

## Files Created

1. **`procedural-textures.ts`** - Core noise functions and texture generation utilities
2. **`enhanced-body-shader.ts`** - Complete replacement for the BODY_FS shader
3. **`TEXTURE_UPGRADE.md`** - This documentation file

## Key Features

### Noise System
- **Improved hash functions** using prime number multiplication
- **Quintic interpolation** for smoother noise (vs. cubic in original)
- **4-5 octave FBM** with configurable lacunarity and persistence
- **Domain warping** for complex natural patterns
- **Ridged and billow noise** variants for specific features

### Planet-Specific Enhancements

#### Rocky Worlds (Kind 1)
- **Crater systems** with density variation
- **Maria (dark plains)** similar to lunar maria
- **Highland vs. lowland** elevation-based coloring
- **Regolith variation** for surface texture

#### Desert Worlds (Kind 2)
- **Multi-scale dune patterns** with sin-wave and noise combination
- **Canyon networks** using ridged FBM
- **Rock outcroppings** breaking through sand
- **Bedrock exposure** in low-lying areas

#### Ocean Worlds (Kind 3)
- **Continent shapes** from FBM threshold
- **Bathymetry** (water depth variation)
- **Multi-layer cloud cover** with alpha blending
- **Shore transitions** from deep ocean to highlands

#### Ice Worlds (Kind 4)
- **Fracture networks** from domain-warped noise
- **Polar caps** with latitude-based blending
- **Exposed ice vs. snow** coverage
- **Subsurface scattering hint** in shadows

#### Volcanic Worlds (Kind 5)
- **Heat map** driving volcanic activity
- **Lava flow channels** with thickness variation
- **Vent systems** and caldera features
- **Basalt crust** with ash deposits

#### Gas Giants (Kind 6)
- **Multi-frequency band structure** (3 sin waves)
- **Turbulence and eddies** from domain warping
- **Storm vortices** with swirl patterns
- **Great Red Spot-like features** (seed-dependent)

#### Ringed Giants (Kind 7)
- **Subtle banding** (less pronounced than gas giants)
- **Gentle turbulence** for atmosphere

#### Ice Giants (Kind 8/9)
- **Methane haze bands**
- **Polar hood** features
- **Deep atmospheric layers**

### Star Surface (Kind 0)
- **Granulation pattern** from multi-scale noise
- **Sunspot groups** with umbra/penumbra structure
- **Limb darkening** (darker at edges)
- **Faculae** (bright regions)

### Moon Textures (Kind 11-12)
- **Crater age variations** (fresh vs. eroded)
- **Ray systems** from recent impacts (8-directional)
- **Crater density variation** by region
- **Maria regions** for dark plains

## Integration Steps

### Step 1: Import Enhanced Shader

In `src/lib/starwake/shaders.ts`, add the import:

```typescript
import { ENHANCED_BODY_FS } from './enhanced-body-shader';
```

### Step 2: Update Shader Exports

Replace the existing `BODY_FS` export or create a new one:

```typescript
// Option A: Replace entirely (recommended for testing)
export { ENHANCED_BODY_FS as BODY_FS } from './enhanced-body-shader';

// Option B: Keep both for comparison
export { ENHANCED_BODY_FS } from './enhanced-body-shader';
// Keep existing BODY_FS for fallback
```

### Step 3: Update Engine to Use Enhanced Shader

In `src/lib/starwake/engine.ts`, the shader is already compiled in the `createEngine` function:

```typescript
const bodyProg = program(gl, BODY_VS, BODY_FS);
```

This will automatically use the enhanced version if you replaced the export in Step 2.

### Step 4: Ensure Seed Values Are Passed

The enhanced shader uses `uSeed` uniform, which is already being set in the existing code (line 1687 in engine.ts):

```typescript
gl.uniform1f(loc(gl, bodyProg, "uSeed"), seed);
```

This is already correctly implemented, so no changes needed.

### Step 5: Update Kind Codes if Necessary

The enhanced shader uses the same kind codes as the original:

```typescript
const KIND_CODE = {
  rocky: 1,
  desert: 2,
  ocean: 3,
  ice: 4,
  volcanic: 5,
  gas: 6,
  ringed: 7,
  icegiant: 9,  // Note: skips 8
  comet: 10
};
```

These match the existing codes in `engine.ts`, so no changes needed.

## Performance Optimizations

### GPU Performance
The enhanced shader is designed to stay within the **< 2ms per body** budget:

1. **Adaptive octaves**: Uses 3-5 FBM octaves based on feature complexity
2. **Early returns**: Stars return early to avoid unnecessary calculations
3. **Conditional features**: Storm systems and special features only calculated when needed
4. **Efficient hashing**: Single hash function reused across all noise

### LOD Considerations
For distant bodies, you can reduce quality by:

```typescript
// In engine.ts, before drawing
const dist = Math.hypot(px - cam[0], py - cam[1], pz - cam[2]);
const lod = dist > 2000 ? 2 : dist > 800 ? 3 : 5;
// Pass lod as uniform and use in shader to reduce octaves
```

### Mobile Optimization
For mobile devices, consider:

1. Reduce max octaves from 5 to 3
2. Skip domain warping on distant bodies
3. Simplify storm calculations

## Visual Comparison

### Before → After

#### Rocky Worlds
- **Before**: Simple 3-octave FBM with basic color variation
- **After**: Crater fields, maria plains, highland/lowland differentiation, regolith texture

#### Gas Giants
- **Before**: Single sin-wave bands with simple turbulence
- **After**: Multi-frequency bands, storm vortices, Great Red Spot features, eddies

#### Stars
- **Before**: Solid color with basic emissive glow
- **After**: Granulation cells, sunspot groups, limb darkening, faculae

#### Moons
- **Before**: Same as rocky planets
- **After**: Age-varied craters, ray systems, crater density maps, maria

#### Ice Worlds
- **Before**: Simple noise with basic coloring
- **After**: Fracture networks, polar caps, subsurface scattering, exposed ice

## Seed System

Each celestial body gets a unique seed based on its ID:

```typescript
function seedOf(id) {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) h = Math.imul(h ^ id.charCodeAt(i), 16777619);
  return (h >>> 0) / 4294967296;
}
```

This ensures:
- **Consistency**: Same body always looks the same
- **Variety**: Different bodies look different
- **Predictability**: Can regenerate textures on demand

## Testing

### Visual Testing
1. Visit each planet type in the game
2. Check for variety between bodies of the same class
3. Verify performance stays smooth (< 2ms per body)
4. Test at different distances (LOD effectiveness)

### Performance Testing
```typescript
// Add to engine.ts for profiling
const start = performance.now();
drawBody(...);
const elapsed = performance.now() - start;
if (elapsed > 2.0) console.warn(`Slow body render: ${elapsed.toFixed(2)}ms`);
```

### Regression Testing
Keep the original `BODY_FS` shader available for comparison:

```typescript
export const ORIGINAL_BODY_FS = `...`;
export const ENHANCED_BODY_FS = `...`;

// Toggle with query parameter
const useEnhanced = new URLSearchParams(window.location.search).get('enhanced') === 'true';
const bodyProg = program(gl, BODY_VS, useEnhanced ? ENHANCED_BODY_FS : ORIGINAL_BODY_FS);
```

## Troubleshooting

### Shader Compilation Errors
If the enhanced shader fails to compile:
1. Check for WebGL precision issues (`precision mediump float;`)
2. Verify all functions are defined before use
3. Check for syntax errors in string concatenation

### Performance Issues
If rendering is slow:
1. Reduce FBM octaves in shader (change `fbm4` to `fbm3`)
2. Disable domain warping for distant bodies
3. Simplify storm vortex calculations

### Visual Artifacts
If you see visual glitches:
1. Check seed values are in [0, 1] range
2. Verify kind codes match between galaxy.ts and shader
3. Ensure normal vectors are properly normalized

## Future Enhancements

### Potential Additions
1. **Atmospheric scattering** - Rayleigh/Mie scattering for thick atmospheres
2. **Aurora effects** - For magnetized planets
3. **Seasonal variation** - Axial tilt affecting polar caps
4. **Tidal heating** - For moons near gas giants
5. **Ring shadows** - Casting shadows on planet surface
6. **Phase function** - Proper Lambertian reflectance

### Advanced Features
1. **Volumetric clouds** - Multiple cloud layers with shadows
2. **Bioluminescence** - Night-side city lights for inhabited worlds
3. **Weather systems** - Dynamic cloud movement
4. **Vegetation** - For Earth-like worlds
5. **Ice sheets** - Dynamic polar ice coverage

## Credits

This implementation builds on the existing Starwake procedural system and enhances it with advanced noise techniques commonly used in modern space games and demoscene productions.

## Support

For issues or questions, refer to the original Starwake documentation and the inline comments in the shader code.
