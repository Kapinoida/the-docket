
-- Add rrule column to calendar_events table
ALTER TABLE calendar_events ADD COLUMN IF NOT EXISTS rrule TEXT;
