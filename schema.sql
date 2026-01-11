-- The Docket V2 Schema: Context-Based Architecture
-- Replaces rigid folder/note structure with a flexible graph of Pages and Items.

-- WARNING: This resets the schema for V2. Drops existing tables.
DROP TABLE IF EXISTS page_items CASCADE;
DROP TABLE IF EXISTS pages CASCADE;
DROP TABLE IF EXISTS tasks CASCADE;
DROP TABLE IF EXISTS folders CASCADE;
DROP TABLE IF EXISTS notes CASCADE;

-- 1. Pages
-- Replaces 'notes' and 'folders'. usage: A page can be a "folder" just by having other pages on it.
CREATE TABLE pages (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  content JSONB, -- Rich text content (TipTap JSON)
  is_favorite BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 2. Tasks
-- Standalone items. Context is derived from where they are placed (PageItems).
CREATE TABLE tasks (
  id SERIAL PRIMARY KEY,
  content TEXT NOT NULL,
  status VARCHAR(50) DEFAULT 'todo', -- todo, in_progress, done, cancelled
  due_date TIMESTAMP,
  recurrence_rule JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 3. PageItems (The Context Graph)
-- Defines the relationship "Item X appears on Page Y".
CREATE TABLE page_items (
  id SERIAL PRIMARY KEY,
  page_id INTEGER REFERENCES pages(id) ON DELETE CASCADE, -- The parent context
  
  -- The item being placed (Polymorphic-ish relationship)
  -- Only one of these should be set.
  child_page_id INTEGER REFERENCES pages(id) ON DELETE CASCADE,
  child_task_id INTEGER REFERENCES tasks(id) ON DELETE CASCADE,
  
  -- Metadata for the placement
  position INTEGER NOT NULL DEFAULT 0, -- Ordering within the page
  display_mode VARCHAR(50) DEFAULT 'reference', -- 'reference' (link), 'embed' (transclusion)
  
  created_at TIMESTAMP DEFAULT NOW(),
  
  CONSTRAINT check_item_type CHECK (
    (child_page_id IS NOT NULL AND child_task_id IS NULL) OR
    (child_page_id IS NULL AND child_task_id IS NOT NULL)
  )
);

-- Indexes for graph traversal performance
CREATE INDEX idx_page_items_page_id ON page_items(page_id);
CREATE INDEX idx_page_items_child_page_id ON page_items(child_page_id);
CREATE INDEX idx_page_items_child_task_id ON page_items(child_task_id);
CREATE INDEX idx_tasks_due_date ON tasks(due_date);
CREATE INDEX idx_pages_updated_at ON pages(updated_at);