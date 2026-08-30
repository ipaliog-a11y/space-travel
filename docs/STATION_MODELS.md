# Station models (Grok Build)

Synced from the live Starwake app. Ports are no longer a hub-and-dots cluster. Each lock is a real architecture, with the **same 10-bay docking ring** (approach, lock, undock unchanged).

| Kind | Name in-game | Architecture | Typical host |
|------|----------------|--------------|--------------|
| `wheel` | Ring / Lock | Stanford torus — spin habitat, spokes, rim bays, solar wings | Inner rocky / ocean |
| `cylinder` | High / Drum | O'Neill cylinder — long drum, waist collar, end caps | Gas / ice giants |
| `sphere` | Port / Hab | Bernal sphere — Island One shell, equatorial docks, radiator vanes | Ice / research |
| `truss` | Array / Truss | ISS-style spine, box modules, solar arrays | Desert / volcanic |
| `yard` | Yard / Dock | Open drydock cage, hangar slots, cranes | Industrial |

Helios showcases the three NASA habitats in one system: **Helios I Lock** (wheel), **Helios II Drum** (cylinder), **Helios III Hab** (sphere). Truss and yard appear on other systems.

## Code

- Layouts and hull/solar/dock/radiator shaders: `src/lib/starwake/station-mesh.ts`
- Frame, gates, proximity: `src/lib/starwake/stations.ts`
- Draw + LOD: `src/lib/starwake/engine.ts` (`drawStation`)
- Kind assignment: `src/lib/starwake/galaxy.ts` (`makeStations`)
