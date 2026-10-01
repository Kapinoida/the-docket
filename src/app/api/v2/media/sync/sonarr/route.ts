import { NextResponse } from 'next/server';
import { createSonarrClient } from '@/media/lib/sonarr';
import { upsertMediaItem, getStats, startSyncLog, completeSyncLog, markDeletedItems, upsertEpisode, findCanonicalBySource } from '@/media/lib/database';

export async function POST() {
  const logId = await startSyncLog('sonarr');

  try {
    const client = createSonarrClient();
    const syncResult = await client.syncSeries();

    let created = 0;
    let updated = 0;
    let episodesCreated = 0;
    const activeIds: string[] = [];

    for (const item of syncResult.items) {
      const result = await upsertMediaItem(item);
      activeIds.push(item.external_id);
      if (result.created) {
        created++;
      } else {
        updated++;
      }

      // Fetch and upsert episodes for this series
      const seriesId = parseInt(item.external_id, 10);
      const episodes = await client.getEpisodes(seriesId);
      
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
    const stats = await getStats();

    await completeSyncLog(logId, {
      status: 'success',
      items_synced: syncResult.items.length,
      items_created: created,
      items_updated: updated,
      items_deleted: deleted,
    });

    return NextResponse.json({
      success: true,
      upserted: syncResult.items.length,
      created,
      updated,
      deleted,
      episodesCreated,
      stats: syncResult.stats,
      total: stats.total,
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

    console.error('Sonarr sync error:', error);
    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
      },
      { status: 500 }
    );
  }
}
