import { format } from 'date-fns';
import type { AzuraCastStation } from '@/types/azuracast';

interface SongHistoryProps {
  nowPlaying: AzuraCastStation;
}

export default function SongHistory({ nowPlaying }: SongHistoryProps) {
  const history = nowPlaying.song_history;

  if (history.length === 0) {
    return (
      <div className="rounded-lg border border-border-default bg-bg-secondary p-4">
        <h3 className="text-sm font-medium text-text-primary mb-2">Song History</h3>
        <p className="text-xs text-text-muted">No history available yet</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border-default bg-bg-secondary p-4">
      <h3 className="text-sm font-medium text-text-primary mb-3">Song History</h3>
      <div className="space-y-2">
        {history.slice(0, 10).map((entry, index) => {
          const trackText = entry.song.artist && entry.song.title
            ? `${entry.song.artist} — ${entry.song.title}`
            : entry.song.text || 'Unknown track';
          const playedAt = new Date(entry.played_at * 1000);

          return (
            <div
              key={`${entry.song.id}-${index}`}
              className="flex items-center gap-3 py-1.5 border-b border-border-subtle last:border-0"
            >
              {entry.song.art ? (
                <img
                  src={entry.song.art}
                  alt=""
                  className="h-8 w-8 rounded object-cover flex-shrink-0"
                />
              ) : (
                <div className="h-8 w-8 rounded bg-bg-tertiary flex-shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm text-text-primary truncate">{trackText}</p>
                <p className="text-[10px] text-text-muted">
                  {format(playedAt, 'h:mm a')}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
