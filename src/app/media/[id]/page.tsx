'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { MediaItemWithSources } from '@/media/lib/database';

function DetailCoverImage({ item }: { item: MediaItemWithSources }) {
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
      className="cover-image detail-cover"
      onError={() => setImageError(true)}
    />
  );
}

export default function DetailPage() {
  const params = useParams();
  const router = useRouter();
  const [item, setItem] = useState<MediaItemWithSources | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [queueState, setQueueState] = useState<'idle' | 'adding' | 'added'>('idle');

  useEffect(() => {
    const fetchItem = async () => {
      if (!params?.id) {
        setLoading(false);
        return;
      }
      const response = await fetch(`/api/v2/media/${params.id}`);
      if (response.ok) {
        const data = await response.json();
        setItem(data);
      }
      setLoading(false);
    };

    fetchItem();
  }, [params?.id]);

  const handleUpdate = async (updates: Partial<MediaItemWithSources>) => {
    setSaving(true);
    const response = await fetch('/api/v2/media', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: item?.id, ...updates }),
    });

    if (response.ok) {
      const data = await response.json();
      setItem(data.item);
    }
    setSaving(false);
  };

  const addToQueue = async () => {
    setQueueState('adding');
    const response = await fetch('/api/v2/media/up-next', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mediaItemId: item?.id }),
    });
    setQueueState(response.ok ? 'added' : 'idle');
  };

  if (loading) {
    return <main className="media-content"><p className="media-lede">Loading item...</p></main>;
  }

  if (!item) {
    return <main className="media-content"><p className="media-lede">Item not found</p></main>;
  }

  return (
    <main className="media-content">
      <a href="/" className="media-back-link">← Back to library</a>
      
      <div className="media-detail-layout">
        <DetailCoverImage item={item} />
        
        <section className="media-detail-panel">
          <div>
            <span className={`media-status ${item.status}`}>{item.status.replace('_', ' ')}</span>
            <span className="media-card-meta" style={{ marginLeft: 9 }}>
              {item.type}
            </span>
          </div>
          
          {'sources' in item && item.sources && item.sources.length > 0 && (
            <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
              {item.sources.map((source) => (
                <span key={source.source} style={{
                  fontSize: 11,
                  padding: '3px 8px',
                  background: source.deletedAt ? 'var(--canvas)' : 'var(--accent)',
                  color: source.deletedAt ? 'var(--muted)' : 'white',
                  borderRadius: 4,
                  textDecoration: source.deletedAt ? 'line-through' : 'none',
                }}>
                  {source.source}
                </span>
              ))}
            </div>
          )}
          
           <h1>{item.title}</h1>
           <button className="media-button" onClick={addToQueue} disabled={queueState !== 'idle'}>
             {queueState === 'adding' ? 'Adding...' : queueState === 'added' ? 'In Up Next' : '+ Add to Up Next'}
           </button>
          
          {item.subtitle && <p className="media-detail-subtitle">{item.subtitle}</p>}
          
          <p className="media-detail-creators">
            {item.creators.join(', ')}
            {item.year ? ` · ${item.year}` : ''}
          </p>
          
          {item.performers.length > 0 && (
            <p className="media-detail-creators" style={{ marginTop: -15, fontSize: 13 }}>
              Narrated by {item.performers.join(', ')}
            </p>
          )}
          
          {item.series && (
            <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 8 }}>
              Series: {item.series}{item.seriesPosition && ` #${item.seriesPosition}`}
            </p>
          )}
          
          {item.durationMinutes && (
            <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 8 }}>
              Duration: {Math.floor(item.durationMinutes / 60)}h {item.durationMinutes % 60}m
            </p>
          )}
          
          <p className="media-detail-description">{item.description}</p>
          
          {item.genres.length > 0 && (
            <div className="media-detail-section">
              <h2>Genres</h2>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {item.genres.map((genre) => (
                  <span key={genre} style={{
                    fontSize: 12,
                    padding: '4px 10px',
                    background: 'var(--canvas)',
                    borderRadius: 999,
                    color: 'var(--muted)'
                  }}>
                    {genre}
                  </span>
                ))}
              </div>
            </div>
          )}
          
          {item.type === 'tv' && item.episodeStats && (
            <div className="media-detail-section">
              <h2>Episodes</h2>
              <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 12 }}>
                <p>{item.episodeStats.watched} of {item.episodeStats.total} episodes watched</p>
                <div style={{ marginTop: 8, background: 'var(--canvas)', borderRadius: 4, height: 8, overflow: 'hidden' }}>
                  <div style={{
                    width: `${(item.episodeStats.watched / item.episodeStats.total) * 100}%`,
                    height: '100%',
                    background: 'var(--accent)',
                    transition: 'width 0.3s ease',
                  }} />
                </div>
              </div>
              {item.episodes && item.episodes.length > 0 && (
                <div style={{ maxHeight: 300, overflowY: 'auto', marginTop: 12 }}>
                  {(() => {
                    const seasons = new Map<number, typeof item.episodes>();
                    item.episodes.forEach(ep => {
                      // Skip season 0 (specials/extras)
                      if (ep.seasonNumber === 0) return;
                      if (!seasons.has(ep.seasonNumber)) {
                        seasons.set(ep.seasonNumber, []);
                      }
                      seasons.get(ep.seasonNumber)!.push(ep);
                    });
                    
                    return Array.from(seasons.entries()).sort((a, b) => a[0] - b[0]).map(([seasonNum, episodes]) => (
                      <div key={seasonNum} style={{ marginBottom: 16 }}>
                        <h3 style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, color: 'var(--text-primary)' }}>
                          Season {seasonNum}
                        </h3>
                        {episodes.sort((a, b) => a.episodeNumber - b.episodeNumber).map(ep => (
                          <div key={ep.id} style={{
                            padding: '8px 12px',
                            marginBottom: 4,
                            background: ep.progress > 0 ? 'rgba(34, 197, 94, 0.1)' : 'var(--canvas)',
                            borderRadius: 4,
                            fontSize: 12,
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                          }}>
                            <span>
                              E{ep.episodeNumber}: {ep.title || 'Untitled'}
                            </span>
                            <span style={{ color: ep.progress > 0 ? 'var(--accent-green)' : 'var(--muted)' }}>
                              {ep.progress > 0 ? '✓ Watched' : 'Not watched'}
                            </span>
                          </div>
                        ))}
                      </div>
                    ));
                  })()}
                </div>
              )}
            </div>
          )}
          
          {item.plexHistory && item.plexHistory.length > 0 && (
            <div className="media-detail-section">
              <h2>Plex Watch History</h2>
              <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                {item.plexHistory.slice(0, 10).map((entry) => (
                  <div key={entry.id} style={{
                    padding: '8px 12px',
                    marginBottom: 4,
                    background: 'var(--canvas)',
                    borderRadius: 4,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}>
                    <span>
                      {new Date(entry.watchedAt).toLocaleDateString()} at {new Date(entry.watchedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <span>
                      {entry.progress !== null && entry.progress >= 0.9 ? '✓ Completed' : `${Math.round((entry.progress || 0) * 100)}%`}
                    </span>
                  </div>
                ))}
                {item.plexHistory.length > 10 && (
                  <p style={{ marginTop: 8, fontSize: 11, textAlign: 'center' }}>
                    + {item.plexHistory.length - 10} more entries
                  </p>
                )}
              </div>
            </div>
          )}
          
          <div className="media-detail-section">
            <h2>Personal status</h2>
            <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 12 }}>
              Manual changes are preserved during syncs
              {item.manualOverride && ' (currently overridden)'}
            </p>
            
            <div className="media-edit-grid">
              <label className="media-field">
                Status
                <select
                  value={item.status}
                  onChange={(e) => handleUpdate({ status: e.target.value as any })}
                >
                  <option value="wanted">Wanted</option>
                  <option value="owned">Owned</option>
                  <option value="in_progress">In progress</option>
                  <option value="completed">Completed</option>
                  <option value="abandoned">Abandoned</option>
                </select>
              </label>
              
              <label className="media-field">
                Progress ({Math.round(item.progress * 100)}%)
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={item.progress}
                  onChange={(e) => handleUpdate({ progress: parseFloat(e.target.value) })}
                />
              </label>
              
              <label className="media-field full">
                Notes
                <textarea
                  value={item.notes || ''}
                  onChange={(e) => handleUpdate({ notes: e.target.value || null })}
                  placeholder="Add a note for future you..."
                />
              </label>
            </div>
            
            <button className="media-button" disabled={saving}>
              {saving ? 'Saving...' : 'Save changes'}
            </button>
          </div>
          
          <div style={{ marginTop: 24, fontSize: 12, color: 'var(--muted)' }}>
            {'sources' in item && item.sources && item.sources.length > 0 && (
              <div>
                <p style={{ marginBottom: 8, fontWeight: 500 }}>Sources:</p>
                {item.sources.map((source) => (
                  <p key={source.source} style={{ marginBottom: 4 }}>
                    • {source.source} (ID: {source.sourceId})
                    {source.deletedAt && <span style={{ color: 'var(--accent-red)' }}> — deleted</span>}
                  </p>
                ))}
              </div>
            )}
            {item.startedAt && <p>Started: {new Date(item.startedAt).toLocaleDateString()}</p>}
            {item.completedAt && <p>Completed: {new Date(item.completedAt).toLocaleDateString()}</p>}
          </div>
        </section>
      </div>
    </main>
  );
}
