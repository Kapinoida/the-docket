-- The Docket Database Schema
-- Phase 1: MVP Schema with future-proofing for recurrence

-- Core folder structure with nesting support
CREATE TABLE folders (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  parent_id INTEGER REFERENCES folders(id),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Notes with rich text content
CREATE TABLE notes (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  content TEXT,  -- Will store rich text/markdown
  folder_id INTEGER REFERENCES folders(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Tasks with future-proof structure
CREATE TABLE tasks (
  id SERIAL PRIMARY KEY,
  content TEXT NOT NULL,
  due_date TIMESTAMP,
  recurrence_rule JSONB,  -- Future: {type: 'weekly', interval: 2, day: 'monday'}
  source_note_id INTEGER REFERENCES notes(id),  -- nullable, provides context
  completed BOOLEAN DEFAULT FALSE,  -- Phase 1: simple boolean, Phase 2: move to instances
  completed_at TIMESTAMP,  -- Phase 1: timestamp, Phase 2: move to instances
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_folders_parent_id ON folders(parent_id);
CREATE INDEX idx_notes_folder_id ON notes(folder_id);
CREATE INDEX idx_tasks_source_note_id ON tasks(source_note_id);
CREATE INDEX idx_tasks_due_date ON tasks(due_date);
CREATE INDEX idx_tasks_completed ON tasks(completed);

-- Insert default folder
INSERT INTO folders (name, parent_id) VALUES ('Home', NULL);