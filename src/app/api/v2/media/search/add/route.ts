import { NextResponse } from 'next/server';
import { createTMDBClient } from '@/media/lib/tmdb';
import { upsertMediaItem, getStats } from '@/media/lib/database';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { tmdbId, mediaType } = body;

    if (!tmdbId || !mediaType) {
      return NextResponse.json(
        { error: 'tmdbId and mediaType are required' },
        { status: 400 }
      );
    }

    if (!['movie', 'tv'].includes(mediaType)) {
      return NextResponse.json(
        { error: 'mediaType must be "movie" or "tv"' },
        { status: 400 }
      );
    }

    const client = createTMDBClient();

    // Fetch details from TMDB
    let details;
    if (mediaType === 'movie') {
      details = await client.getMovieDetails(tmdbId);
    } else {
      details = await client.getTVDetails(tmdbId);
    }

    // Transform to our media item format
    const isMovie = mediaType === 'movie';
    const title = isMovie ? (details as any).title : (details as any).name;
    const releaseDate = isMovie ? (details as any).release_date : (details as any).first_air_date;
    const year = releaseDate ? parseInt(releaseDate.split('-')[0]) : null;
    const durationSeconds = isMovie 
      ? (details as any).runtime * 60 
      : (details as any).episode_run_time?.[0] ? (details as any).episode_run_time[0] * 60 : null;

    const mediaItem = {
      title,
      subtitle: (details as any).tagline || null,
      media_type: mediaType as 'movie' | 'tv',
      creators: [], // TMDB doesn't provide directors/creators in basic details
      performers: [],
      series_name: null,
      series_position: null,
      year,
      genres: details.genres.map(g => g.name),
      duration_seconds: durationSeconds,
      image_url: client.getImageUrl(details.poster_path, 'w500'),
      description: details.overview || null,
      external_source: 'tmdb',
      external_id: tmdbId.toString(),
      metadata: {
        tmdbId: details.id,
        imdbId: isMovie ? (details as any).imdb_id : null,
        voteAverage: details.vote_average,
        voteCount: details.vote_count,
        backdropUrl: client.getImageUrl(details.backdrop_path, 'w1280'),
        status: details.status,
        ...(isMovie ? {
          budget: (details as any).budget,
          revenue: (details as any).revenue,
        } : {
          numberOfSeasons: (details as any).number_of_seasons,
          numberOfEpisodes: (details as any).number_of_episodes,
        }),
      },
      status: 'wanted' as const,
      progress: 0,
      started_at: null,
      completed_at: null,
    };

    // Upsert to database
    const { item: saved } = await upsertMediaItem(mediaItem);
    const stats = await getStats();

    return NextResponse.json({
      success: true,
      item: saved,
      stats,
    });
  } catch (error) {
    console.error('TMDB add error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to add item' },
      { status: 500 }
    );
  }
}
