import { NextResponse } from 'next/server';
import { createTMDBClient } from '@/media/lib/tmdb';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');
    const type = searchParams.get('type') || 'multi';
    const page = parseInt(searchParams.get('page') || '1');

    if (!query) {
      return NextResponse.json(
        { error: 'Query parameter "q" is required' },
        { status: 400 }
      );
    }

    const client = createTMDBClient();
    
    let results;
    if (type === 'movie') {
      results = await client.searchMovies(query, page);
    } else if (type === 'tv') {
      results = await client.searchTV(query, page);
    } else {
      results = await client.searchMulti(query, page);
    }

    // Transform results to include image URLs
    const transformedResults = results.results.map(item => ({
      ...item,
      poster_url: client.getImageUrl(item.poster_path, 'w500'),
      backdrop_url: client.getImageUrl(item.backdrop_path, 'w780'),
      title: item.title || item.name,
      release_date: item.release_date || item.first_air_date,
    }));

    return NextResponse.json({
      results: transformedResults,
      total_results: results.total_results,
      total_pages: results.total_pages,
      page: results.page,
    });
  } catch (error) {
    console.error('TMDB search error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Search failed' },
      { status: 500 }
    );
  }
}
