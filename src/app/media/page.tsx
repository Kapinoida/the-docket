'use client';

import { useEffect, useState } from 'react';
import { MediaItem } from '@/media/lib/database';
import MediaHeader from '@/media/components/MediaHeader';

interface Stats {
  total: number;
  inProgress: number;
  completed: number;
  wanted: number;
}

function MediaCardImage({ item }: { item: MediaItem }) {
  const [imageError, setImageError] = useState(false);

  if (!item.image || imageError) {
    return (
      <div className={`media-cover ${item.type}`}>
        <span className="media-cover-title">{item.title}</span>
      </div>
    );
  }

  return (
    <img
      src={item.image}
      alt={item.title}
      className="media-cover-image"
      onError={() => setImageError(true)}
    />
  );
}

export default function LibraryPage() {
  const [items, setItems] = useState<MediaItem[]>([]);
  const [stats, setStats] = useState<Stats>({ total: 0, inProgress: 0, completed: 0, wanted: 0 });
  const [filters, setFilters] = useState({ type: '', status: '', query: '' });
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncToast, setSyncToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [queued, setQueued] = useState<Set<number>>(new Set());

  const fetchData = async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filters.type) params.set('type', filters.type);
    if (filters.status) params.set('status', filters.status);
    if (filters.query) params.set('query', filters.query);

    const response = await fetch(`/api/v2/media?${params.toString()}`);
    const data = await response.json();
    setItems(data.items);
    setStats(data.stats);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  useEffect(() => {
    if (syncToast) {
      const timer = setTimeout(() => setSyncToast(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [syncToast]);

  const handleSync = async (source?: 'audiobookshelf' | 'radarr' | 'sonarr') => {
    setSyncing(true);
    setSyncToast(null);
    
    let endpoint = '/api/v2/media/sync';
    if (source === 'audiobookshelf') endpoint = '/api/v2/media/sync/audiobookshelf';
    else if (source === 'radarr') endpoint = '/api/v2/media/sync/radarr';
    else if (source === 'sonarr') endpoint = '/api/v2/media/sync/sonarr';
    
    const response = await fetch(endpoint, { method: 'POST' });
    const data = await response.json();
    
    if (data.success) {
      let message: string;
      if (source) {
        const result = data.results?.[source] || data;
        message = `${source}: ${result.created} new, ${result.updated} updated, ${result.deleted} removed`;
      } else {
        const parts = [];
        for (const [src, result] of Object.entries(data.results || {})) {
          const r = result as { success: boolean; upserted: number; created: number; updated: number; deleted: number; error: string | null };
          if (r.success) {
            parts.push(`${src}: ${r.created} new, ${r.updated} updated, ${r.deleted} removed`);
          } else {
            parts.push(`${src}: failed (${r.error})`);
          }
        }
        message = parts.join(' | ');
      }
      setSyncToast({ message, type: 'success' });
      await fetchData();
    } else {
      setSyncToast({ message: `Sync failed: ${data.error}`, type: 'error' });
    }
    setSyncing(false);
  };

  const addToQueue = async (event: React.MouseEvent, id: number) => {
    event.preventDefault();
    event.stopPropagation();
    const response = await fetch('/api/v2/media/up-next', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mediaItemId: id }),
    });
    if (response.ok) setQueued(previous => new Set(previous).add(id));
  };

  const statusLabels: Record<string, string> = {
    all: 'Everything',
    in_progress: 'In progress',
    completed: 'Completed',
    wanted: 'Wanted',
    owned: 'Owned',
    abandoned: 'Abandoned',
  };

  return (
    <main className="media-content">
      <MediaHeader />
      {syncToast && (
        <div style={{
          position: 'fixed',
          top: 20,
          right: 20,
          padding: '12px 20px',
          borderRadius: 8,
          background: syncToast.type === 'success' ? 'var(--accent-green)' : 'var(--accent-red)',
          color: 'white',
          fontSize: 13,
          fontWeight: 500,
          zIndex: 1000,
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
          maxWidth: 400,
        }}>
          {syncToast.message}
        </div>
      )}

      <div className="media-page-heading">
        <div>
          <p className="media-eyebrow">Your collection</p>
          <h1>Media library</h1>
          <p className="media-lede">A calm, current view of everything you're reading, watching, and listening to.</p>
        </div>
      </div>

      <div className="media-metric-row">
        <div className="media-metric">
          <span className="media-metric-label">Tracked items</span>
          <p className="media-metric-value">{stats.total}</p>
        </div>
        <div className="media-metric">
          <span className="media-metric-label">In progress</span>
          <p className="media-metric-value">{stats.inProgress}</p>
        </div>
        <div className="media-metric">
          <span className="media-metric-label">Completed</span>
          <p className="media-metric-value">{stats.completed}</p>
        </div>
        <div className="media-metric">
          <span className="media-metric-label">On your radar</span>
          <p className="media-metric-value">{stats.wanted}</p>
        </div>
      </div>

      <div className="media-toolbar">
        <div className="media-filters">
          <button className={`media-filter ${!filters.status ? 'active' : ''}`} onClick={() => setFilters({ ...filters, status: '' })}>
            Everything
          </button>
          {['wanted', 'owned', 'in_progress', 'completed', 'abandoned'].map((status) => (
            <button
              key={status}
              className={`media-filter ${filters.status === status ? 'active' : ''}`}
              onClick={() => setFilters({ ...filters, status })}
            >
              {statusLabels[status]}
            </button>
          ))}
        </div>
        <label className="media-search">
          <input
            type="text"
            placeholder="Search library"
            value={filters.query}
            onChange={(e) => setFilters({ ...filters, query: e.target.value })}
            style={{ border: 'none', outline: 'none', width: '100%', background: 'transparent' }}
          />
        </label>
      </div>

      <div className="media-filters" style={{ marginBottom: 15 }}>
        <button className={`media-filter ${!filters.type ? 'active' : ''}`} onClick={() => setFilters({ ...filters, type: '' })}>
          All types
        </button>
        {['audiobook', 'movie', 'tv', 'music', 'ebook', 'game'].map((type) => (
          <button
            key={type}
            className={`media-filter ${filters.type === type ? 'active' : ''}`}
            onClick={() => setFilters({ ...filters, type })}
          >
            {type}
          </button>
        ))}
      </div>

      <div style={{ marginBottom: 20, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button
          onClick={() => handleSync()}
          disabled={syncing}
          className="media-button"
          style={{ margin: 0 }}
        >
          {syncing ? 'Syncing...' : 'Sync All'}
        </button>
        <button
          onClick={() => handleSync('audiobookshelf')}
          disabled={syncing}
          className="media-button"
          style={{ margin: 0, background: '#7c3aed' }}
        >
          Audiobooks
        </button>
        <button
          onClick={() => handleSync('radarr')}
          disabled={syncing}
          className="media-button"
          style={{ margin: 0, background: '#ca8a04' }}
        >
          Movies
        </button>
        <button
          onClick={() => handleSync('sonarr')}
          disabled={syncing}
          className="media-button"
          style={{ margin: 0, background: '#3b82f6' }}
        >
          TV Shows
        </button>
      </div>

      {loading ? (
        <div className="media-empty">Loading your library...</div>
      ) : items.length === 0 ? (
        <div className="media-empty">No items match those filters.</div>
      ) : (
        <div className="media-grid">
          {items.map((item) => (
            <a key={item.id} href={`/media/${item.id}`} className="media-card">
              <MediaCardImage item={item} />
              <div className="media-card-body">
                <p className="media-card-title">{item.title}</p>
                <p className="media-card-meta">
                  {item.creators.join(', ')}
                  {item.year ? ` · ${item.year}` : ''}
                </p>
                <div className="media-card-footer">
                  <span className={`media-status ${item.status}`}>{item.status.replace('_', ' ')}</span>
                  <div className="media-progress">
                    <div className="media-progress-bar" style={{ width: `${item.progress * 100}%` }} />
                  </div>
                  <span className="media-progress-label">{Math.round(item.progress * 100)}%</span>
                </div>
                <button
                  className="queue-card-button"
                  onClick={(event) => addToQueue(event, item.id)}
                  disabled={queued.has(item.id)}
                >
                  {queued.has(item.id) ? 'In Up Next' : '+ Add to Up Next'}
                </button>
              </div>
            </a>
          ))}
        </div>
      )}
    </main>
  );
}
