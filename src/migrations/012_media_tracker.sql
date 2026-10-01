-- Up migration
-- Media Tracker Module
-- Adds media tracking tables for movies, TV shows, audiobooks, and other media

-- 1. Core media items table
CREATE TABLE IF NOT EXISTS media_items (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  subtitle TEXT,
  media_type TEXT NOT NULL CHECK(media_type IN ('audiobook', 'movie', 'tv', 'music', 'ebook', 'game')),
  creators JSONB NOT NULL DEFAULT '[]',
  performers JSONB NOT NULL DEFAULT '[]',
  series_name TEXT,
  series_position INTEGER,
  year INTEGER,
  genres JSONB NOT NULL DEFAULT '[]',
  duration_seconds INTEGER,
  image_url TEXT,
  description TEXT,
  
  -- Source tracking (primary source)
  external_source TEXT NOT NULL,
  external_id TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}',
  
  -- Status tracking (synced from source)
  status TEXT NOT NULL DEFAULT 'owned' CHECK(status IN ('wanted', 'owned', 'in_progress', 'completed', 'abandoned')),
  progress DOUBLE PRECISION NOT NULL DEFAULT 0.0 CHECK(progress >= 0.0 AND progress <= 1.0),
  
  -- Manual overrides (user-set, preserved during sync)
  manual_status TEXT CHECK(manual_status IN ('wanted', 'owned', 'in_progress', 'completed', 'abandoned')),
  manual_progress DOUBLE PRECISION CHECK(manual_progress >= 0.0 AND manual_progress <= 1.0),
  
  -- User notes and ratings
  notes TEXT,
  rating INTEGER CHECK(rating >= 1 AND rating <= 5),
  
  -- Timestamps
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  source_deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE(external_source, external_id)
);

CREATE INDEX IF NOT EXISTS idx_media_type ON media_items(media_type);
CREATE INDEX IF NOT EXISTS idx_media_status ON media_items(status);
CREATE INDEX IF NOT EXISTS idx_media_external ON media_items(external_source, external_id);
CREATE INDEX IF NOT EXISTS idx_media_created_at ON media_items(created_at DESC);

-- 2. Sync log table
CREATE TABLE IF NOT EXISTS sync_log (
  id SERIAL PRIMARY KEY,
  source TEXT NOT NULL,
  started_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'running' CHECK(status IN ('running', 'success', 'error')),
  items_synced INTEGER NOT NULL DEFAULT 0,
  items_created INTEGER NOT NULL DEFAULT 0,
  items_updated INTEGER NOT NULL DEFAULT 0,
  items_deleted INTEGER NOT NULL DEFAULT 0,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sync_log_source ON sync_log(source);
CREATE INDEX IF NOT EXISTS idx_sync_log_started ON sync_log(started_at DESC);

-- 3. Media item sources table (multi-source tracking)
CREATE TABLE IF NOT EXISTS media_item_sources (
  id SERIAL PRIMARY KEY,
  media_item_id INTEGER NOT NULL REFERENCES media_items(id) ON DELETE CASCADE,
  source TEXT NOT NULL,
  source_id TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}',
  source_deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(source, source_id)
);

CREATE INDEX IF NOT EXISTS idx_sources_media_item ON media_item_sources(media_item_id);
CREATE INDEX IF NOT EXISTS idx_sources_source ON media_item_sources(source);
CREATE INDEX IF NOT EXISTS idx_sources_source_id ON media_item_sources(source, source_id);

-- 4. Episodes table (TV show tracking)
CREATE TABLE IF NOT EXISTS episodes (
  id SERIAL PRIMARY KEY,
  media_item_id INTEGER NOT NULL REFERENCES media_items(id) ON DELETE CASCADE,
  season_number INTEGER NOT NULL,
  episode_number INTEGER NOT NULL,
  title TEXT,
  air_date TEXT,
  duration_seconds INTEGER,
  overview TEXT,
  image_url TEXT,
  
  -- Watched state (separate from owned/downloaded)
  watched_at TIMESTAMPTZ,
  progress DOUBLE PRECISION DEFAULT 0.0 CHECK(progress >= 0.0 AND progress <= 1.0),
  view_count INTEGER DEFAULT 0,
  
  -- Source tracking
  external_source TEXT,
  external_id TEXT,
  metadata JSONB DEFAULT '{}',
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(media_item_id, season_number, episode_number)
);

