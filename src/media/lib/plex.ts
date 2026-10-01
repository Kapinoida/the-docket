/**
 * Plex API Client
 * 
 * Plex provides media playback history and watched state.
 * This client syncs watch history from Plex to track actual consumption.
 */

interface PlexHistoryEntry {
  viewOffset: number;
  viewedAt: number;
  key: string;
  title: string;
  type: 'movie' | 'episode';
  grandparentTitle?: string;
  parentTitle?: string;
  year?: number;
  duration?: number;
  thumb?: string;
  guid?: string;
  Guid?: Array<{ id: string }>;
  ratingKey?: string;
  grandparentKey?: string;
  parentKey?: string;
  index?: number;
  parentIndex?: number;
  accountID?: number;
}

interface PlexMediaItem {
  ratingKey: string;
  key: string;
  title: string;
  type: 'movie' | 'show' | 'episode';
  year?: number;
  duration?: number;
  thumb?: string;
  grandparentTitle?: string;
  parentTitle?: string;
  index?: number;
  parentIndex?: number;
}

class PlexClient {
  private baseUrl: string;
  private token: string;
  private accountId: number | null = null;

  constructor(baseUrl: string, token: string) {
    this.baseUrl = baseUrl;
    this.token = token;
  }

  private async fetch<T>(endpoint: string): Promise<T> {
    const url = new URL(endpoint, this.baseUrl);
    url.searchParams.append('X-Plex-Token', this.token);

    const response = await fetch(url.toString(), {
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Plex API error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  async getCurrentAccountId(): Promise<number> {
    if (this.accountId !== null) {
      return this.accountId;
    }

    try {
      // Get all accounts and find the one that matches the token owner
      const data = await this.fetch<{ MediaContainer: { Account: Array<{ id: number; name: string }> } }>('/accounts');
      const accounts = data.MediaContainer.Account || [];
      
      // The token owner is typically the first account (admin/owner)
      // We'll use the first account with a name as the primary user
      const primaryAccount = accounts.find(acc => acc.name && acc.name.length > 0);
      
      if (primaryAccount) {
        this.accountId = primaryAccount.id;
        return this.accountId;
      }
      
      // Fallback to first account if no named account found
      if (accounts.length > 0) {
        this.accountId = accounts[0].id;
        return this.accountId;
      }
      
      throw new Error('No Plex accounts found');
    } catch (error) {
      throw new Error(`Unable to determine Plex account ID: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getHistory(count: number = 50, accountId?: number): Promise<PlexHistoryEntry[]> {
    let endpoint = `/status/sessions/history/all?count=${count}`;
    if (accountId) {
      endpoint += `&accountID=${accountId}`;
    }
    
    const data = await this.fetch<{ MediaContainer: { Metadata?: PlexHistoryEntry[] } }>(endpoint);
    return data.MediaContainer.Metadata || [];
  }

  async getAllLibraries(): Promise<Array<{ key: string; type: string; title: string }>> {
    const data = await this.fetch<{ MediaContainer: { Directory?: Array<{ key: string; type: string; title: string }> } }>(
      '/library/sections'
    );
    return data.MediaContainer.Directory || [];
  }

  async getLibraryItems(libraryKey: string): Promise<PlexMediaItem[]> {
    const data = await this.fetch<{ MediaContainer: { Metadata?: PlexMediaItem[] } }>(
      `/library/sections/${libraryKey}/all`
    );
    return data.MediaContainer.Metadata || [];
  }

  async getMetadata(plexKey: string): Promise<PlexHistoryEntry | null> {
    try {
      const data = await this.fetch<{ MediaContainer: { Metadata?: PlexHistoryEntry[] } }>(
        plexKey
      );
      return data.MediaContainer.Metadata?.[0] || null;
    } catch {
      return null;
    }
  }

  async syncWatchHistory(): Promise<{
    history: Array<{
      plexKey: string;
      watchedAt: string;
      title: string;
      type: 'movie' | 'episode';
      seriesTitle?: string;
      seasonNumber?: number;
      episodeNumber?: number;
      durationSeconds?: number;
      progress?: number;
      imdbId?: string;
      tmdbId?: number;
      tvdbId?: number;
    }>;
    stats: {
      total: number;
      movies: number;
      episodes: number;
    };
    accountId: number;
  }> {
    // Get the current user's account ID to filter history
    const accountId = await this.getCurrentAccountId();
    
    // Only get history for the authenticated user
    const history = await this.getHistory(100, accountId);

    const items = [];
    for (const entry of history) {
      // Skip entries without required fields
      if (!entry.key || !entry.title || !entry.type) {
        continue;
      }

      const watchedAt = new Date(entry.viewedAt * 1000).toISOString();
      const progress = entry.duration ? entry.viewOffset / entry.duration : 1.0;

      // Fetch detailed metadata to get external IDs
      const metadata = await this.getMetadata(entry.key);
      
      // Extract external IDs from Guid array
      let imdbId: string | undefined;
      let tmdbId: number | undefined;
      let tvdbId: number | undefined;
      
      if (metadata?.Guid) {
        for (const guid of metadata.Guid) {
          if (guid.id.startsWith('imdb://')) {
            imdbId = guid.id.replace('imdb://', '');
          } else if (guid.id.startsWith('tmdb://')) {
            tmdbId = parseInt(guid.id.replace('tmdb://', ''));
          } else if (guid.id.startsWith('tvdb://')) {
            tvdbId = parseInt(guid.id.replace('tvdb://', ''));
          }
        }
      }

      items.push({
        plexKey: entry.key,
        watchedAt,
        title: entry.title,
        type: entry.type,
        seriesTitle: entry.grandparentTitle,
        seasonNumber: entry.type === 'episode' ? (metadata?.parentIndex || (entry.parentTitle ? parseInt(entry.parentTitle.replace('Season ', '') || '0') : undefined)) : undefined,
        episodeNumber: entry.type === 'episode' ? (metadata?.index || (entry.key ? parseInt(entry.key.split('/').pop() || '0') : undefined)) : undefined,
        durationSeconds: entry.duration ? Math.round(entry.duration / 1000) : undefined,
        progress: Math.min(1.0, progress),
        imdbId,
        tmdbId,
        tvdbId,
      });
    }

    const movies = items.filter(i => i.type === 'movie').length;
    const episodes = items.filter(i => i.type === 'episode').length;

    return {
      history: items,
      stats: {
        total: items.length,
        movies,
        episodes,
      },
      accountId,
    };
  }
}

// Factory function to create client from environment
export function createPlexClient(): PlexClient {
  const baseUrl = process.env.PLEX_URL || 'http://localhost:32400';
  const token = process.env.PLEX_TOKEN || '';

  if (!token) {
    throw new Error('PLEX_TOKEN environment variable is required');
  }

  return new PlexClient(baseUrl, token);
}

export default PlexClient;
export type { PlexHistoryEntry, PlexMediaItem };
