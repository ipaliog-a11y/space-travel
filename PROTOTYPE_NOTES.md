# Prototype notes (`prototype/starwake.html`)

Single-file vanilla WebGL app. **Open in Chrome** after download (Engage is wired early for mobile).

## Implemented features

### Visual
- Instanced streak stars (thin 0.9–1.6 px), additive blend
- Density-aware alpha + soft luminance clamp (no white-out)
- Dust point layer + procedural nebula sphere
- Hyperspace DOM rings (toggle)
- Boost FOV punch + flash vignette
- Continuous **depth parallax**, **lateral stick parallax**, **boost collapse**
- Distance readout (game-scale ly)

### Controls
- Left **virtual stick** → ship pitch/yaw (not look)
- Right **throttle** 0–100% (full stop allowed)
- **Drag screen** → head look (recenters slowly); independent of flight path
- Keyboard WASD/arrows, Space/Shift boost
- Gyro assist (permission on iOS) when stick idle
- Invert look, mute, HUD collapse, rings toggle

### Audio (procedural, Elite-inspired — not game assets)
- Cruise engine + airflow layers
- FSD engage: charge chirps + spool noise + sub thump
- Hyperspace tunnel bed while boosting
- Drop: collapse whoosh + descending arrival tone
- Boost spools in slightly slower so charge audio reads

### Performance
- DPR cap mobile 1.4 / desktop 1.75
- Active star count from density slider (800–12000)
- `ANGLE_instanced_arrays` for streaks

## Port priorities

1. Star wrap with depth/lateral/collapse  
2. Stick / throttle / look input model  
3. FSD audio state on boost edges  
4. Shader anti-whiteout constants  
5. Then map/jump/ship defs on top  

## Known constraints

- No true 6DOF; camera-forward flight with bank  
- No physical assets; all generative  
- Android: open HTML via Chrome, not in-app preview only  
