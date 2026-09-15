import { Users, Clock, Radio as RadioIcon } from 'lucide-react';
import type { AzuraCastStation } from '@/types/azuracast';
import type { RadioStation } from '@/lib/radioStations';

interface NowPlayingPanelProps {
  station: RadioStation;
  nowPlaying: AzuraCastStation;
  isOffline: boolean;
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export default function NowPlayingPanel({
  station,
  nowPlaying,
  isOffline,
}: NowPlayingPanelProps) {
  const song = nowPlaying.now_playing;
  const nextSong = nowPlaying.playing_next;
  const listeners = nowPlaying.listeners;

  const trackText = song.song.artist && song.song.title
    ? `${song.song.artist} — ${song.song.title}`
    : song.song.text || 'No track info';

  const nextTrackText = nextSong?.song.artist && nextSong?.song.title
    ? `${nextSong.song.artist} — ${nextSong.song.title}`
    : nextSong?.song.text || null;

  const progressPercent = song.duration > 0
    ? (song.elapsed / song.duration) * 100
    : 0;

  if (isOffline) {
    return (
      <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-4">
        <div className="flex items-center gap-2 text-red-400">
          <RadioIcon size={18} />
          <span className="text-sm font-medium">Station Offline</span>
        </div>
        <p className="mt-1 text-xs text-text-muted">
          {station.displayName} is currently unreachable
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border-default bg-bg-secondary p-4">
      <div className="flex items-start gap-4">
        {song.song.art ? (
          <img
            src={song.song.art}
            alt="Album art"
            className="h-24 w-24 rounded-lg object-cover flex-shrink-0 shadow-lg"
          />
        ) : (
          <div className="h-24 w-24 rounded-lg bg-bg-tertiary flex items-center justify-center flex-shrink-0">
            <RadioIcon size={36} className="text-text-muted" />
          </div>
        )}

        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-medium text-text-primary truncate">
            {station.displayName}
          </h2>
          <p className="mt-1 text-sm text-text-secondary truncate">{trackText}</p>

          <div className="mt-3 flex items-center gap-4 text-xs text-text-muted">
            <div className="flex items-center gap-1">
              <Users size={12} />
              <span>{listeners.total} listener{listeners.total !== 1 ? 's' : ''}</span>
              {listeners.unique > 0 && listeners.unique !== listeners.total && (
                <span className="text-text-muted/60">({listeners.unique} unique)</span>
              )}
            </div>
            <div className="flex items-center gap-1">
              <Clock size={12} />
              <span>{formatTime(song.elapsed)} / {formatTime(song.duration)}</span>
            </div>
          </div>

          <div className="mt-2 h-1 rounded-full bg-bg-tertiary overflow-hidden">
            <div
              className="h-full bg-accent-blue transition-all duration-1000"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>

      {nextTrackText && (
        <div className="mt-4 pt-3 border-t border-border-subtle">
          <div className="text-[10px] uppercase tracking-wider text-text-muted font-medium mb-1">
            Up Next
          </div>
          <p className="text-sm text-text-secondary truncate">{nextTrackText}</p>
        </div>
      )}
    </div>
  );
}
