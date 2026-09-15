import { Play, Pause, Users, Radio as RadioIcon } from 'lucide-react';
import type { AzuraCastStation } from '@/types/azuracast';
import type { RadioStation } from '@/lib/radioStations';

interface StationCardProps {
  station: RadioStation;
  nowPlaying: AzuraCastStation | null;
  isPlaying: boolean;
  isOffline: boolean;
  onPlay: () => void;
  onStop: () => void;
}

export default function StationCard({
  station,
  nowPlaying,
  isPlaying,
  isOffline,
  onPlay,
  onStop,
}: StationCardProps) {
  const song = nowPlaying?.now_playing.song;
  const listeners = nowPlaying?.listeners.total ?? 0;
  const trackText = song?.artist && song?.title
    ? `${song.artist} — ${song.title}`
    : song?.text || 'No track info';

  return (
    <div className="rounded-lg border border-border-default bg-bg-secondary p-4 transition-colors hover:border-border-accent">
      <div className="flex items-start gap-3">
        {song?.art ? (
          <img
            src={song.art}
            alt="Album art"
            className="h-16 w-16 rounded object-cover flex-shrink-0"
          />
        ) : (
          <div className="h-16 w-16 rounded bg-bg-tertiary flex items-center justify-center flex-shrink-0">
            <RadioIcon size={24} className="text-text-muted" />
          </div>
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-medium text-text-primary truncate">
              {station.displayName}
            </h3>
            {isPlaying ? (
              <button
                onClick={onStop}
                className="p-1.5 rounded-full text-text-secondary hover:text-text-primary hover:bg-bg-tertiary transition-colors"
                title="Stop"
              >
                <Pause size={16} />
              </button>
            ) : (
              <button
                onClick={onPlay}
                className="p-1.5 rounded-full text-accent-blue hover:bg-accent-blue/10 transition-colors"
                title="Play"
              >
                <Play size={16} />
              </button>
            )}
          </div>

          <p className="mt-0.5 text-xs text-text-muted truncate">
            {station.description}
          </p>

          <div className="mt-2 flex items-center gap-3 text-xs text-text-secondary">
            {isOffline ? (
              <span className="text-red-400">Offline</span>
            ) : (
              <>
                <div className="flex items-center gap-1">
                  <Users size={12} />
                  <span>{listeners} listener{listeners !== 1 ? 's' : ''}</span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {song && !isOffline && (
        <div className="mt-3 pt-3 border-t border-border-subtle">
          <div className="text-[10px] uppercase tracking-wider text-text-muted font-medium mb-1">
            Now Playing
          </div>
          <p className="text-sm text-text-primary truncate">{trackText}</p>
        </div>
      )}
    </div>
  );
}
