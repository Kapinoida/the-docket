import { NextResponse } from 'next/server';
import { createPlexClient } from '@/media/lib/plex';
import { 
  addPlexHistory, 
  startSyncLog, 
  completeSyncLog, 
  getStats,
  findMediaItemByImdbId,
  findMediaItemByTmdbId,
  findMediaItemByTvdbId,
  findTvSeriesByTitle,
  findEpisodeByNumbers,
  markEpisodeWatched,
  updateMediaItem
} from '@/media/lib/database';

export async function POST() {
  const logId = await startSyncLog('plex');

  try {
    const client = createPlexClient();
    const syncResult = await client.syncWatchHistory();

    let historyAdded = 0;
    let episodesLinked = 0;
    let moviesLinked = 0;
    let unmatched = 0;

    for (const entry of syncResult.history) {
      // Add to Plex history
      await addPlexHistory({
        plex_key: entry.plexKey,
        watched_at: entry.watchedAt,
        duration_seconds: entry.durationSeconds,
        progress: entry.progress,
        metadata: {
          title: entry.title,
          type: entry.type,
          seriesTitle: entry.seriesTitle,
          seasonNumber: entry.seasonNumber,
          episodeNumber: entry.episodeNumber,
          imdbId: entry.imdbId,
          tmdbId: entry.tmdbId,
          tvdbId: entry.tvdbId,
        },
      });
      historyAdded++;

      // Try to link to specific media item
      let media_item_id: number | null = null;

      // For episodes, try to find the series first
      if (entry.type === 'episode' && entry.seriesTitle) {
        // Try to find by TVDB ID first
        if (entry.tvdbId) {
          const series = await findMediaItemByTvdbId(entry.tvdbId);
          if (series) {
            media_item_id = series.id;
          }
        }
        
        // Try to find by TMDB ID
        if (!media_item_id && entry.tmdbId) {
          const series = await findMediaItemByTmdbId(entry.tmdbId);
          if (series) {
            media_item_id = series.id;
          }
        }
        
        // Try to find by IMDB ID
        if (!media_item_id && entry.imdbId) {
          const series = await findMediaItemByImdbId(entry.imdbId);
          if (series) {
            media_item_id = series.id;
          }
        }
        
        // Try to find by title
        if (!media_item_id) {
          const series = await findTvSeriesByTitle(entry.seriesTitle);
          if (series) {
            media_item_id = series.id;
          }
        }
        
        // If we found the series, try to find the specific episode
        if (media_item_id && entry.seasonNumber !== undefined && entry.episodeNumber !== undefined) {
          const episode = await findEpisodeByNumbers(media_item_id, entry.seasonNumber, entry.episodeNumber);
          if (episode) {
            // Mark episode as watched
            markEpisodeWatched(episode.id, entry.watchedAt);
            episodesLinked++;
          } else {
            unmatched++;
          }
        } else {
          unmatched++;
        }
      } 
      // For movies, try to match directly
      else if (entry.type === 'movie') {
        // Try to find by TMDB ID
        if (entry.tmdbId) {
          const movie = await findMediaItemByTmdbId(entry.tmdbId);
          if (movie) {
            media_item_id = movie.id;
          }
        }
        
        // Try to find by IMDB ID
        if (!media_item_id && entry.imdbId) {
          const movie = await findMediaItemByImdbId(entry.imdbId);
          if (movie) {
            media_item_id = movie.id;
          }
        }
        
        // If we found the movie, mark it as watched
        if (media_item_id) {
          await updateMediaItem(media_item_id, {
            status: 'completed',
            progress: 1.0,
          });
          moviesLinked++;
        } else {
          unmatched++;
        }
      }
    }

    const stats = await getStats();

    await completeSyncLog(logId, {
      status: 'success',
      items_synced: syncResult.history.length,
      items_created: historyAdded,
      items_updated: episodesLinked + moviesLinked,
      items_deleted: 0,
    });

    return NextResponse.json({
      success: true,
      historyAdded,
      episodesLinked,
      moviesLinked,
      unmatched,
      stats: syncResult.stats,
      total: stats.total,
      accountId: syncResult.accountId,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Sync failed';
    await completeSyncLog(logId, {
      status: 'error',
      items_synced: 0,
      items_created: 0,
      items_updated: 0,
      items_deleted: 0,
      error_message: errorMessage,
    });

    console.error('Plex sync error:', error);
    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
      },
      { status: 500 }
    );
  }
}
