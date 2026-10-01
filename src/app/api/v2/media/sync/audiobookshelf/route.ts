import { NextResponse } from 'next/server';
import { createABSClient } from '@/media/lib/audiobookshelf';
import { upsertMediaItem, getStats, startSyncLog, completeSyncLog, markDeletedItems } from '@/media/lib/database';

export async function POST() {
  const logId = await startSyncLog('audiobookshelf');

  try {
    const client = createABSClient();
    const syncResult = await client.syncAll();

    let created = 0;
    let updated = 0;
    const activeIds: string[] = [];

    for (const item of syncResult.items) {
      const result = await upsertMediaItem(item);
      activeIds.push(item.external_id);
      if (result.created) {
        created++;
      } else {
        updated++;
      }
    }

    const deleted = await markDeletedItems('audiobookshelf', activeIds);
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

    console.error('Audiobookshelf sync error:', error);
    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
      },
      { status: 500 }
    );
  }
}
