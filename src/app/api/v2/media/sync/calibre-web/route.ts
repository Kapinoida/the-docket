import { NextRequest, NextResponse } from 'next/server';
import { requireAuthAppRouter, AuthError } from '@/lib/apiAuth';
import { syncCalibreWebEbooks, CalibreBook } from '@/media/lib/database';
import { startSyncLog, completeSyncLog } from '@/media/lib/database';

export interface CalibreWebSyncPayload {
  books: CalibreBook[];
  scan_complete: boolean;
  stats?: {
    total_books: number;
    books_with_progress: number;
    unmatched_checksums: number;
  };
}

export async function processCalibreWebSync(payload: CalibreWebSyncPayload) {
  // Start sync log
  const syncLogId = await startSyncLog('calibre-web');
  
  try {
    // Perform sync
    const result = await syncCalibreWebEbooks(
      payload.books,
      payload.scan_complete
    );
    
    // Update result with unmatched checksums from request
    result.unmatched_checksums = payload.stats?.unmatched_checksums || 0;
    
    // Complete sync log
    await completeSyncLog(syncLogId, {
      status: 'success',
      items_synced: result.total,
      items_created: result.created,
      items_updated: result.updated,
      items_deleted: result.deleted,
    });
    
    return {
      success: true,
      ...result,
    };
  } catch (error) {
    // Mark sync log as failed
    try {
      await completeSyncLog(syncLogId, {
        status: 'error',
        items_synced: 0,
        items_created: 0,
        items_updated: 0,
        items_deleted: 0,
        error_message: error instanceof Error ? error.message : 'Unknown error',
      });
    } catch (logError) {
      console.error('Failed to update sync log:', logError);
    }
    throw error;
  }
}

export function validateCalibreWebPayload(body: any): string | null {
  // Validate required fields
  if (!body.books || !Array.isArray(body.books)) {
    return 'books array is required';
  }
  
  if (typeof body.scan_complete !== 'boolean') {
    return 'scan_complete must be a boolean';
  }
  
  // Validate stats if provided
  if (body.stats) {
    if (typeof body.stats.total_books !== 'number' || body.stats.total_books < 0) {
      return 'stats.total_books must be a non-negative number';
    }
    if (typeof body.stats.books_with_progress !== 'number' || body.stats.books_with_progress < 0) {
      return 'stats.books_with_progress must be a non-negative number';
    }
    if (typeof body.stats.unmatched_checksums !== 'number' || body.stats.unmatched_checksums < 0) {
      return 'stats.unmatched_checksums must be a non-negative number';
    }
  }
  
  // Validate each book
  for (const book of body.books) {
    if (typeof book.calibre_id !== 'number' || !Number.isInteger(book.calibre_id)) {
      return 'calibre_id must be an integer';
    }
    if (typeof book.title !== 'string' || !book.title.trim()) {
      return 'title is required for each book';
    }
    if (!Array.isArray(book.authors)) {
      return 'authors must be an array for each book';
    }
    if (book.progress) {
      if (typeof book.progress.percentage !== 'number' || 
          book.progress.percentage < 0 || 
          book.progress.percentage > 1) {
        return 'progress.percentage must be a number between 0 and 1';
      }
    }
    if (book.formats && !Array.isArray(book.formats)) {
      return 'formats must be an array if provided';
    }
    if (book.checksums && !Array.isArray(book.checksums)) {
      return 'checksums must be an array if provided';
    }
  }
  
  return null;
}

export async function POST(request: NextRequest) {
  try {
    await requireAuthAppRouter(request);
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    throw error;
  }

  try {
    const body = await request.json();
    
    const validationError = validateCalibreWebPayload(body);
    if (validationError) {
      return NextResponse.json(
        { error: validationError },
        { status: 400 }
      );
    }
    
    const result = await processCalibreWebSync(body);
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('Calibre-Web sync error:', error);
    return NextResponse.json(
      { error: 'Sync failed' },
      { status: 500 }
    );
  }
}
