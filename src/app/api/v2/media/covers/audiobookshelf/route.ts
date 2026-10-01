import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const itemId = searchParams.get('id');

  if (!itemId) {
    return new NextResponse('Missing item id', { status: 400 });
  }

  const absUrl = process.env.ABS_URL || 'http://localhost:13378';
  const apiKey = process.env.ABS_API_KEY || '';

  try {
    const response = await fetch(`${absUrl}/api/items/${itemId}/cover`, {
      headers: apiKey ? { 'Authorization': `Bearer ${apiKey}` } : {},
    });

    if (!response.ok) {
      return new NextResponse('Cover not found', { status: 404 });
    }

    const contentType = response.headers.get('content-type') || 'image/jpeg';
    const buffer = await response.arrayBuffer();

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400',
      },
    });
  } catch (error) {
    console.error('Cover proxy error:', error);
    return new NextResponse('Failed to fetch cover', { status: 500 });
  }
}
