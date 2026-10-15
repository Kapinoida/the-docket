import { NextRequest, NextResponse } from 'next/server';
import { requireAuthAppRouter, AuthError } from '@/lib/apiAuth';
import pool from '@/lib/db';
import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

export async function resolveCalibreCover(bookId: number) {
  // Look up the book in the database
  const bookResult = await pool.query(
    `SELECT metadata 
     FROM media_items 
     WHERE external_source = 'calibre-web' 
     AND external_id = $1
     AND source_deleted_at IS NULL
     LIMIT 1`,
    [String(bookId)]
  );

  if (bookResult.rows.length === 0) {
    return { error: 'Book not found', status: 404 };
  }

  const metadata = bookResult.rows[0].metadata as any;
  const bookPath = metadata.book_path;

  if (!bookPath) {
    return { error: 'Book path not found', status: 404 };
  }

  // Get Calibre library path from environment
  const calibreLibraryPath = process.env.CALIBRE_LIBRARY_PATH;
  if (!calibreLibraryPath) {
    return { error: 'Calibre library path not configured', status: 500 };
  }

  // Construct cover file path
  const coverPathJpg = path.join(calibreLibraryPath, bookPath, 'cover.jpg');
  const coverPathPng = path.join(calibreLibraryPath, bookPath, 'cover.png');

  if (existsSync(coverPathJpg)) {
    const imageBuffer = await readFile(coverPathJpg);
    return { buffer: imageBuffer, contentType: 'image/jpeg' };
  }

  if (existsSync(coverPathPng)) {
    const imageBuffer = await readFile(coverPathPng);
    return { buffer: imageBuffer, contentType: 'image/png' };
  }

  return { error: 'Cover image not found', status: 404 };
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAuthAppRouter(request);
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    throw error;
  }

  try {
    const calibreId = parseInt(params.id, 10);
    
    if (isNaN(calibreId)) {
      return NextResponse.json(
        { error: 'Invalid book ID' },
        { status: 400 }
      );
    }

    const result = await resolveCalibreCover(calibreId);

    if ('error' in result) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return new NextResponse(result.buffer, {
      status: 200,
      headers: {
        'Content-Type': result.contentType,
        'Cache-Control': 'public, max-age=86400', // 1 day
      },
    });
  } catch (error) {
    console.error('Cover proxy error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch cover' },
      { status: 500 }
    );
  }
}
