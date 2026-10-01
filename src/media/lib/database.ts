import { Pool } from 'pg';

// Use the shared Docket database pool
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5433'),
  database: process.env.DB_NAME || 'the_docket',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

export interface MediaItemRow {
  id: number;
  title: string;
  subtitle: string | null;
  media_type: 'audiobook' | 'movie' | 'tv' | 'music' | 'ebook' | 'game';
  creators: string[]; // JSONB array
  performers: string[]; // JSONB array
  series_name: string | null;
  series_position: number | null;
  year: number | null;
  genres: string[]; // JSONB array
  duration_seconds: number | null;
  image_url: string | null;
  description: string | null;
  external_source: string;
  external_id: string;
  metadata: Record<string, unknown>; // JSONB object
  status: 'wanted' | 'owned' | 'in_progress' | 'completed' | 'abandoned';
  progress: number;
  manual_status: 'wanted' | 'owned' | 'in_progress' | 'completed' | 'abandoned' | null;
  manual_progress: number | null;
  notes: string | null;
  rating: number | null;
  started_at: string | null;
  completed_at: string | null;
  source_deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface MediaItem {
  id: number;
  title: string;
  subtitle: string | null;
  type: 'audiobook' | 'movie' | 'tv' | 'music' | 'ebook' | 'game';
  creators: string[];
  performers: string[];
  series: string | null;
  seriesPosition: number | null;
  year: number | null;
  genres: string[];
  durationMinutes: number | null;
  image: string | null;
  description: string | null;
  source: string;
  sourceId: string;
  metadata: Record<string, unknown>;
  status: 'wanted' | 'owned' | 'in_progress' | 'completed' | 'abandoned';
  progress: number;
  notes: string | null;
  rating: number | null;
  startedAt: string | null;
  completedAt: string | null;
  manualOverride: boolean;
}

export interface PlanningQueueItem extends MediaItem {
  queueId: number;
  queueStatus: 'up_next' | 'backlog' | 'completed';
  position: number;
  addedAt: string;
  completedAt: string | null;
}

export interface Episode {
  id: number;
  mediaItemId: number;
  seasonNumber: number;
  episodeNumber: number;
  title: string | null;
  airDate: string | null;
  durationSeconds: number | null;
  overview: string | null;
  imageUrl: string | null;
  watchedAt: string | null;
  progress: number;
  viewCount: number;
  externalSource: string | null;
  externalId: string | null;
  metadata: Record<string, unknown>;
}

export interface MediaItemWithSources extends MediaItem {
  sources: Array<{
    source: string;
    sourceId: string;
    metadata: Record<string, unknown>;
    deletedAt: string | null;
  }>;
  episodes?: Episode[];
  episodeStats?: {
    total: number;
    watched: number;
    progress: number;
  };
  plexHistory?: Array<{
    id: number;
    plexKey: string;
    watchedAt: string;
    durationSeconds: number | null;
    progress: number | null;
    metadata: Record<string, unknown>;
  }>;
}

function rowToMediaItem(row: MediaItemRow): MediaItem {
  return {
    id: row.id,
    title: row.title,
    subtitle: row.subtitle,
    type: row.media_type,
    creators: row.creators || [],
    performers: row.performers || [],
    series: row.series_name,
    seriesPosition: row.series_position,
    year: row.year,
    genres: row.genres || [],
    durationMinutes: row.duration_seconds ? Math.round(row.duration_seconds / 60) : null,
    image: row.image_url,
    description: row.description,
    source: row.external_source,
    sourceId: row.external_id,
    metadata: row.metadata || {},
    status: row.manual_status || row.status,
    progress: row.manual_progress ?? row.progress,
    notes: row.notes,
    rating: row.rating,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    manualOverride: row.manual_status !== null || row.manual_progress !== null,
  };
}

export async function getAllMedia(filters?: {
  type?: string;
  status?: string;
  query?: string;
}): Promise<MediaItem[]> {
  let sql = 'SELECT DISTINCT mi.* FROM media_items mi WHERE 1=1';
  const params: (string | number)[] = [];

  // Exclude items that have been deleted from all sources
  sql += ' AND EXISTS (SELECT 1 FROM media_item_sources mis WHERE mis.media_item_id = mi.id AND mis.source_deleted_at IS NULL)';

  if (filters?.type) {
    sql += ' AND mi.media_type = $' + (params.length + 1);
    params.push(filters.type);
  }

  if (filters?.status) {
    sql += ' AND (mi.manual_status = $' + (params.length + 1) + ' OR (mi.manual_status IS NULL AND mi.status = $' + (params.length + 2) + '))';
    params.push(filters.status, filters.status);
  }

  if (filters?.query) {
    sql += ' AND (mi.title ILIKE $' + (params.length + 1) + ' OR mi.subtitle ILIKE $' + (params.length + 2) + ' OR mi.description ILIKE $' + (params.length + 3) + ')';
    const search = `%${filters.query}%`;
    params.push(search, search, search);
  }

  sql += ' ORDER BY mi.title ASC';

  const { rows } = await pool.query(sql, params);
  const items = rows.map(rowToMediaItem);
  
  // For TV shows, calculate progress from watched episodes (unless manually overridden)
  for (const item of items) {
    if (item.type === 'tv' && !item.manualOverride) {
      const episodeStats = await getEpisodeStats(item.id);
      if (episodeStats.total > 0) {
        item.progress = episodeStats.progress;
        
        // Update status based on watched episodes
        if (episodeStats.watched === 0) {
          // No episodes watched - keep original status (owned/wanted)
        } else if (episodeStats.watched === episodeStats.total) {
          // All episodes watched
          item.status = 'completed';
        } else {
          // Some episodes watched
          item.status = 'in_progress';
        }
      }
    }
  }
  
  return items;
}

export async function getMediaById(id: number): Promise<MediaItem | null> {
  const { rows } = await pool.query('SELECT * FROM media_items WHERE id = $1', [id]);
  if (rows.length === 0) return null;
  
  const item = rowToMediaItem(rows[0]);
  
  // For TV shows, calculate progress from watched episodes (unless manually overridden)
  if (item.type === 'tv' && !item.manualOverride) {
    const episodeStats = await getEpisodeStats(id);
    if (episodeStats.total > 0) {
      item.progress = episodeStats.progress;
      
      // Update status based on watched episodes
      if (episodeStats.watched === 0) {
        // No episodes watched - keep original status (owned/wanted)
      } else if (episodeStats.watched === episodeStats.total) {
        // All episodes watched
        item.status = 'completed';
      } else {
        // Some episodes watched
        item.status = 'in_progress';
      }
    }
  }
  
  return item;
}

export async function getMediaByIdWithSources(id: number): Promise<MediaItemWithSources | null> {
  const item = await getMediaById(id);
  if (!item) return null;

  const sourceLinks = await getSourceLinks(id);
  const sources = sourceLinks.map(link => ({
    source: link.source,
    sourceId: link.source_id,
    metadata: link.metadata || {},
    deletedAt: link.source_deleted_at,
  }));

  const result: MediaItemWithSources = { ...item, sources };

  // Add episode data for TV shows
  if (item.type === 'tv') {
    result.episodes = await getEpisodes(id);
    result.episodeStats = await getEpisodeStats(id);
  }

  // Add Plex watch history
  result.plexHistory = await getPlexHistoryForMedia(id);

  return result;
}

export async function upsertMediaItem(item: {
  title: string;
  subtitle?: string | null;
  media_type: 'audiobook' | 'movie' | 'tv' | 'music' | 'ebook' | 'game';
  creators?: string[];
  performers?: string[];
  series_name?: string | null;
  series_position?: number | null;
  year?: number | null;
  genres?: string[];
  duration_seconds?: number | null;
  image_url?: string | null;
  description?: string | null;
  external_source: string;
  external_id: string;
  metadata?: Record<string, unknown>;
  status: 'wanted' | 'owned' | 'in_progress' | 'completed' | 'abandoned';
  progress: number;
  started_at?: string | null;
  completed_at?: string | null;
}): Promise<{ item: MediaItem; created: boolean }> {
  let canonicalId: number | null = null;
  let created = false;

  // 1. Check if source link already exists
  canonicalId = await findCanonicalBySource(item.external_source, item.external_id);

  // 2. If no source link, try to resolve by TMDB ID for movies/TV
  if (!canonicalId && (item.media_type === 'movie' || item.media_type === 'tv')) {
    const tmdbId = item.metadata?.tmdbId;
    if (tmdbId && typeof tmdbId === 'number') {
      // Check if there's already a canonical item with this TMDB ID
      canonicalId = await findCanonicalByMetadataTmdbId(tmdbId);
    }
  }

  // 3. Create or update the canonical media item
  if (canonicalId) {
    // Update existing canonical item
    await pool.query(`
      UPDATE media_items SET
        title = $1,
        subtitle = $2,
        creators = $3,
        performers = $4,
        series_name = $5,
        series_position = $6,
        year = $7,
        genres = $8,
        duration_seconds = $9,
        image_url = $10,
        description = $11,
        metadata = $12,
        status = $13,
        progress = $14,
        started_at = $15,
        completed_at = $16,
        source_deleted_at = NULL,
        updated_at = NOW()
      WHERE id = $17
    `, [
      item.title,
      item.subtitle || null,
      JSON.stringify(item.creators || []),
      JSON.stringify(item.performers || []),
      item.series_name || null,
      item.series_position || null,
      item.year || null,
      JSON.stringify(item.genres || []),
      item.duration_seconds || null,
      item.image_url || null,
      item.description || null,
      JSON.stringify(item.metadata || {}),
      item.status,
      item.progress,
      item.started_at || null,
      item.completed_at || null,
      canonicalId,
    ]);
  } else {
    // Create new canonical item
    const result = await pool.query(`
      INSERT INTO media_items (
        title, subtitle, media_type, creators, performers, series_name, series_position,
        year, genres, duration_seconds, image_url, description, external_source, external_id,
        metadata, status, progress, started_at, completed_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19
      ) RETURNING id
    `, [
      item.title,
      item.subtitle || null,
      item.media_type,
      JSON.stringify(item.creators || []),
      JSON.stringify(item.performers || []),
      item.series_name || null,
      item.series_position || null,
      item.year || null,
      JSON.stringify(item.genres || []),
      item.duration_seconds || null,
      item.image_url || null,
      item.description || null,
      item.external_source,
      item.external_id,
      JSON.stringify(item.metadata || {}),
      item.status,
      item.progress,
      item.started_at || null,
      item.completed_at || null,
    ]);

    canonicalId = result.rows[0].id;
    created = true;
  }

  if (!canonicalId) {
    throw new Error('Failed to create or find canonical media item');
  }

  // 4. Create or update source link
  await createSourceLink(canonicalId, item.external_source, item.external_id, item.metadata || {});

  // 5. Return the updated item
  const updatedItem = await getMediaById(canonicalId);
  return { item: updatedItem!, created };
}

export async function updateMediaItem(id: number, updates: {
  status?: 'wanted' | 'owned' | 'in_progress' | 'completed' | 'abandoned';
  progress?: number;
  notes?: string | null;
  rating?: number | null;
}): Promise<MediaItem | null> {
  const sets: string[] = [];
  const values: unknown[] = [];
  let paramIndex = 1;

  if (updates.status !== undefined) {
    sets.push(`manual_status = $${paramIndex++}`);
    values.push(updates.status);
  }

  if (updates.progress !== undefined) {
    sets.push(`manual_progress = $${paramIndex++}`);
    values.push(updates.progress);
  }

  if (updates.notes !== undefined) {
    sets.push(`notes = $${paramIndex++}`);
    values.push(updates.notes);
  }

  if (updates.rating !== undefined) {
    sets.push(`rating = $${paramIndex++}`);
    values.push(updates.rating);
  }

  if (sets.length === 0) {
    return getMediaById(id);
  }

  sets.push("updated_at = NOW()");
  values.push(id);

  const sql = `UPDATE media_items SET ${sets.join(', ')} WHERE id = $${paramIndex}`;
  await pool.query(sql, values);

  return getMediaById(id);
}

export async function getStats() {
  // Get all active media items
  const { rows: allItems } = await pool.query(`
    SELECT DISTINCT mi.* FROM media_items mi
    WHERE EXISTS (SELECT 1 FROM media_item_sources mis WHERE mis.media_item_id = mi.id AND mis.source_deleted_at IS NULL)
  `);
  
  let total = 0;
  let inProgress = 0;
  let completed = 0;
  let wanted = 0;
  
  for (const row of allItems) {
    const item = rowToMediaItem(row);
    total++;
    
    // For TV shows, calculate status from episodes
    if (item.type === 'tv' && !item.manualOverride) {
      const episodeStats = await getEpisodeStats(item.id);
      if (episodeStats.total > 0) {
        if (episodeStats.watched === 0) {
          // No episodes watched - use original status
          if (item.status === 'wanted') wanted++;
          else if (item.status === 'owned') inProgress++;
        } else if (episodeStats.watched === episodeStats.total) {
          completed++;
        } else {
          inProgress++;
        }
      } else {
        // No episodes yet - use original status
        if (item.status === 'wanted') wanted++;
        else if (item.status === 'owned') inProgress++;
      }
    } else {
      // For non-TV shows or manually overridden items, use stored status
      const status = item.status;
      if (status === 'wanted') wanted++;
      else if (status === 'in_progress') inProgress++;
      else if (status === 'completed') completed++;
      else if (status === 'owned') inProgress++; // Count owned as in_progress
    }
  }
  
  return {
    total,
    inProgress,
    completed,
    wanted,
  };
}

// Episode functions

export async function getEpisodes(mediaItemId: number): Promise<Episode[]> {
  const { rows } = await pool.query(
    'SELECT * FROM episodes WHERE media_item_id = $1 ORDER BY season_number, episode_number',
    [mediaItemId]
  );
  
  return rows.map(row => ({
    id: row.id,
    mediaItemId: row.media_item_id,
    seasonNumber: row.season_number,
    episodeNumber: row.episode_number,
    title: row.title,
    airDate: row.air_date,
    durationSeconds: row.duration_seconds,
    overview: row.overview,
    imageUrl: row.image_url,
    watchedAt: row.watched_at,
    progress: row.progress || 0,
    viewCount: row.view_count || 0,
    externalSource: row.external_source,
    externalId: row.external_id,
    metadata: row.metadata || {},
  }));
}

export async function upsertEpisode(episode: {
  media_item_id: number;
  season_number: number;
  episode_number: number;
  title?: string | null;
  air_date?: string | null;
  duration_seconds?: number | null;
  overview?: string | null;
  image_url?: string | null;
  watched_at?: string | null;
  progress?: number;
  view_count?: number;
  external_source?: string | null;
  external_id?: string | null;
  metadata?: Record<string, unknown>;
}): Promise<Episode> {
  const result = await pool.query(`
    INSERT INTO episodes (
      media_item_id, season_number, episode_number, title, air_date, duration_seconds,
      overview, image_url, watched_at, progress, view_count, external_source, external_id, metadata
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14
    )
    ON CONFLICT (media_item_id, season_number, episode_number) DO UPDATE SET
      title = EXCLUDED.title,
      air_date = EXCLUDED.air_date,
      duration_seconds = EXCLUDED.duration_seconds,
      overview = EXCLUDED.overview,
      image_url = EXCLUDED.image_url,
      watched_at = COALESCE(episodes.watched_at, EXCLUDED.watched_at),
      progress = COALESCE(episodes.progress, EXCLUDED.progress),
      view_count = EXCLUDED.view_count,
      external_source = EXCLUDED.external_source,
      external_id = EXCLUDED.external_id,
      metadata = EXCLUDED.metadata,
      updated_at = NOW()
    RETURNING *
  `, [
    episode.media_item_id,
    episode.season_number,
    episode.episode_number,
    episode.title || null,
    episode.air_date || null,
    episode.duration_seconds || null,
    episode.overview || null,
    episode.image_url || null,
    episode.watched_at || null,
    episode.progress || 0,
    episode.view_count || 0,
    episode.external_source || null,
    episode.external_id || null,
    JSON.stringify(episode.metadata || {}),
  ]);
  
  const row = result.rows[0];
  return {
    id: row.id,
    mediaItemId: row.media_item_id,
    seasonNumber: row.season_number,
    episodeNumber: row.episode_number,
    title: row.title,
    airDate: row.air_date,
    durationSeconds: row.duration_seconds,
    overview: row.overview,
    imageUrl: row.image_url,
    watchedAt: row.watched_at,
    progress: row.progress || 0,
    viewCount: row.view_count || 0,
    externalSource: row.external_source,
    externalId: row.external_id,
    metadata: row.metadata || {},
  };
}

export async function getEpisodeStats(mediaItemId: number): Promise<{ total: number; watched: number; progress: number }> {
  const { rows } = await pool.query(`
    SELECT 
      COUNT(*) as total,
      COUNT(CASE WHEN watched_at IS NOT NULL THEN 1 END) as watched
    FROM episodes
    WHERE media_item_id = $1 AND season_number > 0
  `, [mediaItemId]);
  
  const total = parseInt(rows[0].total) || 0;
  const watched = parseInt(rows[0].watched) || 0;
  const progress = total > 0 ? watched / total : 0;
  
  return { total, watched, progress };
}

// Plex history functions

export async function upsertPlexHistory(history: {
  media_item_id?: number | null;
  episode_id?: number | null;
  plex_key: string;
  watched_at: string;
  duration_seconds?: number | null;
  progress?: number | null;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  await pool.query(`
    INSERT INTO plex_history (
      media_item_id, episode_id, plex_key, watched_at, duration_seconds, progress, metadata
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7
    )
    ON CONFLICT (plex_key, watched_at) DO NOTHING
  `, [
    history.media_item_id || null,
    history.episode_id || null,
    history.plex_key,
    history.watched_at,
    history.duration_seconds || null,
    history.progress || null,
    JSON.stringify(history.metadata || {}),
  ]);
}

export async function getPlexHistoryForMedia(mediaItemId: number): Promise<Array<{
  id: number;
  plexKey: string;
  watchedAt: string;
  durationSeconds: number | null;
  progress: number | null;
  metadata: Record<string, unknown>;
}>> {
  const { rows } = await pool.query(
    'SELECT * FROM plex_history WHERE media_item_id = $1 ORDER BY watched_at DESC',
    [mediaItemId]
  );
  
  return rows.map(row => ({
    id: row.id,
    plexKey: row.plex_key,
    watchedAt: row.watched_at,
    durationSeconds: row.duration_seconds,
    progress: row.progress,
    metadata: row.metadata || {},
  }));
}

// Source link functions

export async function getSourceLinks(mediaItemId: number): Promise<Array<{
  source: string;
  source_id: string;
  metadata: Record<string, unknown>;
  source_deleted_at: string | null;
}>> {
  const { rows } = await pool.query(
    'SELECT * FROM media_item_sources WHERE media_item_id = $1',
    [mediaItemId]
  );
  
  return rows.map(row => ({
    source: row.source,
    source_id: row.source_id,
    metadata: row.metadata || {},
    source_deleted_at: row.source_deleted_at,
  }));
}

export async function createSourceLink(
  mediaItemId: number,
  source: string,
  sourceId: string,
  metadata: Record<string, unknown> = {}
): Promise<void> {
  await pool.query(`
    INSERT INTO media_item_sources (media_item_id, source, source_id, metadata)
    VALUES ($1, $2, $3, $4)
    ON CONFLICT (source, source_id) DO UPDATE SET
      media_item_id = EXCLUDED.media_item_id,
      metadata = EXCLUDED.metadata,
      source_deleted_at = NULL,
      updated_at = NOW()
  `, [mediaItemId, source, sourceId, JSON.stringify(metadata)]);
}

export async function findCanonicalBySource(source: string, sourceId: string): Promise<number | null> {
  const { rows } = await pool.query(
    'SELECT media_item_id FROM media_item_sources WHERE source = $1 AND source_id = $2 AND source_deleted_at IS NULL',
    [source, sourceId]
  );
  
  return rows.length > 0 ? rows[0].media_item_id : null;
}

export async function findCanonicalByMetadataTmdbId(tmdbId: number): Promise<number | null> {
  const { rows } = await pool.query(
    "SELECT id FROM media_items WHERE metadata->>'tmdbId' = $1 AND (media_type = 'movie' OR media_type = 'tv')",
    [String(tmdbId)]
  );
  
  return rows.length > 0 ? rows[0].id : null;
}

// Sync log functions

export async function startSyncLog(source: string): Promise<number> {
  const { rows } = await pool.query(`
    INSERT INTO sync_log (source, started_at, status)
    VALUES ($1, NOW(), 'running')
    RETURNING id
  `, [source]);
  
  return rows[0].id;
}

export async function completeSyncLog(
  id: number,
  result: {
    status: 'success' | 'error';
    items_synced: number;
    items_created: number;
    items_updated: number;
    items_deleted: number;
    error_message?: string | null;
  }
): Promise<void> {
  await pool.query(`
    UPDATE sync_log
    SET completed_at = NOW(),
        status = $1,
        items_synced = $2,
        items_created = $3,
        items_updated = $4,
        items_deleted = $5,
        error_message = $6
    WHERE id = $7
  `, [
    result.status,
    result.items_synced,
    result.items_created,
    result.items_updated,
    result.items_deleted,
    result.error_message || null,
    id,
  ]);
}

export async function getSyncLog(limit: number = 10): Promise<Array<{
  id: number;
  source: string;
  startedAt: string;
  completedAt: string | null;
  status: 'running' | 'success' | 'error';
  itemsSynced: number;
  itemsCreated: number;
  itemsUpdated: number;
  itemsDeleted: number;
  errorMessage: string | null;
}>> {
  const { rows } = await pool.query(
    'SELECT * FROM sync_log ORDER BY started_at DESC LIMIT $1',
    [limit]
  );
  
  return rows.map(row => ({
    id: row.id,
    source: row.source,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    status: row.status,
    itemsSynced: row.items_synced,
    itemsCreated: row.items_created,
    itemsUpdated: row.items_updated,
    itemsDeleted: row.items_deleted,
    errorMessage: row.error_message,
  }));
}

export async function getLastSyncBySource(): Promise<Record<string, {
  id: number;
  source: string;
  startedAt: string;
  completedAt: string | null;
  status: 'running' | 'success' | 'error';
  itemsSynced: number;
  itemsCreated: number;
  itemsUpdated: number;
  itemsDeleted: number;
  errorMessage: string | null;
} | null>> {
  const { rows } = await pool.query(`
    SELECT DISTINCT ON (source) *
    FROM sync_log
    WHERE status = 'success'
    ORDER BY source, started_at DESC
  `);
  
  const result: Record<string, any> = {};
  for (const row of rows) {
    result[row.source] = {
      id: row.id,
      source: row.source,
      startedAt: row.started_at,
      completedAt: row.completed_at,
      status: row.status,
      itemsSynced: row.items_synced,
      itemsCreated: row.items_created,
      itemsUpdated: row.items_updated,
      itemsDeleted: row.items_deleted,
      errorMessage: row.error_message,
    };
  }
  
  return result;
}

export async function markDeletedItems(
  source: string,
  sourceIds: string[]
): Promise<number> {
  if (sourceIds.length === 0) return 0;
  
  const placeholders = sourceIds.map((_, i) => `$${i + 2}`).join(', ');
  const { rowCount } = await pool.query(`
    UPDATE media_item_sources
    SET source_deleted_at = NOW(),
        updated_at = NOW()
    WHERE source = $1 AND source_id NOT IN (${placeholders})
      AND source_deleted_at IS NULL
  `, [source, ...sourceIds]);
  
  return rowCount || 0;
}

// Planning queue functions

export async function getPlanningQueue(): Promise<{ upNext: PlanningQueueItem[]; backlog: PlanningQueueItem[] }> {
  const { rows } = await pool.query(`
    SELECT mi.*, pq.id AS queue_id, pq.queue_status, pq.position,
           pq.added_at AS queue_added_at, pq.completed_at AS queue_completed_at
    FROM planning_queue pq
    JOIN media_items mi ON mi.id = pq.media_item_id
    WHERE pq.queue_status IN ('up_next', 'backlog')
    ORDER BY pq.queue_status, pq.position, pq.added_at
  `);
  
  const upNext: PlanningQueueItem[] = [];
  const backlog: PlanningQueueItem[] = [];
  
  for (const row of rows) {
    const item = rowToMediaItem(row);
    const queueItem: PlanningQueueItem = {
      ...item,
      queueId: row.queue_id,
      queueStatus: row.queue_status,
      position: row.position,
      addedAt: row.queue_added_at,
      completedAt: row.queue_completed_at,
    };
    
    if (row.queue_status === 'up_next') {
      upNext.push(queueItem);
    } else {
      backlog.push(queueItem);
    }
  }
  
  return { upNext, backlog };
}

export async function addToPlanningQueue(
  mediaItemId: number,
  queueStatus: 'up_next' | 'backlog' = 'up_next'
): Promise<PlanningQueueItem | null> {
  const media = await getMediaById(mediaItemId);
  if (!media) return null;

  const { rows: positionResult } = await pool.query(
    'SELECT COALESCE(MAX(position), -1) + 1 AS next FROM planning_queue WHERE queue_status = $1',
    [queueStatus]
  );
  const position = positionResult[0].next;

  await pool.query(`
    INSERT INTO planning_queue (media_item_id, queue_status, position, completed_at, updated_at)
    VALUES ($1, $2, $3, NULL, NOW())
    ON CONFLICT(media_item_id) DO UPDATE SET
      queue_status = EXCLUDED.queue_status,
      position = EXCLUDED.position,
      completed_at = NULL,
      updated_at = NOW()
  `, [mediaItemId, queueStatus, position]);

  return getPlanningQueueItemByMediaId(mediaItemId);
}

async function getPlanningQueueItemByMediaId(mediaItemId: number): Promise<PlanningQueueItem | null> {
  const { rows } = await pool.query(`
    SELECT mi.*, pq.id AS queue_id, pq.queue_status, pq.position,
           pq.added_at AS queue_added_at, pq.completed_at AS queue_completed_at
    FROM planning_queue pq
    JOIN media_items mi ON mi.id = pq.media_item_id
    WHERE pq.media_item_id = $1
  `, [mediaItemId]);
  
  if (rows.length === 0) return null;
  
  const row = rows[0];
  const item = rowToMediaItem(row);
  
  return {
    ...item,
    queueId: row.queue_id,
    queueStatus: row.queue_status,
    position: row.position,
    addedAt: row.queue_added_at,
    completedAt: row.queue_completed_at,
  };
}

export async function updatePlanningQueueItem(
  queueId: number,
  updates: { queueStatus?: 'up_next' | 'backlog'; position?: number }
): Promise<PlanningQueueItem | null> {
  const { rows: currentRows } = await pool.query(
    'SELECT media_item_id FROM planning_queue WHERE id = $1',
    [queueId]
  );
  
  if (currentRows.length === 0) return null;
  
  const sets: string[] = [];
  const values: unknown[] = [];
  let paramIndex = 1;
  
  if (updates.queueStatus !== undefined) {
    sets.push(`queue_status = $${paramIndex++}`);
    values.push(updates.queueStatus);
  }
  
  if (updates.position !== undefined) {
    sets.push(`position = $${paramIndex++}`);
    values.push(updates.position);
  }
  
  if (sets.length > 0) {
    values.push(queueId);
    await pool.query(
      `UPDATE planning_queue SET ${sets.join(', ')}, updated_at = NOW() WHERE id = $${paramIndex}`,
      values
    );
  }
  
  return getPlanningQueueItemByMediaId(currentRows[0].media_item_id);
}

export async function completePlanningQueueItem(queueId: number): Promise<PlanningQueueItem | null> {
  const { rows: currentRows } = await pool.query(
    'SELECT media_item_id FROM planning_queue WHERE id = $1',
    [queueId]
  );
  
  if (currentRows.length === 0) return null;
  
  await pool.query(`
    UPDATE planning_queue
    SET queue_status = 'completed', completed_at = NOW(), updated_at = NOW()
    WHERE id = $1
  `, [queueId]);
  
  await updateMediaItem(currentRows[0].media_item_id, { status: 'completed', progress: 1 });
  
  return getPlanningQueueItemByMediaId(currentRows[0].media_item_id);
}

export async function removePlanningQueueItem(queueId: number): Promise<boolean> {
  const { rowCount } = await pool.query(
    'DELETE FROM planning_queue WHERE id = $1',
    [queueId]
  );
  
  return (rowCount || 0) > 0;
}

// Additional functions for Plex integration

export async function findMediaItemByImdbId(imdbId: string): Promise<MediaItem | null> {
  const { rows } = await pool.query(`
    SELECT * FROM media_items
    WHERE metadata->>'imdbId' = $1
    LIMIT 1
  `, [imdbId]);
  
  return rows.length > 0 ? rowToMediaItem(rows[0]) : null;
}

export async function findMediaItemByTmdbId(tmdbId: number): Promise<MediaItem | null> {
  const { rows } = await pool.query(`
    SELECT * FROM media_items
    WHERE metadata->>'tmdbId' = $1
    LIMIT 1
  `, [String(tmdbId)]);
  
  return rows.length > 0 ? rowToMediaItem(rows[0]) : null;
}

export async function findMediaItemByTvdbId(tvdbId: number): Promise<MediaItem | null> {
  const { rows } = await pool.query(`
    SELECT * FROM media_items
    WHERE metadata->>'tvdbId' = $1
    LIMIT 1
  `, [String(tvdbId)]);
  
  return rows.length > 0 ? rowToMediaItem(rows[0]) : null;
}

export async function findTvSeriesByTitle(title: string): Promise<MediaItem | null> {
  const { rows } = await pool.query(`
    SELECT * FROM media_items
    WHERE media_type = 'tv' AND title ILIKE $1
    LIMIT 1
  `, [title]);
  
  return rows.length > 0 ? rowToMediaItem(rows[0]) : null;
}

export async function findEpisodeByNumbers(mediaItemId: number, seasonNumber: number, episodeNumber: number): Promise<Episode | null> {
  const { rows } = await pool.query(`
    SELECT * FROM episodes
    WHERE media_item_id = $1 AND season_number = $2 AND episode_number = $3
    LIMIT 1
  `, [mediaItemId, seasonNumber, episodeNumber]);
  
  if (rows.length === 0) return null;
  
  const row = rows[0];
  return {
    id: row.id,
    mediaItemId: row.media_item_id,
    seasonNumber: row.season_number,
    episodeNumber: row.episode_number,
    title: row.title,
    airDate: row.air_date,
    durationSeconds: row.duration_seconds,
    overview: row.overview,
    imageUrl: row.image_url,
    watchedAt: row.watched_at,
    progress: row.progress || 0,
    viewCount: row.view_count || 0,
    externalSource: row.external_source,
    externalId: row.external_id,
    metadata: row.metadata || {},
  };
}

export async function markEpisodeWatched(episodeId: number, watchedAt: string): Promise<void> {
  await pool.query(`
    UPDATE episodes
    SET watched_at = $1, progress = 1.0, updated_at = NOW()
    WHERE id = $2
  `, [watchedAt, episodeId]);
}

export async function addPlexHistory(history: {
  media_item_id?: number | null;
  episode_id?: number | null;
  plex_key: string;
  watched_at: string;
  duration_seconds?: number | null;
  progress?: number | null;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  await pool.query(`
    INSERT INTO plex_history (
      media_item_id, episode_id, plex_key, watched_at, duration_seconds, progress, metadata
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7
    )
    ON CONFLICT (plex_key, watched_at) DO NOTHING
  `, [
    history.media_item_id || null,
    history.episode_id || null,
    history.plex_key,
    history.watched_at,
    history.duration_seconds || null,
    history.progress || null,
    JSON.stringify(history.metadata || {}),
  ]);
}
