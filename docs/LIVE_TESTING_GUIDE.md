# Live Testing Guide - Ship Ownership

## Quick Start Testing

### **Option A: Automated Test Script** (Recommended)

1. **Make sure database is running**
   - Check if you have PostgreSQL or PGLite configured
   - Database should be accessible

2. **Run the test script**
   ```bash
   cd space-travel
   node --experimental-strip-types test-ship-ownership.ts
   ```

3. **Expected Output:**
   ```
   🧪 Ship Ownership Live Test
   
   Player ID: test-player-1756329600000
   ---
   
   📦 Test 1: Acquire Courier
   ✅ Acquired Courier: [uuid]
      Wear Points: 0
      Hardpoint: stock
      Max Wear Pool: 90
   
   ✈️ Test 3: Add Wear Through Activities
   After 10 min flight: 1 wear points
      Tier: excellent
      Penalty: 0%
   
   ... (more tests)
   
   ✅ All tests completed successfully!
   ```

---

### **Option B: Manual Testing via Browser** (If UI exists)

If you have a UI or admin panel:

1. **Start the dev server**
   ```bash
   npm run dev
   ```

2. **Open browser** → `http://localhost:8080`

3. **Test scenarios:**
   - Navigate to hangar/shop
   - Purchase a Courier ship
   - Check ship details show 0 wear
   - Go on a flight (10 minutes)
   - Return and check wear increased
   - Visit station and repair
   - Verify wear decreased

---

### **Option C: Database Direct Query** (For verification)

If you want to verify the database directly:

```sql
-- Check player ships
SELECT 
  ship_type,
  wear_points,
  hardpoint_tier,
  purchased_at
FROM player_ships
WHERE player_id = 'your-test-player-id';

-- Check wear calculation functions
SELECT 
  get_base_wear_pool('courier') as courier_pool,
  get_base_wear_pool('hauler') as hauler_pool,
  get_hardpoint_bonus('mk1') as mk1_bonus,
  get_hardpoint_bonus('mk3') as mk3_bonus;
```

---

## What to Test

### **Core Functions:**

1. **Ship Purchase** ✅
   - Can you buy a ship?
   - Does it appear in your ships list?
   - Does it start with 0 wear?

2. **Wear Accumulation** ✅
   - Does wear increase during flight?
   - Does boosting add more wear?
   - Do jumps add wear?

3. **Wear Tiers** ✅
   - At 20% wear → "Excellent" tier
   - At 40% wear → "Good" tier (-5% penalty)
   - At 60% wear → "Fair" tier (-10% penalty)
   - At 80% wear → "Poor" tier (-15% penalty)
   - At 100% wear → "Critical" tier (-25% penalty)

4. **Repairs** ✅
   - Can you repair wear?
   - Does repair reduce wear points?
   - Does tier improve after repair?

5. **Hardpoint Upgrades** ✅
   - Can you upgrade from stock → mk1?
   - Does mk1 add +10 wear pool?
   - Does mk2 add +20 wear pool?
   - Does mk3 add +30 wear pool?

6. **Resale Value** ✅
   - New ship (0 wear) → 70% of value
   - 50% worn ship → ~56% of value
   - Max wear ship → minimum 10% of value

---

## Expected Results

### **Wear Rates:**
| Activity | Wear Added |
|----------|------------|
| 10 min normal flight | +1.0 points |
| 10 min boosting | +3.0 points |
| 1 hyperspace jump | +0.5 points |
| 1 docking | +1.0 points |
| Emergency landing | +5.0 points |

### **Wear Tiers (Courier example, 90 max):**
| Wear Points | Tier | Penalty |
|-------------|------|---------|
| 0-18 | Excellent | 0% |
| 19-36 | Good | -5% |
| 37-54 | Fair | -10% |
| 55-72 | Poor | -15% |
| 73-90 | Critical | -25% |

### **Resale Examples (100k ship):**
| Wear % | Resale Value | Return |
|--------|--------------|--------|
| 0% | 70,000 | 70% |
| 25% | 63,000 | 63% |
| 50% | 56,000 | 56% |
| 75% | 49,000 | 49% |
| 100% | 42,000 | 42% |
| Max worn | 10,000 (floor) | 10% |

---

## Common Issues & Solutions

### **Issue: "Cannot find module"**
**Solution:** Make sure you're using `.ts` extension in imports:
```typescript
import { ... } from './types.ts';  // ✅ Correct
import { ... } from './types';     // ❌ Wrong
```

### **Issue: "Database not found"**
**Solution:** Run the migration first:
```bash
node scripts/migrate.mjs
```

### **Issue: "Player already owns this ship"**
**Solution:** This is correct! You can only own 1 of each ship type. Test with a different player ID or sell the existing ship first.

### **Issue: Wear not accumulating**
**Solution:** Check that you're calling `addWearForActivity` with correct parameters:
```typescript
// Time-based activities need duration
await addWearForActivity(shipId, 'normal_flight', 10); // 10 minutes

// Event-based activities don't
await addWearForActivity(shipId, 'hyperspace'); // 1 jump
```

---

## Feedback Questions

After testing, please answer:

1. **Wear Rates:** Do ships wear out too fast? Too slow?
2. **Penalties:** Does -25% at critical feel impactful?
3. **Resale:** Is 56% return on half-worn ship fair?
4. **Hardpoints:** Is +10 points per tier meaningful?
5. **Overall:** Does the system feel balanced?

---

## Next Steps

After testing:
1. Note any issues or imbalances
2. Adjust wear rates if needed
3. Tweak resale formula if too harsh/generous
4. Move to UI implementation (Day 2-3)

---

**Ready to test? Run the automated script first!** 🚀

```bash
node --experimental-strip-types test-ship-ownership.ts
```
