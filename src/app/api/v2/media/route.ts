import { NextRequest, NextResponse } from 'next/server';
import { getAllMedia, updateMediaItem, getStats } from '@/media/lib/database';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  
  const filters = {
    type: searchParams.get('type') || undefined,
    status: searchParams.get('status') || undefined,
    query: searchParams.get('query') || undefined,
  };

  const items = await await getAllMedia(filters);
  const stats = await await getStats();

  return NextResponse.json({ items, stats });
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updates } = body;

    if (!id || typeof id !== 'number' || !Number.isInteger(id) || id <= 0) {
      return NextResponse.json(
        { error: 'id must be a positive integer' },
        { status: 400 }
      );
    }

    const allowedFields = ['status', 'progress', 'notes', 'rating'];
    const invalidFields = Object.keys(updates).filter(key => !allowedFields.includes(key));
    if (invalidFields.length > 0) {
      return NextResponse.json(
        { error: `Invalid fields: ${invalidFields.join(', ')}` },
        { status: 400 }
      );
    }

    const validStatuses = ['wanted', 'owned', 'in_progress', 'completed', 'abandoned'];
    if (updates.status !== undefined && !validStatuses.includes(updates.status)) {
      return NextResponse.json(
        { error: `status must be one of: ${validStatuses.join(', ')}` },
        { status: 400 }
      );
    }

    if (updates.progress !== undefined) {
      if (typeof updates.progress !== 'number' || !isFinite(updates.progress) || updates.progress < 0 || updates.progress > 1) {
        return NextResponse.json(
          { error: 'progress must be a number between 0 and 1' },
          { status: 400 }
        );
      }
    }

    if (updates.notes !== undefined && updates.notes !== null && typeof updates.notes !== 'string') {
      return NextResponse.json(
        { error: 'notes must be a string or null' },
        { status: 400 }
      );
    }

    if (updates.rating !== undefined) {
      if (updates.rating !== null && (typeof updates.rating !== 'number' || !Number.isInteger(updates.rating) || updates.rating < 1 || updates.rating > 5)) {
        return NextResponse.json(
          { error: 'rating must be null or an integer between 1 and 5' },
          { status: 400 }
        );
      }
    }

    const updated = await await updateMediaItem(id, updates);

    if (!updated) {
      return NextResponse.json(
        { error: 'Item not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, item: updated });
  } catch (error) {
    console.error('Update error:', error);
    return NextResponse.json(
      { error: 'Update failed' },
      { status: 500 }
    );
  }
}
