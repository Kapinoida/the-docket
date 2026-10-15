-- Up migration
-- Change series_position from INTEGER to REAL to support fractional positions from Calibre
-- (e.g., book 1.5 in a series)

ALTER TABLE media_items 
  ALTER COLUMN series_position TYPE REAL 
  USING series_position::REAL;

COMMENT ON COLUMN media_items.series_position IS 'Book position in series, can be fractional (e.g., 1.5)';

-- Down migration
-- ALTER TABLE media_items 
--   ALTER COLUMN series_position TYPE INTEGER 
--   USING series_position::INTEGER;
