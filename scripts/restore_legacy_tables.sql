-- Restore Legacy Tables for V1 API Compatibility

-- 1. Folders
CREATE TABLE IF NOT EXISTS folders (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  parent_id INTEGER REFERENCES folders(id),
  created_at TIMESTAMP DEFAULT NOW()
);

-- 2. Notes
CREATE TABLE IF NOT EXISTS notes (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  content TEXT,
  folder_id INTEGER REFERENCES folders(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 3. Update Tasks for Backward Compatibility
-- Add columns expected by V1 API if they don't exist

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tasks' AND column_name='source_note_id') THEN
        ALTER TABLE tasks ADD COLUMN source_note_id INTEGER REFERENCES notes(id) ON DELETE SET NULL;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tasks' AND column_name='completed') THEN
        ALTER TABLE tasks ADD COLUMN completed BOOLEAN DEFAULT FALSE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tasks' AND column_name='completed_at') THEN
        ALTER TABLE tasks ADD COLUMN completed_at TIMESTAMP;
    END IF;
END $$;
