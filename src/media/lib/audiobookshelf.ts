import fs from 'fs';
import path from 'path';

interface ABSLibrary {
  id: string;
  name: string;
  mediaType: string;
}

interface ABSAuthor {
  id?: string;
  name: string;
}

interface ABSSeries {
  id: string;
  name: string;
  sequence: string;
}

interface ABSMetadata {
  title: string;
  subtitle?: string;
  authorName?: string;
  narratorName?: string;
  authors?: ABSAuthor[];
  narrators?: string[];
  seriesName?: string;
  series?: ABSSeries[];
  publishedYear?: string;
  genres?: string[];
  description?: string;
}

interface ABSMedia {
  metadata: ABSMetadata;
  duration: number;
  coverPath?: string;
}

interface ABSItem {
  id: string;
  inLibrary: boolean;
  libraryId: string;
  media: ABSMedia;
  numTracks?: number;
  size?: number;
}

interface ABSProgress {
  libraryItemId: string;
  progress: number;
  currentTime: number;
  isFinished: boolean;
  finishedAt?: string;
  startedAt?: string;
  lastUpdate: number;
}

interface ABSResponse<T> {
  results: T[];
  total: number;
  limit: number;
  page: number;
}

class AudiobookshelfClient {
  private baseUrl: string;
  private apiKey: string;

  constructor(baseUrl: string, apiKey: string) {
    this.baseUrl = baseUrl;
    this.apiKey = apiKey;
  }

  private async fetch<T>(endpoint: string): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
      },
    });

    if (!response.ok) {
      throw new Error(`ABS API error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  async getLibraries(): Promise<ABSLibrary[]> {
    const data = await this.fetch<ABSLibrary[]>('/api/libraries');
    
    return Array.isArray(data) ? data : (data as any).libraries || [];
  }

  async getLibraryItems(libraryId: string, limit = 0): Promise<ABSItem[]> {
    const endpoint = `/api/libraries/${libraryId}/items?limit=${limit}`;
    const data = await this.fetch<ABSResponse<ABSItem>>(endpoint);
    return data.results || [];
  }

  async getUserProgress(): Promise<ABSProgress[]> {
    const data = await this.fetch<{ mediaProgress: ABSProgress[] }>('/api/me/progress');
    return Array.isArray(data.mediaProgress) ? data.mediaProgress : [];
  }

  async getListeningStats(): Promise<any> {
    return this.fetch('/api/me/listening-stats');
  }

  /**
   * Sync all audiobooks from Audiobookshelf
   */
  async syncAll(): Promise<{
    items: Array<{
      title: string;
      subtitle: string | null;
      media_type: 'audiobook';
      creators: string[];
      performers: string[];
      series_name: string | null;
      series_position: number | null;
      year: number | null;
      genres: string[];
      duration_seconds: number | null;
      image_url: string | null;
      description: string | null;
      external_source: 'audiobookshelf';
      external_id: string;
      metadata: Record<string, unknown>;
      status: 'wanted' | 'owned' | 'in_progress' | 'completed' | 'abandoned';
      progress: number;
      started_at: string | null;
      completed_at: string | null;
    }>;
    stats: {
      total: number;
      inProgress: number;
      completed: number;
    };
  }> {
    const libraries = await this.getLibraries();
    const progressList = await this.getUserProgress();
    
    // Create a map of progress by library item ID
    const progressMap = new Map<string, ABSProgress>();
    for (const progress of progressList) {
      progressMap.set(progress.libraryItemId, progress);
    }

    const items: any[] = [];
    let totalItems = 0;
    let inProgressCount = 0;
    let completedCount = 0;

    // Fetch items from each library
    for (const library of libraries) {
      const libraryItems = await this.getLibraryItems(library.id);
      
      for (const item of libraryItems) {
        const progress = progressMap.get(item.id);
        const metadata = item.media.metadata;
        
        // Determine status and progress
        let status: 'wanted' | 'owned' | 'in_progress' | 'completed' | 'abandoned' = 'owned';
        let progressValue = 0;
        let startedAt: string | null = null;
        let completedAt: string | null = null;

        if (progress) {
          progressValue = progress.progress;
          
          if (progress.isFinished) {
            status = 'completed';
            completedAt = progress.finishedAt || new Date(progress.lastUpdate).toISOString();
            completedCount++;
          } else if (progress.progress > 0) {
            status = 'in_progress';
            startedAt = progress.startedAt || null;
            inProgressCount++;
          }
        }

        // Extract series info
        const series = metadata.series?.[0];
        let seriesName = metadata.seriesName || series?.name || null;
        let seriesPosition: number | null = null;
        
        // Parse series position from seriesName if it contains #
        if (seriesName && seriesName.includes('#')) {
          const parts = seriesName.split('#');
          if (parts.length === 2) {
            seriesName = parts[0].trim();
            const position = parseInt(parts[1].trim(), 10);
            if (!isNaN(position)) {
              seriesPosition = position;
            }
          }
        } else if (series?.sequence) {
          seriesPosition = parseInt(series.sequence, 10);
        }

        // Build the item
        items.push({
          title: metadata.title,
          subtitle: metadata.subtitle || null,
          media_type: 'audiobook' as const,
          creators: metadata.authors?.map(a => a.name) || (metadata.authorName ? [metadata.authorName] : []),
          performers: metadata.narrators || (metadata.narratorName ? [metadata.narratorName] : []),
          series_name: seriesName,
          series_position: isNaN(seriesPosition as number) ? null : seriesPosition,
          year: metadata.publishedYear ? parseInt(metadata.publishedYear, 10) : null,
          genres: metadata.genres || [],
          duration_seconds: item.media.duration || null,
          image_url: `/api/covers/${item.id}`,
          description: metadata.description || null,
          external_source: 'audiobookshelf' as const,
          external_id: item.id,
          metadata: {
            libraryId: item.libraryId,
            inLibrary: item.inLibrary,
            lastUpdate: progress?.lastUpdate || null,
          },
          status,
          progress: progressValue,
          started_at: startedAt,
          completed_at: completedAt,
        });
      }
      
      totalItems += libraryItems.length;
    }

    return {
      items,
      stats: {
        total: totalItems,
        inProgress: inProgressCount,
        completed: completedCount,
      },
    };
  }
}

// Factory function to create client from environment
export function createABSClient(): AudiobookshelfClient {
  const baseUrl = process.env.ABS_URL || 'http://localhost:13378';
  const apiKey = process.env.ABS_API_KEY || '';

  if (!apiKey) {
    throw new Error('ABS_API_KEY environment variable is required');
  }

  return new AudiobookshelfClient(baseUrl, apiKey);
}

export default AudiobookshelfClient;
export type { ABSLibrary, ABSItem, ABSProgress };
