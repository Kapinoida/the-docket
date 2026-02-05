-- The Docket V2 Schema: Context-Based Architecture (Hybrid Codebase Support)
-- Restores 'folders' and 'folder_id' required by current implementation.

DROP TABLE IF EXISTS task_sync_meta CASCADE;
DROP TABLE IF EXISTS caldav_configs CASCADE;
DROP TABLE IF EXISTS page_items CASCADE;
DROP TABLE IF EXISTS pages CASCADE;
DROP TABLE IF EXISTS tasks CASCADE;
DROP TABLE IF EXISTS folders CASCADE;
DROP TABLE IF EXISTS notes CASCADE;

-- 0. Folders (Required by current FolderTree/DB access)
CREATE TABLE folders (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  parent_id INTEGER REFERENCES folders(id),
  created_at TIMESTAMP DEFAULT NOW()
);

-- 1. Pages
-- Replaces 'notes' and 'folders' concept but linked to legacy folders for now.
CREATE TABLE pages (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  content JSONB, -- Rich text content (TipTap JSON)
  is_favorite BOOLEAN DEFAULT FALSE,
  folder_id INTEGER REFERENCES folders(id), -- Required by current db.ts
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 2. Tasks
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
CREATE TABLE page_items (
  id SERIAL PRIMARY KEY,
  page_id INTEGER REFERENCES pages(id) ON DELETE CASCADE,
  
  child_page_id INTEGER REFERENCES pages(id) ON DELETE CASCADE,
  child_task_id INTEGER REFERENCES tasks(id) ON DELETE CASCADE,
  
  position INTEGER NOT NULL DEFAULT 0,
  display_mode VARCHAR(50) DEFAULT 'reference',
  
  created_at TIMESTAMP DEFAULT NOW(),
  
  CONSTRAINT check_item_type CHECK (
    (child_page_id IS NOT NULL AND child_task_id IS NULL) OR
    (child_page_id IS NULL AND child_task_id IS NOT NULL)
  )
);

-- Indexes
CREATE INDEX idx_page_items_page_id ON page_items(page_id);
CREATE INDEX idx_page_items_child_page_id ON page_items(child_page_id);
CREATE INDEX idx_page_items_child_task_id ON page_items(child_task_id);
CREATE INDEX idx_tasks_due_date ON tasks(due_date);
CREATE INDEX idx_pages_updated_at ON pages(updated_at);

-- 4. CalDAV Integration
CREATE TABLE caldav_configs (
  id SERIAL PRIMARY KEY,
  server_url TEXT NOT NULL,
  username TEXT NOT NULL,
  password TEXT NOT NULL,
  calendar_url TEXT, -- Full URL to the specific calendar
  name VARCHAR(255),
  resource_type VARCHAR(50) DEFAULT 'task_list',
  enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE task_sync_meta (
  task_id INTEGER PRIMARY KEY REFERENCES tasks(id) ON DELETE CASCADE,
  caldav_uid TEXT NOT NULL,
  caldav_etag TEXT,
  last_synced_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_task_sync_meta_caldav_uid ON task_sync_meta(caldav_uid);

CREATE TABLE deleted_task_sync_log (
  id SERIAL PRIMARY KEY,
  caldav_uid TEXT NOT NULL,
  deleted_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_deleted_task_log_uid ON deleted_task_sync_log(caldav_uid);

-- 5. Tags (Added 2026-01-20)
CREATE TABLE tags (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) UNIQUE NOT NULL,
  color VARCHAR(20) DEFAULT 'blue',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE tag_assignments (
  id SERIAL PRIMARY KEY,
  tag_id INTEGER REFERENCES tags(id) ON DELETE CASCADE,
  item_id INTEGER NOT NULL,
  item_type VARCHAR(20) NOT NULL CHECK (item_type IN ('page', 'task')),
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(tag_id, item_id, item_type)
);

CREATE INDEX idx_tag_assignments_item ON tag_assignments(item_id, item_type);
CREATE INDEX idx_tag_assignments_tag ON tag_assignments(tag_id);