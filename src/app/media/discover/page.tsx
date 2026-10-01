'use client';

import { useState, useEffect } from 'react';
import { Search, Plus, Check, Film, Tv, Star } from 'lucide-react';
import MediaHeader from '@/media/components/MediaHeader';

interface SearchResult {
  id: number;
  title: string;
  overview: string;
  poster_url: string | null;
  backdrop_url: string | null;
  release_date: string;
  vote_average: number;
  vote_count: number;
  media_type: 'movie' | 'tv' | 'person';
  genre_ids: number[];
}

function DiscoverCardImage({ item }: { item: SearchResult }) {
  const [imageError, setImageError] = useState(false);

  if (!item.poster_url || imageError) {
    return (
      <div className={`media-cover ${item.media_type}`}>
        <span className="media-cover-title">{item.title}</span>
      </div>
    );
  }

  return (
    <img
      src={item.poster_url}
      alt={item.title}
      className="media-cover-image"
      onError={() => setImageError(true)}
    />
  );
}

export default function DiscoverPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState<Set<number>>(new Set());
  const [added, setAdded] = useState<Set<number>>(new Set());
  const [addedMediaIds, setAddedMediaIds] = useState<Map<number, number>>(new Map());
  const [queued, setQueued] = useState<Set<number>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [searchType, setSearchType] = useState<'multi' | 'movie' | 'tv'>('multi');

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (query.trim().length < 2) {
        setResults([]);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(query)}&type=${searchType}`);
        const data = await response.json();

        if (data.error) {
          setError(data.error);
          setResults([]);
        } else {
          // Filter out people from multi-search
          const filtered = data.results.filter((r: SearchResult) => r.media_type !== 'person');
          setResults(filtered);
        }
      } catch (err) {
        setError('Search failed. Please try again.');
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query, searchType]);

  const handleAdd = async (item: SearchResult) => {
    if (added.has(item.id) || adding.has(item.id)) return;

    setAdding(prev => new Set(prev).add(item.id));

    try {
      const response = await fetch('/api/v2/media/search/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tmdbId: item.id,
          mediaType: item.media_type,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setAdded(prev => new Set(prev).add(item.id));
        setAddedMediaIds(prev => new Map(prev).set(item.id, data.item.id));
      } else {
        console.error('Failed to add item:', data.error);
      }
    } catch (err) {
      console.error('Failed to add item:', err);
    } finally {
      setAdding(prev => {
        const newSet = new Set(prev);
        newSet.delete(item.id);
        return newSet;
      });
    }
  };

  const getYear = (dateString: string) => {
    if (!dateString) return '';
    return dateString.split('-')[0];
  };

  const addToQueue = async (item: SearchResult) => {
    const response = await fetch('/api/v2/media/up-next', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mediaItemId: addedMediaIds.get(item.id) }),
    });
    if (response.ok) setQueued(previous => new Set(previous).add(item.id));
  };

  return (
    <main className="media-content">
      <MediaHeader />
      <div className="media-page-heading">
        <div>
          <p className="media-eyebrow">Discover</p>
          <h1>Find new media</h1>
          <p className="media-lede">Search for movies and TV shows to add to your library.</p>
        </div>
      </div>

      <div className="media-toolbar">
        <div className="media-filters">
          <button
            className={`media-filter ${searchType === 'multi' ? 'active' : ''}`}
            onClick={() => setSearchType('multi')}
          >
            All
          </button>
          <button
            className={`media-filter ${searchType === 'movie' ? 'active' : ''}`}
            onClick={() => setSearchType('movie')}
          >
            Movies
          </button>
          <button
            className={`media-filter ${searchType === 'tv' ? 'active' : ''}`}
            onClick={() => setSearchType('tv')}
          >
            TV Shows
          </button>
        </div>
        <label className="media-search" style={{ width: 400 }}>
          <input
            type="text"
            placeholder="Search for movies or TV shows..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{ border: 'none', outline: 'none', width: '100%', background: 'transparent' }}
            autoFocus
          />
        </label>
      </div>

      {error && (
        <div className="media-empty" style={{ color: 'var(--accent-red)', marginBottom: 20 }}>
          {error}
        </div>
      )}

      {loading && (
        <div className="media-empty">
          Searching...
        </div>
      )}

      {!loading && query.trim().length >= 2 && results.length === 0 && !error && (
        <div className="media-empty">
          No results found. Try a different search term.
        </div>
      )}

      {!loading && results.length > 0 && (
        <div className="media-grid">
          {results.map((item) => {
            const isAdded = added.has(item.id);
            const isAdding = adding.has(item.id);

            return (
              <div key={item.id} className="media-card">
                <DiscoverCardImage item={item} />
                <div className="media-card-body">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    {item.media_type === 'movie' ? (
                      <Film size={14} style={{ color: 'var(--muted)' }} />
                    ) : (
                      <Tv size={14} style={{ color: 'var(--muted)' }} />
                    )}
                    <p className="media-card-title" style={{ margin: 0 }}>
                      {item.title}
                    </p>
                  </div>
                  <p className="media-card-meta">
                    {getYear(item.release_date)}
                    {item.vote_average > 0 && (
                      <>
                        {' · '}
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2 }}>
                          <Star size={10} fill="currentColor" />
                          {item.vote_average.toFixed(1)}
                        </span>
                      </>
                    )}
                  </p>
                  {item.overview && (
                    <p style={{
                      fontSize: 11,
                      color: 'var(--muted)',
                      margin: '8px 0',
                      overflow: 'hidden',
                      display: '-webkit-box',
                      WebkitLineClamp: 3,
                      WebkitBoxOrient: 'vertical',
                    }}>
                      {item.overview}
                    </p>
                  )}
                  <button
                    className="media-button"
                    style={{
                      width: '100%',
                      marginTop: 8,
                      background: isAdded ? 'var(--accent-green)' : undefined,
                      opacity: isAdding ? 0.6 : 1,
                    }}
                    onClick={() => handleAdd(item)}
                    disabled={isAdded || isAdding}
                  >
                    {isAdded ? (
                      <>
                        <Check size={14} />
                        Added to Library
                      </>
                    ) : isAdding ? (
                      'Adding...'
                    ) : (
                      <>
                        <Plus size={14} />
                        Add to Library
                      </>
                    )}
                  </button>
                  {isAdded && item.media_type === 'movie' && (
                    <button
                      className="queue-card-button"
                      onClick={() => addToQueue(item)}
                      disabled={queued.has(item.id)}
                    >
                      {queued.has(item.id) ? 'In Up Next' : '+ Add to Up Next'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {!query.trim() && (
        <div className="media-empty" style={{ marginTop: 40 }}>
          <p style={{ fontSize: 16, marginBottom: 8 }}>Start typing to search</p>
          <p style={{ fontSize: 13 }}>
            Search for movies and TV shows to add to your library as "wanted" items.
          </p>
        </div>
      )}
    </main>
  );
}
