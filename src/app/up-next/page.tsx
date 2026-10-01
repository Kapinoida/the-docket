'use client';

import { useEffect, useState } from 'react';
import { ArrowDown, ArrowUp, Check, Clock3, Minus, Plus, Trash2 } from 'lucide-react';
import { PlanningQueueItem } from '@/media/lib/database';
import MediaHeader from '@/media/components/MediaHeader';

interface QueueData {
  upNext: PlanningQueueItem[];
  backlog: PlanningQueueItem[];
}

function QueueRow({
  item,
  index,
  total,
  onMove,
  onComplete,
  onBacklog,
  onRemove,
}: {
  item: PlanningQueueItem;
  index: number;
  total: number;
  onMove: (item: PlanningQueueItem, direction: 'up' | 'down') => void;
  onComplete: (item: PlanningQueueItem) => void;
  onBacklog: (item: PlanningQueueItem) => void;
  onRemove: (item: PlanningQueueItem) => void;
}) {
  return (
    <article className="media-queue-row">
      <div className="media-queue-position">{index + 1}</div>
      {item.image ? <img className="media-queue-cover" src={item.image} alt="" /> : <div className={`media-queue-cover ${item.type}`} />}
      <div className="media-queue-copy">
        <a href={`/media/${item.id}`} className="media-queue-title">{item.title}</a>
        <p className="media-queue-meta">{item.year || 'Year unknown'}{item.creators.length > 0 ? ` · ${item.creators.join(', ')}` : ''}</p>
        {item.description && <p className="media-queue-description">{item.description}</p>}
      </div>
      <div className="media-queue-actions">
        <button className="media-icon-button" aria-label="Move up" disabled={index === 0} onClick={() => onMove(item, 'up')}><ArrowUp size={15} /></button>
        <button className="media-icon-button" aria-label="Move down" disabled={index === total - 1} onClick={() => onMove(item, 'down')}><ArrowDown size={15} /></button>
        <button className="media-queue-action complete" onClick={() => onComplete(item)}><Check size={14} /> Watched</button>
        <button className="media-icon-button" aria-label="Move to backlog" onClick={() => onBacklog(item)}><Minus size={15} /></button>
        <button className="icon-button danger" aria-label="Remove from queue" onClick={() => onRemove(item)}><Trash2 size={15} /></button>
      </div>
    </article>
  );
}

export default function UpNextPage() {
  const [queue, setQueue] = useState<QueueData>({ upNext: [], backlog: [] });
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  const fetchQueue = async () => {
    const response = await fetch('/api/v2/media/up-next');
    if (response.ok) setQueue(await response.json());
    setLoading(false);
  };

  useEffect(() => { fetchQueue(); }, []);

  const reorder = async (item: PlanningQueueItem, direction: 'up' | 'down') => {
    const items = [...queue.upNext];
    const index = items.findIndex(candidate => candidate.queueId === item.queueId);
    const nextIndex = direction === 'up' ? index - 1 : index + 1;
    if (index < 0 || nextIndex < 0 || nextIndex >= items.length) return;
    [items[index], items[nextIndex]] = [items[nextIndex], items[index]];
    setQueue({ ...queue, upNext: items });
    await fetch('/api/v2/media/up-next', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: items.map((candidate, position) => ({ queueId: candidate.queueId, position })) }),
    });
  };

  const updateItem = async (item: PlanningQueueItem, action: 'complete' | 'backlog' | 'remove') => {
    const endpoint = `/api/v2/media/up-next/${item.queueId}`;
    const response = action === 'remove'
      ? await fetch(endpoint, { method: 'DELETE' })
      : await fetch(endpoint, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(action === 'complete' ? { action } : { queueStatus: 'backlog' }),
      });
    if (response.ok) {
      setMessage(action === 'complete' ? `${item.title} marked watched.` : action === 'backlog' ? `${item.title} moved to your backlog.` : `${item.title} removed.`);
      await fetchQueue();
    }
  };

  const addBacklogToQueue = async (item: PlanningQueueItem) => {
    const response = await fetch(`/api/v2/media/up-next/${item.queueId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ queueStatus: 'up_next' }),
    });
    if (response.ok) await fetchQueue();
  };

  return (
    <main className="media-content">
      <MediaHeader />
      <div className="media-page-heading">
        <div>
          <p className="media-eyebrow">Your next watch</p>
          <h1>Up Next</h1>
          <p className="media-lede">A small, intentional queue to help you choose a movie instead of falling into old habits.</p>
        </div>
        <a href="/discover" className="media-button"><Plus size={15} /> Add something</a>
      </div>

      {message && <div className="media-queue-message" role="status">{message}</div>}

      {loading ? <div className="media-empty">Loading your queue...</div> : (
        <>
          <section className="media-queue-section">
            <div className="media-queue-heading"><div><p className="media-eyebrow">Priority order</p><h2>Next to watch</h2></div><span className="media-queue-count">{queue.upNext.length}</span></div>
            {queue.upNext.length === 0 ? <div className="media-empty"><Clock3 size={25} /><p>Your queue is clear.</p><a href="/discover">Find a movie to add</a></div> : (
              <div className="media-queue-list">
                {queue.upNext.map((item, index) => <QueueRow key={item.queueId} item={item} index={index} total={queue.upNext.length} onMove={reorder} onComplete={item => updateItem(item, 'complete')} onBacklog={item => updateItem(item, 'backlog')} onRemove={item => updateItem(item, 'remove')} />)}
              </div>
            )}
          </section>

          <section className="media-queue-section">
            <div className="media-queue-heading"><div><p className="media-eyebrow">Not forgotten</p><h2>Backlog</h2></div><span className="media-queue-count">{queue.backlog.length}</span></div>
            {queue.backlog.length === 0 ? <p className="media-queue-muted">Movies you want to watch later will live here.</p> : (
              <div className="media-queue-list">
                {queue.backlog.map(item => <article key={item.queueId} className="media-queue-row"><div><a href={`/media/${item.id}`} className="media-queue-title">{item.title}</a><p className="media-queue-meta">{item.year || 'Year unknown'}</p></div><div className="media-queue-actions"><button className="media-queue-action" onClick={() => addBacklogToQueue(item)}><ArrowUp size={14} /> Move up next</button><button className="media-icon-button danger" aria-label="Remove from backlog" onClick={() => updateItem(item, 'remove')}><Trash2 size={15} /></button></div></article>)}
              </div>
            )}
          </section>
        </>
      )}
    </main>
  );
}
