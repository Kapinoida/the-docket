-- Up migration
-- Adds optional end_time column to tasks for time-blocking support.
-- end_time is an absolute timestamp (same calendar day as due_date); null = point-in-time/all-day task.

ALTER TABLE tasks ADD COLUMN IF NOT EXISTS end_time TIMESTAMP;

-- end_time must be null when due_date is null, and must be on the same calendar day.
-- We enforce end_time > due_date at the app layer; a lighter check constraint
-- guards against end_time <= due_date at the DB level.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_tasks_end_time_after_due'
  ) THEN
    ALTER TABLE tasks
      ADD CONSTRAINT chk_tasks_end_time_after_due
      CHECK (end_time IS NULL OR (due_date IS NOT NULL AND end_time > due_date));
  END IF;
END $$;

-- Down migration
-- ALTER TABLE tasks DROP CONSTRAINT IF EXISTS chk_tasks_end_time_after_due;
-- ALTER TABLE tasks DROP COLUMN IF EXISTS end_time;