CREATE INDEX IF NOT EXISTS idx_episodes_media_item ON episodes(media_item_id);
CREATE INDEX IF NOT EXISTS idx_episodes_season_episode ON episodes(media_item_id, season_number, episode_number);
CREATE INDEX IF NOT EXISTS idx_episodes_watched ON episodes(watched_at);

-- 5. Plex watch history table
CREATE TABLE IF NOT EXISTS plex_history (
  id SERIAL PRIMARY KEY,
  media_item_id INTEGER REFERENCES media_items(id) ON DELETE CASCADE,
  episode_id INTEGER REFERENCES episodes(id) ON DELETE CASCADE,
  plex_key TEXT NOT NULL,
  watched_at TIMESTAMPTZ NOT NULL,
  duration_seconds INTEGER,
  progress DOUBLE PRECISION,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_plex_history_media ON plex_history(media_item_id);
CREATE INDEX IF NOT EXISTS idx_plex_history_watched ON plex_history(watched_at DESC);
CREATE INDEX IF NOT EXISTS idx_plex_history_key ON plex_history(plex_key);

-- 6. Planning queue table (Up Next)
CREATE TABLE IF NOT EXISTS planning_queue (
  id SERIAL PRIMARY KEY,
  media_item_id INTEGER NOT NULL UNIQUE REFERENCES media_items(id) ON DELETE CASCADE,
  queue_status TEXT NOT NULL DEFAULT 'up_next' CHECK(queue_status IN ('up_next', 'backlog', 'completed')),
  position INTEGER NOT NULL DEFAULT 0,
  added_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_planning_queue_status_position ON planning_queue(queue_status, position);
CREATE INDEX IF NOT EXISTS idx_planning_queue_added ON planning_queue(added_at DESC);

-- Trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION update_media_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_media_items_updated_at ON media_items;
CREATE TRIGGER trigger_media_items_updated_at
  BEFORE UPDATE ON media_items
  FOR EACH ROW
  EXECUTE FUNCTION update_media_updated_at();

DROP TRIGGER IF EXISTS trigger_media_item_sources_updated_at ON media_item_sources;
CREATE TRIGGER trigger_media_item_sources_updated_at
  BEFORE UPDATE ON media_item_sources
  FOR EACH ROW
  EXECUTE FUNCTION update_media_updated_at();

DROP TRIGGER IF EXISTS trigger_episodes_updated_at ON episodes;
CREATE TRIGGER trigger_episodes_updated_at
  BEFORE UPDATE ON episodes
  FOR EACH ROW
  EXECUTE FUNCTION update_media_updated_at();

DROP TRIGGER IF EXISTS trigger_planning_queue_updated_at ON planning_queue;
CREATE TRIGGER trigger_planning_queue_updated_at
  BEFORE UPDATE ON planning_queue
  FOR EACH ROW
  EXECUTE FUNCTION update_media_updated_at();

-- Down migration
DROP TRIGGER IF EXISTS trigger_planning_queue_updated_at ON planning_queue;
DROP TRIGGER IF EXISTS trigger_episodes_updated_at ON episodes;
DROP TRIGGER IF EXISTS trigger_media_item_sources_updated_at ON media_item_sources;
DROP TRIGGER IF EXISTS trigger_media_items_updated_at ON media_items;
DROP FUNCTION IF EXISTS update_media_updated_at();

DROP TABLE IF EXISTS planning_queue CASCADE;
DROP TABLE IF EXISTS plex_history CASCADE;
DROP TABLE IF EXISTS episodes CASCADE;
DROP TABLE IF EXISTS media_item_sources CASCADE;
DROP TABLE IF EXISTS sync_log CASCADE;
DROP TABLE IF EXISTS media_items CASCADE;
