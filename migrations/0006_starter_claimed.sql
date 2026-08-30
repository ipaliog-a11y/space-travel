-- Free starter hull is once per account. Selling the last bay does not refund the claim.

ALTER TABLE players
  ADD COLUMN IF NOT EXISTS starter_claimed BOOLEAN DEFAULT false;

UPDATE players
SET starter_claimed = true
WHERE id IN (SELECT DISTINCT player_id FROM player_ships);

COMMENT ON COLUMN players.starter_claimed IS 'True after the free Courier / Hauler / Scout pick';
