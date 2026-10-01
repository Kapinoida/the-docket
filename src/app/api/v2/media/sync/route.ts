import { NextResponse } from 'next/server';
import { createABSClient } from '@/media/lib/audiobookshelf';
import { createRadarrClient } from '@/media/lib/radarr';
import { createSonarrClient } from '@/media/lib/sonarr';
import { createPlexClient } from '@/media/lib/plex';
import { upsertMediaItem, getStats, startSyncLog, completeSyncLog, markDeletedItems, upsertEpisode, addPlexHistory, findMediaItemByImdbId, findMediaItemByTmdbId, findMediaItemByTvdbId, findTvSeriesByTitle, findEpisodeByNumbers, markEpisodeWatched, updateMediaItem } from '@/media/lib/database';

export async function POST() {
  try {
    const results = {
      audiobookshelf: { success: false, upserted: 0, created: 0, updated: 0, deleted: 0, error: null as string | null },
      radarr: { success: false, upserted: 0, created: 0, updated: 0, deleted: 0, error: null as string | null },
      sonarr: { success: false, upserted: 0, created: 0, updated: 0, deleted: 0, error: null as string | null },
    };

    // Sync Audiobookshelf
    const absLogId = await startSyncLog('audiobookshelf');
    try {
      const absClient = createABSClient();
      const absResult = await absClient.syncAll();
      const activeIds: string[] = [];
      let created = 0;
      let updated = 0;
      for (const item of absResult.items) {
        const result = await upsertMediaItem(item);
        activeIds.push(item.external_id);
        if (result.created) created++; else updated++;
      }
      const deleted = await markDeletedItems('audiobookshelf', activeIds);
      results.audiobookshelf = { success: true, upserted: absResult.items.length, created, updated, deleted, error: null };
      await completeSyncLog(absLogId, { status: 'success', items_synced: absResult.items.length, items_created: created, items_updated: updated, items_deleted: deleted });
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Sync failed';
      results.audiobookshelf.error = msg;
      await completeSyncLog(absLogId, { status: 'error', items_synced: 0, items_created: 0, items_updated: 0, items_deleted: 0, error_message: msg });
    }

    // Sync Radarr
    const radarrLogId = await startSyncLog('radarr');
    try {
      const radarrClient = createRadarrClient();
      const radarrResult = await radarrClient.syncMovies();
      const activeIds: string[] = [];
      let created = 0;
      let updated = 0;
      for (const item of radarrResult.items) {
        const result = await upsertMediaItem(item);
        activeIds.push(item.external_id);
        if (result.created) created++; else updated++;
      }
      const deleted = await markDeletedItems('radarr', activeIds);
      results.radarr = { success: true, upserted: radarrResult.items.length, created, updated, deleted, error: null };
      await completeSyncLog(radarrLogId, { status: 'success', items_synced: radarrResult.items.length, items_created: created, items_updated: updated, items_deleted: deleted });
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Sync failed';
      results.radarr.error = msg;
      await completeSyncLog(radarrLogId, { status: 'error', items_synced: 0, items_created: 0, items_updated: 0, items_deleted: 0, error_message: msg });
    }

    // Sync Sonarr
    const sonarrLogId = await startSyncLog('sonarr');
    try {
      const sonarrClient = createSonarrClient();
      const sonarrResult = await sonarrClient.syncSeries();
      const activeIds: string[] = [];
      let created = 0;
      let updated = 0;
      let episodesCreated = 0;
      for (const item of sonarrResult.items) {
        const result = await upsertMediaItem(item);
        activeIds.push(item.external_id);
        if (result.created) created++; else updated++;

        // Fetch and upsert episodes for this series
        const seriesId = parseInt(item.external_id, 10);
        const episodes = await sonarrClient.getEpisodes(seriesId);
        
        for (const episode of episodes) {
          await upsertEpisode({
            media_item_id: result.item.id,
            season_number: episode.seasonNumber,
            episode_number: episode.episodeNumber,
            title: episode.title,
            air_date: episode.airDate,
            duration_seconds: episode.runtime ? episode.runtime * 60 : null,
            overview: episode.overview || null,
            image_url: episode.images?.find(img => img.coverType === 'screenshot')?.remoteUrl || null,
            external_source: 'sonarr',
            external_id: episode.id.toString(),
            metadata: {
              tvdbId: episode.tvdbId || null,
              absoluteEpisodeNumber: episode.absoluteEpisodeNumber || null,
              hasFile: episode.hasFile,
              monitored: episode.monitored,
            },
          });
          episodesCreated++;
        }
      }
      const deleted = await markDeletedItems('sonarr', activeIds);
      results.sonarr = { success: true, upserted: sonarrResult.items.length, created, updated, deleted, error: null };
      await completeSyncLog(sonarrLogId, { status: 'success', items_synced: sonarrResult.items.length, items_created: created, items_updated: updated, items_deleted: deleted });
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Sync failed';
      results.sonarr.error = msg;
      await completeSyncLog(sonarrLogId, { status: 'error', items_synced: 0, items_created: 0, items_updated: 0, items_deleted: 0, error_message: msg });
    }

    // Sync Plex
    const plexLogId = await startSyncLog('plex');
    try {
      const plexClient = createPlexClient();
      const plexResult = await plexClient.syncWatchHistory();
      let historyAdded = 0;
      let episodesLinked = 0;
      let moviesLinked = 0;
      
      for (const entry of plexResult.history) {
        await addPlexHistory({
          plex_key: entry.plexKey,
          watched_at: entry.watchedAt,
          duration_seconds: entry.durationSeconds,
          progress: entry.progress,
          metadata: {
            title: entry.title,
            type: entry.type,
            seriesTitle: entry.seriesTitle,
            season_number: entry.seasonNumber,
            episode_number: entry.episodeNumber,
            imdbId: entry.imdbId,
            tmdbId: entry.tmdbId,
            tvdbId: entry.tvdbId,
          },
        });
        historyAdded++;

        // Link to specific media items
        let media_item_id: number | null = null;

        if (entry.type === 'episode' && entry.seriesTitle) {
          if (entry.tvdbId) {
            const series = await findMediaItemByTvdbId(entry.tvdbId);
            if (series) media_item_id = series.id;
          }
          if (!media_item_id && entry.tmdbId) {
            const series = await findMediaItemByTmdbId(entry.tmdbId);
            if (series) media_item_id = series.id;
          }
          if (!media_item_id && entry.imdbId) {
            const series = await findMediaItemByImdbId(entry.imdbId);
            if (series) media_item_id = series.id;
          }
          if (!media_item_id) {
            const series = await findTvSeriesByTitle(entry.seriesTitle);
            if (series) media_item_id = series.id;
          }
          
          if (media_item_id && entry.seasonNumber !== undefined && entry.episodeNumber !== undefined) {
            const episode = await findEpisodeByNumbers(media_item_id, entry.seasonNumber, entry.episodeNumber);
            if (episode) {
              markEpisodeWatched(episode.id, entry.watchedAt);
              episodesLinked++;
            }
          }
        } else if (entry.type === 'movie') {
          if (entry.tmdbId) {
            const movie = await findMediaItemByTmdbId(entry.tmdbId);
            if (movie) media_item_id = movie.id;
          }
          if (!media_item_id && entry.imdbId) {
            const movie = await findMediaItemByImdbId(entry.imdbId);
            if (movie) media_item_id = movie.id;
          }
          
          if (media_item_id) {
            await updateMediaItem(media_item_id, { status: 'completed', progress: 1.0 });
            moviesLinked++;
          }
        }
      }
      await completeSyncLog(plexLogId, { status: 'success', items_synced: plexResult.history.length, items_created: historyAdded, items_updated: episodesLinked + moviesLinked, items_deleted: 0 });
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Sync failed';
      await completeSyncLog(plexLogId, { status: 'error', items_synced: 0, items_created: 0, items_updated: 0, items_deleted: 0, error_message: msg });
    }

    const stats = await getStats();

    return NextResponse.json({
      success: true,
      results,
      stats,
    });
  } catch (error) {
    console.error('Sync error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Sync failed',
      },
      { status: 500 }
    );
  }
}
