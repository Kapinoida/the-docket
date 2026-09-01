-- Up migration
-- Add waiting and someday status support with metadata columns.
-- waiting_on: who/what we're waiting on
-- waiting_since: when the waiting started
-- follow_up_date: when to check back

ALTER TABLE tasks ADD COLUMN IF NOT EXISTS waiting_on TEXT;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS waiting_since TIMESTAMP;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS follow_up_date TIMESTAMP;

-- Down migration
-- ALTER TABLE tasks DROP COLUMN IF EXISTS waiting_on;
-- ALTER TABLE tasks DROP COLUMN IF EXISTS waiting_since;
-- ALTER TABLE tasks DROP COLUMN IF EXISTS follow_up_date;
