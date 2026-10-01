import { NextRequest, NextResponse } from 'next/server';
import {
  completePlanningQueueItem,
  removePlanningQueueItem,
  updatePlanningQueueItem,
} from '@/media/lib/database';

type Params = { params: Promise<{ id: string }> };

function queueIdFromParams(params: { id: string }) {
  const id = Number(params.id);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const queueId = queueIdFromParams(await params);
  if (!queueId) return NextResponse.json({ error: 'Invalid queue item ID' }, { status: 400 });

  try {
    const body = await request.json();
    if (body.action === 'complete') {
      const item = await completePlanningQueueItem(queueId);
      return item ? NextResponse.json({ success: true, item }) : NextResponse.json({ error: 'Queue item not found' }, { status: 404 });
    }

    if (body.queueStatus !== 'up_next' && body.queueStatus !== 'backlog') {
      return NextResponse.json({ error: 'queueStatus must be up_next or backlog' }, { status: 400 });
    }
    const item = await updatePlanningQueueItem(queueId, { queueStatus: body.queueStatus });
    return item ? NextResponse.json({ success: true, item }) : NextResponse.json({ error: 'Queue item not found' }, { status: 404 });
  } catch (error) {
    console.error('Up Next update error:', error);
    return NextResponse.json({ error: 'Failed to update queue item' }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  const queueId = queueIdFromParams(await params);
  if (!queueId) return NextResponse.json({ error: 'Invalid queue item ID' }, { status: 400 });
  return await removePlanningQueueItem(queueId)
    ? NextResponse.json({ success: true })
    : NextResponse.json({ error: 'Queue item not found' }, { status: 404 });
}
