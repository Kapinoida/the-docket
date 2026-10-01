/**
 * TMDB API Client
 * 
 * The Movie Database (TMDB) provides metadata for movies and TV shows.
 * This client handles search, details, and image URLs.
 */

const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p';

interface TMDBSearchResult {
  id: number;
  title?: string;
  name?: string;
  original_title?: string;
  original_name?: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  release_date?: string;
  first_air_date?: string;
  vote_average: number;
  vote_count: number;
  genre_ids: number[];
  media_type: 'movie' | 'tv';
}

interface TMDBMovieDetails {
  id: number;
  title: string;
  original_title: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  release_date: string;
  runtime: number;
  vote_average: number;
  vote_count: number;
  genres: Array<{ id: number; name: string }>;
  tagline?: string;
  status: string;
  budget?: number;
  revenue?: number;
  imdb_id?: string;
}

interface TMDBTVDetails {
  id: number;
  name: string;
  original_name: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  first_air_date: string;
  episode_run_time: number[];
  vote_average: number;
  vote_count: number;
  genres: Array<{ id: number; name: string }>;
  number_of_seasons: number;
  number_of_episodes: number;
  status: string;
  tagline?: string;
}

class TMDBClient {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  private async fetch<T>(endpoint: string, params: Record<string, string> = {}): Promise<T> {
    const url = new URL(`${TMDB_BASE_URL}${endpoint}`);
    url.searchParams.append('api_key', this.apiKey);
    url.searchParams.append('language', 'en-US');
    
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.append(key, value);
    });

    const response = await fetch(url.toString());

    if (!response.ok) {
      throw new Error(`TMDB API error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  async searchMulti(query: string, page: number = 1): Promise<{
    results: TMDBSearchResult[];
    total_results: number;
    total_pages: number;
    page: number;
  }> {
    return this.fetch('/search/multi', {
      query,
      page: page.toString(),
      include_adult: 'false',
    });
  }

  async searchMovies(query: string, page: number = 1): Promise<{
    results: TMDBSearchResult[];
    total_results: number;
    total_pages: number;
    page: number;
  }> {
    return this.fetch('/search/movie', {
      query,
      page: page.toString(),
      include_adult: 'false',
    });
  }

  async searchTV(query: string, page: number = 1): Promise<{
    results: TMDBSearchResult[];
    total_results: number;
    total_pages: number;
    page: number;
  }> {
    return this.fetch('/search/tv', {
      query,
      page: page.toString(),
      include_adult: 'false',
    });
  }

  async getMovieDetails(movieId: number): Promise<TMDBMovieDetails> {
    return this.fetch(`/movie/${movieId}`);
  }

  async getTVDetails(tvId: number): Promise<TMDBTVDetails> {
    return this.fetch(`/tv/${tvId}`);
  }

  getImageUrl(path: string | null, size: 'w92' | 'w154' | 'w185' | 'w342' | 'w500' | 'w780' | 'w1280' | 'original' = 'w500'): string | null {
    if (!path) return null;
    return `${TMDB_IMAGE_BASE}/${size}${path}`;
  }

  async getPopularMovies(page: number = 1): Promise<{
    results: TMDBSearchResult[];
    total_results: number;
    total_pages: number;
    page: number;
  }> {
    return this.fetch('/movie/popular', {
      page: page.toString(),
    });
  }

  async getPopularTV(page: number = 1): Promise<{
    results: TMDBSearchResult[];
    total_results: number;
    total_pages: number;
    page: number;
  }> {
    return this.fetch('/tv/popular', {
      page: page.toString(),
    });
  }

  async getTrending(mediaType: 'all' | 'movie' | 'tv' = 'all', timeWindow: 'day' | 'week' = 'week'): Promise<{
    results: TMDBSearchResult[];
  }> {
    return this.fetch(`/trending/${mediaType}/${timeWindow}`);
  }
}

export function createTMDBClient(): TMDBClient {
  const apiKey = process.env.TMDB_API_KEY;
  
  if (!apiKey) {
    throw new Error('TMDB_API_KEY environment variable is required');
  }

  return new TMDBClient(apiKey);
}

export type { TMDBSearchResult, TMDBMovieDetails, TMDBTVDetails };
export default TMDBClient;
