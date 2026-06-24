-- Up migration
-- Baseline schema: captures the current production state of the Docket database.
-- All statements are idempotent (IF NOT EXISTS) so this is safe to run on
-- both fresh databases and existing ones with partial schema.

-- 0. Folders
CREATE TABLE IF NOT EXISTS folders (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  parent_id INTEGER REFERENCES folders(id),
  created_at TIMESTAMP DEFAULT NOW()
);

-- 1. Pages
CREATE TABLE IF NOT EXISTS pages (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  content JSONB,
  is_favorite BOOLEAN DEFAULT FALSE,
  folder_id INTEGER REFERENCES folders(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 2. Tasks
CREATE TABLE IF NOT EXISTS tasks (
  id SERIAL PRIMARY KEY,
  content TEXT NOT NULL,
  status VARCHAR(50) DEFAULT 'todo',
  due_date TIMESTAMP,
  recurrence_rule JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 3. Page Items (Context Graph)
CREATE TABLE IF NOT EXISTS page_items (
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

-- 4. CalDAV Integration
CREATE TABLE IF NOT EXISTS caldav_configs (
  id SERIAL PRIMARY KEY,
  server_url TEXT NOT NULL,
  username TEXT NOT NULL,
  password TEXT NOT NULL,
  calendar_url TEXT,
  name VARCHAR(255),
  resource_type VARCHAR(50) DEFAULT 'task_list',
  enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS task_sync_meta (
  task_id INTEGER PRIMARY KEY REFERENCES tasks(id) ON DELETE CASCADE,
  caldav_uid TEXT NOT NULL,
  caldav_etag TEXT,
  last_synced_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS deleted_task_sync_log (
  id SERIAL PRIMARY KEY,
  caldav_uid TEXT NOT NULL,
  deleted_at TIMESTAMP DEFAULT NOW()
);

-- 5. Tags
CREATE TABLE IF NOT EXISTS tags (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) UNIQUE NOT NULL,
  color VARCHAR(20) DEFAULT 'blue',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tag_assignments (
  id SERIAL PRIMARY KEY,
  tag_id INTEGER REFERENCES tags(id) ON DELETE CASCADE,
  item_id INTEGER NOT NULL,
  item_type VARCHAR(20) NOT NULL CHECK (item_type IN ('page', 'task')),
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(tag_id, item_id, item_type)
);

-- 6. Calendar Events
CREATE TABLE IF NOT EXISTS calendar_events (
  uid TEXT NOT NULL,
  calendar_id INTEGER REFERENCES caldav_configs(id) ON DELETE CASCADE,
  title TEXT,
  description TEXT,
  start_time TIMESTAMP WITH TIME ZONE,
  end_time TIMESTAMP WITH TIME ZONE,
  is_all_day BOOLEAN DEFAULT FALSE,
  location TEXT,
  status VARCHAR(50),
  etag TEXT,
  raw_data TEXT,
  rrule TEXT,
  last_synced_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (uid, calendar_id)
);

-- 7. Push Notifications
CREATE TABLE IF NOT EXISTS push_notifications (
  id SERIAL PRIMARY KEY,
  task_id INTEGER REFERENCES tasks(id) ON DELETE CASCADE,
  sent_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id SERIAL PRIMARY KEY,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_page_items_page_id ON page_items(page_id);
CREATE INDEX IF NOT EXISTS idx_page_items_child_page_id ON page_items(child_page_id);
CREATE INDEX IF NOT EXISTS idx_page_items_child_task_id ON page_items(child_task_id);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_pages_updated_at ON pages(updated_at);
CREATE INDEX IF NOT EXISTS idx_task_sync_meta_caldav_uid ON task_sync_meta(caldav_uid);
CREATE INDEX IF NOT EXISTS idx_deleted_task_log_uid ON deleted_task_sync_log(caldav_uid);
CREATE INDEX IF NOT EXISTS idx_tag_assignments_item ON tag_assignments(item_id, item_type);
CREATE INDEX IF NOT EXISTS idx_tag_assignments_tag ON tag_assignments(tag_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_time ON calendar_events(start_time, end_time);
CREATE INDEX IF NOT EXISTS idx_calendar_events_calendar ON calendar_events(calendar_id);
CREATE INDEX IF NOT EXISTS idx_push_notifications_task ON push_notifications(task_id, sent_at);

-- Down migration
-- Drops all tables (for dev/rollback only — NOT for production use)
DROP TABLE IF EXISTS push_subscriptions CASCADE;
DROP TABLE IF EXISTS push_notifications CASCADE;
DROP TABLE IF EXISTS calendar_events CASCADE;
DROP TABLE IF EXISTS tag_assignments CASCADE;
DROP TABLE IF EXISTS tags CASCADE;
DROP TABLE IF EXISTS deleted_task_sync_log CASCADE;
DROP TABLE IF EXISTS task_sync_meta CASCADE;
DROP TABLE IF EXISTS caldav_configs CASCADE;
DROP TABLE IF EXISTS page_items CASCADE;
DROP TABLE IF EXISTS tasks CASCADE;
DROP TABLE IF EXISTS pages CASCADE;
DROP TABLE IF EXISTS folders CASCADE;