import { NextRequest, NextResponse } from 'next/server';
import { createABSClient } from '@/media/lib/audiobookshelf';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const client = createABSClient();
    
    // Fetch the cover image from Audiobookshelf
    const absUrl = process.env.ABS_URL || 'http://localhost:13378';
    const coverUrl = `${absUrl}/api/items/${id}/cover`;
    
    const response = await fetch(coverUrl, {
      headers: {
        'Authorization': `Bearer ${process.env.ABS_API_KEY}`,
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Cover not found' },
        { status: 404 }
      );
    }

    // Get the image data
    const imageBuffer = await response.arrayBuffer();
    const contentType = response.headers.get('content-type') || 'image/jpeg';

    // Return the image with proper headers
    return new NextResponse(imageBuffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
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
