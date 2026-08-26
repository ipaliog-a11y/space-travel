# Starwake — Grok Build snapshot

This folder is the current TanStack Start / WebGL build of Starwake (the live Grok Build app). The GitHub Pages prototype remains `../starwake.html`.

## What this snapshot includes

- Kepler galaxy, planet types, moons, belts, comets, nebulae
- Courier / Hauler hangar, loadouts, T1 fuel, jobs, surveys
- Docking at 10-bay orbital locks
- Five station architectures: Stanford wheel, O'Neill cylinder, Bernal habitat, truss array, drydock yard
- In-system boost / overdrive, FSD jump, system + galaxy maps

## Run (Node 22)

```bash
cd app
npm install
npm run dev
```

Play route is `/`. Auth and the database stay off unless you opt in.

`npm run build` must pass for deploy. The flight canvas is raw WebGL1 in `src/lib/starwake/engine.ts`.
