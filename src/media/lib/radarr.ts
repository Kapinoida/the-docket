/**
 * Radarr API Client
 * 
 * Radarr is a movie collection manager. This client syncs movie data
 * including download status, quality, and metadata.
 */

interface RadarrMovie {
  id: number;
  title: string;
  year: number;
  overview: string;
  runtime: number;
  tmdbId: number;
  imdbId: string;
  genres: string[];
  monitored: boolean;
  hasFile: boolean;
  status: string;
  images: Array<{
    coverType: string;
    remoteUrl: string;
  }>;
  ratings: {
    imdb?: { value: number; votes: number };
    tmdb?: { value: number; votes: number };
  };
  movieFile?: {
    quality: {
      quality: {
        name: string;
        resolution: number;
      };
    };
    size: number;
    dateAdded: string;
  };
  added: string;
}

class RadarrClient {
  private baseUrl: string;
  private apiKey: string;

  constructor(baseUrl: string, apiKey: string) {
    this.baseUrl = baseUrl;
    this.apiKey = apiKey;
  }

  private async fetch<T>(endpoint: string): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      headers: {
        'X-Api-Key': this.apiKey,
      },
    });

    if (!response.ok) {
      throw new Error(`Radarr API error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  async getMovies(): Promise<RadarrMovie[]> {
    return this.fetch<RadarrMovie[]>('/api/v3/movie');
  }

  async syncMovies(): Promise<{
    items: Array<{
      title: string;
      subtitle: string | null;
      media_type: 'movie';
      creators: string[];
      performers: string[];
      series_name: string | null;
      series_position: number | null;
      year: number | null;
      genres: string[];
      duration_seconds: number | null;
      image_url: string | null;
      description: string | null;
      external_source: 'radarr';
      external_id: string;
      metadata: Record<string, unknown>;
      status: 'wanted' | 'owned' | 'in_progress' | 'completed' | 'abandoned';
      progress: number;
      started_at: string | null;
      completed_at: string | null;
    }>;
    stats: {
      total: number;
      owned: number;
      wanted: number;
    };
  }> {
    const movies = await this.getMovies();
    
    const items = movies.map((movie) => {
      // Determine status based on ownership (hasFile), not watched state
      let status: 'wanted' | 'owned' | 'in_progress' | 'completed' | 'abandoned';
      let progress = 0; // Progress will be set by Plex when watched
      let completedAt: string | null = null;

      if (movie.hasFile) {
        // Movie is downloaded - mark as owned
        status = 'owned';
      } else if (movie.monitored) {
        // Movie is wanted but not downloaded
        status = 'wanted';
      } else {
        // Movie is not monitored and not downloaded
        status = 'wanted';
      }

      // Get poster image
      const posterImage = movie.images.find(img => img.coverType === 'poster');
      const imageUrl = posterImage?.remoteUrl || null;

      return {
        title: movie.title,
        subtitle: null,
        media_type: 'movie' as const,
        creators: [], // Radarr doesn't provide director info in this endpoint
        performers: [],
        series_name: null,
        series_position: null,
        year: movie.year || null,
        genres: movie.genres || [],
        duration_seconds: movie.runtime ? movie.runtime * 60 : null,
        image_url: imageUrl,
        description: movie.overview || null,
        external_source: 'radarr' as const,
        external_id: movie.id.toString(),
        metadata: {
          tmdbId: movie.tmdbId,
          imdbId: movie.imdbId,
          monitored: movie.monitored,
          hasFile: movie.hasFile,
          quality: movie.movieFile?.quality.quality.name || null,
          resolution: movie.movieFile?.quality.quality.resolution || null,
          fileSize: movie.movieFile?.size || null,
          ratings: {
            imdb: movie.ratings.imdb?.value || null,
            tmdb: movie.ratings.tmdb?.value || null,
          },
        },
        status,
        progress,
        started_at: null,
        completed_at: completedAt,
      };
    });

    const owned = items.filter(item => item.status === 'owned').length;
    const wanted = items.filter(item => item.status === 'wanted').length;

    return {
      items,
      stats: {
        total: items.length,
        owned,
        wanted,
      },
    };
  }
}

// Factory function to create client from environment
export function createRadarrClient(): RadarrClient {
  const baseUrl = process.env.RADARR_URL || 'http://localhost:7878';
  const apiKey = process.env.RADARR_API_KEY || '';

  if (!apiKey) {
    throw new Error('RADARR_API_KEY environment variable is required');
  }

  return new RadarrClient(baseUrl, apiKey);
}

export default RadarrClient;
export type { RadarrMovie };
