import { NextRequest, NextResponse } from 'next/server';
import { getMediaByIdWithSources } from '@/media/lib/database';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const itemId = parseInt(id, 10);

  if (isNaN(itemId)) {
    return NextResponse.json(
      { error: 'Invalid ID' },
      { status: 400 }
    );
  }

  const item = await getMediaByIdWithSources(itemId);

  if (!item) {
    return NextResponse.json(
      { error: 'Item not found' },
      { status: 404 }
    );
  }

  return NextResponse.json(item);
}
