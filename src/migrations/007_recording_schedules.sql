-- Up migration
-- Recording Schedule Module — Core Schema
-- Manages sports/TV recording schedules for the SmartiFlix IPTV pipeline

CREATE OR REPLACE FUNCTION update_recording_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TABLE IF NOT EXISTS recording_schedules (
    id              SERIAL PRIMARY KEY,
    stream_id       TEXT NOT NULL,
    title           TEXT NOT NULL,
    league          TEXT,
    channel_name    TEXT,
    start_time      TIMESTAMPTZ NOT NULL,
    end_time        TIMESTAMPTZ NOT NULL,
    status          TEXT NOT NULL DEFAULT 'pending'
                    CHECK (status IN (
                        'pending',
                        'scheduled',
                        'recording',
                        'completed',
                        'failed',
                        'cancelled'
                    )),
    source          TEXT NOT NULL DEFAULT 'fixture'
                    CHECK (source IN ('fixture', 'manual', 'replay')),
    output_path     TEXT,
    file_size_bytes BIGINT CHECK (file_size_bytes IS NULL OR file_size_bytes >= 0),
    error_message   TEXT,
    metadata        JSONB DEFAULT '{}',
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT end_after_start CHECK (end_time > start_time)
);

CREATE TRIGGER trg_recording_schedules_updated_at
    BEFORE UPDATE ON recording_schedules
    FOR EACH ROW
    EXECUTE FUNCTION update_recording_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_recordings_time ON recording_schedules(start_time, end_time);
CREATE INDEX IF NOT EXISTS idx_recordings_status ON recording_schedules(status, start_time);
CREATE INDEX IF NOT EXISTS idx_recordings_league ON recording_schedules(league);
CREATE UNIQUE INDEX IF NOT EXISTS idx_recordings_unique ON recording_schedules(stream_id, start_time);

-- Down migration
DROP TRIGGER IF EXISTS trg_recording_schedules_updated_at ON recording_schedules;
DROP FUNCTION IF EXISTS update_recording_updated_at_column();
DROP TABLE IF EXISTS recording_schedules;
