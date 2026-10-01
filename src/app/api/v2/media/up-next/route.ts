import { NextRequest, NextResponse } from 'next/server';
import {
  addToPlanningQueue,
  getPlanningQueue,
  updatePlanningQueueItem,
} from '@/media/lib/database';

export async function GET() {
  return NextResponse.json(await getPlanningQueue());
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const mediaItemId = body.mediaItemId;
    const queueStatus = body.queueStatus || 'up_next';

    if (!Number.isInteger(mediaItemId) || mediaItemId <= 0) {
      return NextResponse.json({ error: 'mediaItemId must be a positive integer' }, { status: 400 });
    }
    if (!['up_next', 'backlog'].includes(queueStatus)) {
      return NextResponse.json({ error: 'queueStatus must be up_next or backlog' }, { status: 400 });
    }

    const item = await addToPlanningQueue(mediaItemId, queueStatus);
    if (!item) return NextResponse.json({ error: 'Media item not found' }, { status: 404 });
    return NextResponse.json({ success: true, item });
  } catch (error) {
    console.error('Up Next add error:', error);
    return NextResponse.json({ error: 'Failed to add item to Up Next' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    if (!Array.isArray(body.items)) {
      return NextResponse.json({ error: 'items are required' }, { status: 400 });
    }

    for (const item of body.items) {
      if (!Number.isInteger(item.queueId) || !Number.isInteger(item.position) || item.position < 0) {
        return NextResponse.json({ error: 'Each item needs a valid queueId and position' }, { status: 400 });
      }
      await updatePlanningQueueItem(item.queueId, { position: item.position });
    }

    return NextResponse.json({ success: true, queue: await getPlanningQueue() });
  } catch (error) {
    console.error('Up Next reorder error:', error);
    return NextResponse.json({ error: 'Failed to reorder Up Next' }, { status: 500 });
  }
}
