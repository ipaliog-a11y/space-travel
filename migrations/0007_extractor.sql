-- Extractor hull (BUILD 8). Planet mining on hub-less worlds (BUILD 9).
ALTER TYPE ship_type ADD VALUE IF NOT EXISTS 'extractor';

CREATE OR REPLACE FUNCTION get_base_wear_pool(ship ship_type)
RETURNS INT AS $$
BEGIN
  RETURN CASE ship
    WHEN 'courier' THEN 90
    WHEN 'hauler' THEN 120
    WHEN 'scout' THEN 95
    WHEN 'clipper' THEN 90
    WHEN 'tender' THEN 115
    WHEN 'tug' THEN 100
    WHEN 'extractor' THEN 110
    ELSE 100
  END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;
