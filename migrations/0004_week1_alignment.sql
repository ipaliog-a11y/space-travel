-- Week 1 alignment: auth ids are TEXT (e.g. "dev-user"), not UUID.
-- Additive so databases that already applied 0001–0003 still migrate.

ALTER TABLE player_ships DROP CONSTRAINT IF EXISTS player_ships_player_id_fk;

ALTER TABLE players ALTER COLUMN id DROP DEFAULT;
ALTER TABLE players ALTER COLUMN id TYPE TEXT USING id::text;

ALTER TABLE player_ships ALTER COLUMN player_id TYPE TEXT USING player_id::text;

ALTER TABLE player_ships
  ADD CONSTRAINT player_ships_player_id_fk
  FOREIGN KEY (player_id) REFERENCES players(id);

ALTER TABLE players
  ADD COLUMN IF NOT EXISTS hangar_bonus_slots INT DEFAULT 0;

ALTER TABLE players DROP CONSTRAINT IF EXISTS players_hangar_bonus_slots_check;
ALTER TABLE players
  ADD CONSTRAINT players_hangar_bonus_slots_check CHECK (hangar_bonus_slots >= 0);
