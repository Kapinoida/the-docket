-- Up migration
-- Adds optional next_action column to tasks for planning-context support.
-- next_action is the next physical step for a task; null = not yet clarified.

ALTER TABLE tasks ADD COLUMN IF NOT EXISTS next_action TEXT;

-- Down migration
-- ALTER TABLE tasks DROP COLUMN IF EXISTS next_action;
