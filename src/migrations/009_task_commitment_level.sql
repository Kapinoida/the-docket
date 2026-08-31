-- Up migration
-- Adds optional commitment_level column to tasks for Must/Should/Could planning.
-- commitment_level is NULL by default (unassigned); valid values are 'must', 'should', 'could'.

ALTER TABLE tasks ADD COLUMN IF NOT EXISTS commitment_level VARCHAR(10);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_tasks_commitment_level'
  ) THEN
    ALTER TABLE tasks
      ADD CONSTRAINT chk_tasks_commitment_level
      CHECK (commitment_level IS NULL OR commitment_level IN ('must', 'should', 'could'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_tasks_commitment_level ON tasks(commitment_level);

-- Down migration
-- DROP INDEX IF EXISTS idx_tasks_commitment_level;
-- ALTER TABLE tasks DROP CONSTRAINT IF EXISTS chk_tasks_commitment_level;
-- ALTER TABLE tasks DROP COLUMN IF EXISTS commitment_level;
