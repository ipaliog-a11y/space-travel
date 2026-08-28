# Starwake — build list

Intergalactic flight sim. **Slice 1 is in progress.** Later slices stay listed here so they are not lost.

## Slice 1 (now)

- Port prototype starfield, stick / throttle / look, procedural audio
- Two ships: Courier, Hauler (handling only)
- Local **boost** = in-system hops (no tunnel)
- Compact system: sun in frame + seeded planet spheres (no landings)
- **Jump** = lock a star first, then charge → tunnel → drop
- Jump from galaxy map or in-flight Jump once locked
- Maps: **System** (planets) and **Galaxy** (stars). Intergalactic held
- Thin chrome only (gate, sticks, map, jump, lock line)

## Next (live loop)

Do these after the Week 1 hangar / haul loop holds in play. Do not start Week 2 commodities until these land.

### Save state slots
One persist blob (`starwake-v2`) today. Add named save slots (at least 3) on Gate / Options: New, Continue into a slot, copy, delete. Each slot keeps ship, fuel, board, diary, hangar, and credits. Active slot is the one Play writes.

### T2 fuel for jumps
T1 stays in-system (cruise / boost). Add a second tank, **T2**, spent on FSD charge and each interstellar hop. Jump range + lock stay gated by T2 remaining. HUD shows T1 and T2. Courier: small T2, sips T1. Hauler: fat T2, hungry T1.

### Resource fuel prices
Station Refuel is free today. Price T1 and T2 at the lock (credits per unit). Hub boards already pay; fuel spend should come out of those earnings. Scoop / orbital refill can wait.

## Later

### Planet types
Taxonomy beyond colored spheres: rocky, desert, ocean, ice, gas giant, volcanic, ringed. Drives look, approach distance, and later mission tags. No landings.

### Objects and materials to transfer
Courier / hauler cargo: packets, ore, water ice, rare metals, biologics, machine parts. Transfer is proximity at a planet (orbital drop), not a landing. Feeds garage unlocks — still no cash shop.

### Fuel economy (2 types)
Two tanks, not one:

1. **T2 / jump fuel** — spent on FSD charge and interstellar jump. Range + lock gated by this.
2. **T1 / reaction mass** — spent on in-system cruise and boost.

Courier: small jump tank, sips boost. Hauler: fat jump tank, hungry boost. Hub prices first; star scoop later.

## Later

| Slice | What |
|-------|------|
| 2 | Garage + loadout unlocks (no prices) |
| 3 | Courier and hauler jobs |
| 4 | HUD polish |
| — | Intergalactic map |
| — | Credits / economy |
| — | Combat |
| — | Android wrap (Capacitor / Play) — keep WebGL1 + touch-first |

## Non-goals (until named)

Station interiors, planet landings, 6DOF, multiplayer.
