import { NextResponse } from 'next/server';
import { getSyncLog, getLastSyncBySource } from '@/media/lib/database';

export async function GET() {
  try {
    const history = await getSyncLog(20);
    const lastBySource = await getLastSyncBySource();

    return NextResponse.json({
      history,
      lastBySource,
    });
  } catch (error) {
    console.error('Sync log error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch sync log' },
      { status: 500 }
    );
  }
}
