/**
 * Sonarr API Client
 * 
 * Sonarr is a TV series collection manager. This client syncs TV series data
 * including episode tracking, download status, and metadata.
 */

interface SonarrEpisode {
  id: number;
  seriesId: number;
  tvdbId?: number;
  episodeFileId?: number;
  seasonNumber: number;
  episodeNumber: number;
  title: string;
  airDate: string;
  airDateUtc?: string;
  runtime?: number;
  overview?: string;
  hasFile: boolean;
  monitored: boolean;
  absoluteEpisodeNumber?: number;
  images?: Array<{
    coverType: string;
    remoteUrl: string;
  }>;
}

interface SonarrSeries {
  id: number;
  title: string;
  year: number;
  overview: string;
  runtime: number;
  tvdbId: number;
  tmdbId: number;
  imdbId: string;
  genres: string[];
  monitored: boolean;
  status: string;
  images: Array<{
    coverType: string;
    remoteUrl: string;
  }>;
  ratings: {
    value: number;
    votes: number;
  };
  seasons: Array<{
    seasonNumber: number;
    monitored: boolean;
    statistics: {
      episodeFileCount: number;
      episodeCount: number;
      percentOfEpisodes: number;
    };
  }>;
  statistics: {
    seasonCount: number;
    episodeFileCount: number;
    episodeCount: number;
    percentOfEpisodes: number;
  };
  added: string;
}

class SonarrClient {
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
      throw new Error(`Sonarr API error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  async getSeries(): Promise<SonarrSeries[]> {
    return this.fetch<SonarrSeries[]>('/api/v3/series');
  }

  async getEpisodes(seriesId: number): Promise<SonarrEpisode[]> {
    return this.fetch<SonarrEpisode[]>(`/api/v3/episode?seriesId=${seriesId}`);
  }

  async syncSeries(): Promise<{
    items: Array<{
      title: string;
      subtitle: string | null;
      media_type: 'tv';
      creators: string[];
      performers: string[];
      series_name: string | null;
      series_position: number | null;
      year: number | null;
      genres: string[];
      duration_seconds: number | null;
      image_url: string | null;
      description: string | null;
      external_source: 'sonarr';
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
    const series = await this.getSeries();
    
    const items = series.map((show) => {
      // Determine status based on ownership (hasFile), not watched state
      let status: 'wanted' | 'owned' | 'in_progress' | 'completed' | 'abandoned';
      let progress = 0; // Progress will be calculated from watched episodes
      let completedAt: string | null = null;

      if (show.statistics.percentOfEpisodes === 100) {
        // All episodes downloaded - mark as owned
        status = 'owned';
      } else if (show.statistics.percentOfEpisodes > 0) {
        // Some episodes downloaded
        status = 'owned';
      } else if (show.monitored) {
        // No episodes but monitored
        status = 'wanted';
      } else {
        // No episodes and not monitored
        status = 'wanted';
      }

      // Get poster image
      const posterImage = show.images.find(img => img.coverType === 'poster');
      const imageUrl = posterImage?.remoteUrl || null;

      return {
        title: show.title,
        subtitle: null,
        media_type: 'tv' as const,
        creators: [], // Sonarr doesn't provide creator info in this endpoint
        performers: [],
        series_name: null,
        series_position: null,
        year: show.year || null,
        genres: show.genres || [],
        duration_seconds: show.runtime ? show.runtime * 60 : null,
        image_url: imageUrl,
        description: show.overview || null,
        external_source: 'sonarr' as const,
        external_id: show.id.toString(),
        metadata: {
          tvdbId: show.tvdbId,
          tmdbId: show.tmdbId,
          imdbId: show.imdbId,
          monitored: show.monitored,
          seriesStatus: show.status,
          seasonCount: show.statistics.seasonCount,
          episodeCount: show.statistics.episodeCount,
          episodeFileCount: show.statistics.episodeFileCount,
          percentComplete: show.statistics.percentOfEpisodes,
          rating: show.ratings.value || null,
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
export function createSonarrClient(): SonarrClient {
  const baseUrl = process.env.SONARR_URL || 'http://localhost:8989';
  const apiKey = process.env.SONARR_API_KEY || '';

  if (!apiKey) {
    throw new Error('SONARR_API_KEY environment variable is required');
  }

  return new SonarrClient(baseUrl, apiKey);
}

export default SonarrClient;
export type { SonarrSeries };
