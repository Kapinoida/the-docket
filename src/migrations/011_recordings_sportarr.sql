-- Up migration
-- Recording Schedule Module — Sportarr integration
-- Adds stable Sportarr identity, expands source enum, and supports full sync updates

ALTER TABLE recording_schedules ADD COLUMN IF NOT EXISTS sportarr_id TEXT;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'recording_schedules_source_check'
          AND conrelid = 'recording_schedules'::regclass
    ) THEN
        RETURN;
    END IF;
    ALTER TABLE recording_schedules DROP CONSTRAINT recording_schedules_source_check;
    ALTER TABLE recording_schedules ADD CONSTRAINT recording_schedules_source_check
        CHECK (source IN ('fixture', 'manual', 'replay', 'sportarr'));
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_recordings_sportarr_id
    ON recording_schedules(sportarr_id)
    WHERE sportarr_id IS NOT NULL;

-- Down migration
DROP INDEX IF EXISTS idx_recordings_sportarr_id;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'recording_schedules_source_check'
          AND conrelid = 'recording_schedules'::regclass
    ) THEN
        ALTER TABLE recording_schedules DROP CONSTRAINT recording_schedules_source_check;
        ALTER TABLE recording_schedules ADD CONSTRAINT recording_schedules_source_check
            CHECK (source IN ('fixture', 'manual', 'replay'));
    END IF;
END $$;

ALTER TABLE recording_schedules DROP COLUMN IF EXISTS sportarr_id;
