# Ship variants

## Types

```ts
export type ShipId =
  | 'courier'
  | 'hauler'
  | 'scout'
  | 'interceptor'
  | 'liner'

export type ShipDef = {
  id: ShipId
  name: string
  blurb: string
  mass: number          // relative 0.6–1.8
  turnRate: number      // rad/s scale ~0.6–1.4
  maxCruise: number     // world speed scale
  boostMul: number      // hyperspace speed multiplier
  fsdChargeSec: number  // time to full charge
  jumpRangeLy: number
  fuelCapacity: number
  fuelPerJump: number
  hull: number
  accent: string        // CSS color for HUD
  audioPitch: number    // 0.85–1.15 bias on FSD tones
}

export type ShipState = {
  fuel: number
  hull: number
  fsdCooldown: number     // seconds remaining
  throttle: number      // 0..1
}
```

## Catalog (v1 balances — tune in playtests)

| id | name | mass | turn | cruise | boostMul | charge s | range ly | fuel | per jump | hull |
|----|------|------|------|--------|----------|----------|----------|------|----------|------|
| courier | Courier | 0.7 | 1.35 | 1.15 | 2.6 | 1.4 | 12 | 40 | 8 | 60 |
| hauler | Hauler | 1.7 | 0.65 | 0.75 | 2.2 | 3.2 | 18 | 120 | 14 | 120 |
| scout | Scout | 1.0 | 1.0 | 1.0 | 2.8 | 2.0 | 28 | 70 | 10 | 80 |
| interceptor | Interceptor | 0.85 | 1.4 | 1.2 | 3.0 | 1.6 | 10 | 35 | 9 | 70 |
| liner | Liner | 1.3 | 0.85 | 0.9 | 2.4 | 2.4 | 16 | 90 | 11 | 100 |

## Flight integration

```ts
turn = baseTurn * def.turnRate * (1 - boostAmt * 0.2)
cruiseSpeed = def.maxCruise * throttle * BASE_SPEED
fsdChargeTime = def.fsdChargeSec
canJump = fuel >= def.fuelPerJump && distance <= def.jumpRangeLy && cooldown <= 0
```

## UI

- Gate: cards or list with name, blurb, 3 stat bars (agility, range, tank)
- In-flight: ship name + accent on wordmark
- Locked ship change while in hyperspace / charging
