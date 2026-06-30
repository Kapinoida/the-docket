-- Up migration
CREATE INDEX IF NOT EXISTS idx_tasks_updated_at ON tasks(updated_at);

-- Down migration
DROP INDEX IF EXISTS idx_tasks_updated_at;