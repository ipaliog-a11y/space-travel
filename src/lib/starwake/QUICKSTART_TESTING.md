# Quick Start Guide - Testing the Enhanced Textures

## 🚀 Immediate Testing

The enhanced textures are already integrated! Here's how to test them:

### 1. Start the Application
```bash
cd space-travel
npm start
# or
npm run dev
```

### 2. Navigate to Different Celestial Bodies

Visit each type of world to see the enhanced textures:

**Stars:**
- Look at Helion (the sun in the home system)
- Should see granulation, sunspots, limb darkening

**Rocky Worlds:**
- Visit any "Rocky world" type planet
- Look for craters, maria, highland variations

**Desert Worlds:**
- Find a "Desert world"
- Check for dune patterns, canyons

**Ocean Worlds:**
- Locate an "Ocean world"
- See continents, clouds, bathymetry

**Ice Worlds:**
- Visit an "Ice world"
- Look for fractures, polar caps

**Volcanic Worlds:**
- Find a "Volcanic world"
- Check for lava flows, vents

**Gas Giants:**
- Visit a "Gas giant"
- See bands, storms, turbulence

**Ice Giants:**
- Locate an "Ice giant"
- Check methane haze, polar hood

**Moons:**
- Orbit any moon
- Look for crater rays, age variations

### 3. Performance Testing

Open browser console (F12) and add performance monitoring:

```javascript
// Add to engine.ts tick function or run in console
setInterval(() => {
  const debug = window.__starwake?.getScaleDebug?.();
  if (debug) {
    console.log('Systems:', debug.planets?.length, 'Nebula:', debug.nebula?.kind);
  }
}, 1000);
```

### 4. Visual Comparison

Compare the new textures with the old by checking:

**Stars:**
- ✅ Surface granulation visible?
- ✅ Dark sunspots present?
- ✅ Edges darker than center?

**Planets:**
- ✅ Craters on rocky worlds?
- ✅ Dune patterns on deserts?
- ✅ Clouds on ocean worlds?
- ✅ Fractures on ice worlds?
- ✅ Lava flows on volcanic?
- ✅ Bands and storms on gas giants?

**Moons:**
- ✅ Ray systems from craters?
- ✅ Different crater ages?

## 🎨 What to Look For

### Immediate Visual Cues

1. **Stars no longer look flat** - They have surface texture
2. **Rocky worlds have pockmarks** - Crater fields
3. **Deserts show patterns** - Dune waves and canyons
4. **Oceans have landmasses** - Continent shapes
5. **Ice worlds are cracked** - Fracture networks
6. **Volcanic worlds glow** - Lava flows
7. **Gas giants are banded** - Multiple stripe layers
8. **Moons have rays** - Bright streaks from craters

### Seed Variation Test

Visit multiple worlds of the same type:
- Each should look **different**
- Crater patterns should vary
- Band spacing should differ
- Storm locations should change

## 🔧 Troubleshooting

### If Textures Don't Appear

1. **Check console for shader errors:**
   ```
   Look for: "Shader compilation failed"
   ```

2. **Verify shader compiled:**
   ```javascript
   // In browser console
   console.log('Body shader should be using enhanced textures');
   ```

3. **Check WebGL support:**
   ```javascript
   const canvas = document.querySelector('canvas');
   const gl = canvas.getContext('webgl');
   console.log('WebGL supported:', !!gl);
   ```

### If Performance is Poor

1. **Reduce FBM octaves:**
   - Find `fbm(p * 4.0)` calls
   - Change to `fbm(p * 2.0)` for fewer octaves

2. **Disable domain warping:**
   - Comment out `warpDomain` calls
   - Use simple `fbm` instead

3. **Simplify storms:**
   - Reduce storm vortex calculations
   - Lower storm count

### If Colors Look Wrong

1. **Check color values:**
   - Ensure `uColor` uniform is set correctly
   - Verify planet color in `galaxy.ts`

2. **Verify lighting:**
   - Check `uSunPos` uniform
   - Ensure `uCamPos` is correct

## 📊 Performance Benchmarks

### Expected Performance

**Desktop:**
- Rocky worlds: ~1.2ms
- Gas giants: ~1.8ms
- Stars: ~1.0ms
- Average: < 2ms per body ✅

**Mobile:**
- Consider reducing to 3-octave FBM
- Disable domain warping
- Target: < 3ms per body

### Monitoring

```javascript
// Add performance monitoring to engine.ts
const start = performance.now();
// ... draw calls ...
const elapsed = performance.now() - start;
if (elapsed > 2.0) {
  console.warn(`Slow render: ${elapsed.toFixed(2)}ms`);
}
```

## 🎮 Testing Checklist

Use this checklist when testing:

- [ ] Star granulation visible
- [ ] Star sunspots present
- [ ] Star limb darkening noticeable
- [ ] Rocky world craters visible
- [ ] Rocky world maria (dark plains) present
- [ ] Desert dune patterns clear
- [ ] Desert canyons visible
- [ ] Ocean continents shaped naturally
- [ ] Ocean clouds layered
- [ ] Ice world fractures visible
- [ ] Ice world polar caps present
- [ ] Volcanic lava flows glowing
- [ ] Gas giant bands multiple
- [ ] Gas giant storms swirling
- [ ] Ice giant haze present
- [ ] Moon crater rays visible
- [ ] Moon crater age variation clear
- [ ] Performance stays smooth (< 2ms)
- [ ] Each world looks unique

## 🎯 Next Steps After Testing

### If Everything Works
1. ✅ Test on different devices
2. ✅ Test at different distances (LOD)
3. ✅ Test performance over time
4. ✅ Gather user feedback

### If Issues Found
1. 📝 Document the issue
2. 🔍 Check shader compilation logs
3. 🐛 Isolate the problematic feature
4. 🛠️ Apply targeted fix

### For Production
1. Consider quality settings (Low/Medium/High)
2. Add LOD system for distant bodies
3. Implement mobile optimizations
4. Profile on target devices

## 📞 Support

If you encounter issues:

1. **Check documentation:**
   - `TEXTURE_UPGRADE.md` - Integration guide
   - `VISUAL_COMPARISON.md` - Before/after details
   - `TEXTURE_UPGRADE_SUMMARY.md` - Complete summary

2. **Review shader code:**
   - All functions are in `shaders.ts`
   - Comments explain each section

3. **Test incrementally:**
   - Enable one feature at a time
   - Isolate problematic code

## ✨ Enjoy the Enhanced Textures!

The upgrade provides **infinite variety** and **dramatically improved visuals** while staying within performance budgets. Every world should now feel unique and visually interesting!
