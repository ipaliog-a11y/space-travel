# Starwake - Space Flight Simulator

[![Play Now](https://img.shields.io/badge/Play-Now-blue?style=for-the-badge)](https://ipaliog-a11y.github.io/space-travel/)

**A browser-based intergalactic spaceship flight simulator**

Experience the feel of flying through deep space and hyperspace with realistic Newtonian physics, multiple ship variants, and a stunning procedural starfield.

![Starwake Screenshot](screenshot.png)

## 🎮 Play Now

**→ [Click here to play in your browser](https://ipaliog-a11y.github.io/space-travel/)**

No installation required! Works on Chrome, Firefox, and Edge.

## Latest Grok Build (current)

The live Grok Build app is snapshotted in [`app/`](app/). It is ahead of the Pages prototype:

- Kepler galaxy, planet types, moons, belts, comets, nebulae
- Courier / Hauler hangar, loadouts, jobs, surveys, T1 fuel
- 10-bay docking at orbital locks
- Five station models: Stanford wheel, O'Neill cylinder, Bernal habitat, truss array, drydock yard

```bash
cd app && npm install && npm run dev
```

See [`app/README.md`](app/README.md) and [`docs/STATION_MODELS.md`](docs/STATION_MODELS.md).

## 🎯 Quick Start

### Controls

**Keyboard:**
- **W/S or ↑/↓** - Pitch up/down
- **A/D or ←/→** - Yaw left/right
- **Space or Shift** - Boost (FSD hyperspace)
- **0-9** - Throttle 0-100%
- **M** - Mute audio
- **H** - Toggle HUD
- **G** - Gyro assist (if available)
- **R** - Toggle hyperspace rings
- **I** - Invert look

**Mouse/Touch:**
- **Left Stick** - Ship steering (drag to move)
- **Right Throttle** - Speed control (drag up/down)
- **Drag Screen** - Look around (head look)
- **Boost Button** - Hold for hyperspace

## 🚀 Features

- **Realistic Space Flight** - Newtonian physics with momentum and drift
- **Multiple Ships** - 5 unique ships with different handling characteristics
- **Procedural Starfield** - Thousands of instanced stars with parallax
- **Hyperspace Travel** - Charge FSD, jump between systems, drop in-system
- **Dynamic Audio** - Procedural engine and FSD sounds (Elite-inspired)
- **Mobile Friendly** - Touch controls and responsive design
- **Flight Assist** - Toggle between accessible and realistic flight modes

## 🛠️ Technical Details

**Stack:**
- Vanilla WebGL (no frameworks)
- Procedural audio with Web Audio API
- Instanced rendering for performance
- Touch-friendly mobile controls

**Performance:**
- 60 FPS target on mid-range devices
- Device pixel ratio capping (1.4 mobile, 1.75 desktop)
- Configurable star density (800-12,000 stars)
- ANGLE_instanced_arrays for efficient rendering

## 📖 Documentation

- **[Physics Analysis](docs/PHYSICS_ANALYSIS.md)** - Technical deep-dive into flight model
- **[Architecture](docs/ARCHITECTURE.md)** - Project structure and design
- **[Ship Variants](docs/SHIP_VARIANTS.md)** - Ship specifications and balance
- **[Prototype Notes](docs/PROTOTYPE_NOTES.md)** - Feature checklist
- **[Grok Build Brief](docs/GROK_BUILD_BRIEF.md)** - Development roadmap

## 🎯 Ship Variants

| Ship | Role | Mass | Agility | Fuel Tank |
|------|------|------|---------|-----------|
| **Courier** | Fast light | 2,500 kg | High | Small |
| **Hauler** | Slow heavy | 12,000 kg | Low | Large |
| **Scout** | Explorer | 4,000 kg | Balanced | Medium |
| **Interceptor** | Agile fighter | 3,000 kg | Very High | Small |
| **Liner** | Stable cruiser | 8,000 kg | Medium | Medium |

Each ship has unique:
- Mass and moment of inertia
- Engine thrust and acceleration
- RCS (Reaction Control System) power
- Fuel capacity and efficiency
- Audio characteristics

## 🎮 Gameplay Tips

### Getting Started
1. Click **"Engage"** to start (unlocks audio)
2. Set throttle to 40-60% for cruising
3. Use left stick or WASD to steer
4. Drag screen to look around

### Hyperspace Jump
1. Hold **Boost** (Space) to charge FSD
2. Starfield transforms into tunnel
3. Release to drop out of hyperspace
4. FSD has cooldown after each jump

### Advanced Techniques
- **Drift braking**: Flip 180° and burn retro thrusters
- **Lateral dodge**: Use strafe thrusters (Q/E keys)
- **Precision approach**: Use small throttle adjustments
- **Fuel management**: Don't burn at 100% constantly

## 🔧 Development

### Running Locally

```bash
# Clone the repository
git clone https://github.com/ipaliog-a11y/space-travel.git
cd space-travel

# Open in browser
# Option 1: Use a local server (recommended)
npx http-server -p 8080
# Then visit: http://localhost:8080/starwake.html

# Option 2: Use Python
python -m http.server 8080
# Then visit: http://localhost:8080/starwake.html

# Option 3: Use VS Code Live Server extension
```

### Browser Requirements

**Required:**
- WebGL 2.0 support
- Web Audio API
- ES6 JavaScript

**Recommended:**
- Chrome 90+ or Firefox 88+
- ANGLE_instanced_arrays extension
- Touch device for mobile controls

**Not Supported:**
- Internet Explorer
- Old Android browsers without WebGL

### Building for Production

The game is a single HTML file - no build step required!

To deploy:
1. Upload `starwake.html` to any web server
2. Ensure proper MIME types for `.html` and `.js`
3. Enable HTTPS for audio context (required on some browsers)

## 🐛 Known Issues

- **iOS Safari**: Audio may require user interaction first (click Engage)
- **Android Chrome**: Don't open as file download - use Chrome browser
- **Low-end devices**: Reduce star density in settings panel
- **Firefox**: Some visual effects may differ slightly

## 📝 Roadmap

### Phase 1: Core Physics ✅
- [x] Newtonian translation (momentum)
- [x] Rotational physics (angular velocity)
- [x] Flight assist toggle
- [ ] Ship variant selection

### Phase 2: Enhanced Features
- [ ] 6DOF thruster controls
- [ ] Fuel consumption during flight
- [ ] Delta-V readout
- [ ] Map system with jump targeting

### Phase 3: Advanced
- [ ] Orbital mechanics
- [ ] Gravity wells
- [ ] Docking mechanics
- [ ] Mission system

## 🤝 Contributing

This is a private project, but feel free to:
- Report bugs
- Suggest features
- Share your flight recordings

## 📄 License

Private project - All rights reserved

## 🙏 Acknowledgments

- **Elite Dangerous** - Inspiration for FSD audio and hyperspace feel
- **Kerbal Space Program** - Orbital mechanics inspiration
- **EVE Online** - Sub-light inertia model

---

**Built with ❤️ and WebGL**

[Play Now](https://ipaliog-a11y.github.io/space-travel/) | [View Source](https://github.com/ipaliog-a11y/space-travel) | [Report Issue](https://github.com/ipaliog-a11y/space-travel/issues)
