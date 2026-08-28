-- Cruise/boost wear is fractional (0.1 points per minute). INT stored 0.
ALTER TABLE player_ships
  ALTER COLUMN wear_points TYPE NUMERIC(8,3)
  USING wear_points::numeric;
