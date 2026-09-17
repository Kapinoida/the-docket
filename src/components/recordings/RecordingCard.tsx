import { RecordingSchedule } from '@/types';
import { format, formatDuration, intervalToDuration } from 'date-fns';
import StatusBadge from './StatusBadge';
import { Clock, Tv, HardDrive, Satellite } from 'lucide-react';

interface RecordingCardProps {
  recording: RecordingSchedule;
}

const leagueNames: Record<string, string> = {
  'eng.1': 'Premier League',
  'eng.2': 'Championship',
  'usa.1': 'MLS',
  'uefa.champions': 'Champions League',
  'uefa.europa': 'Europa League',
};

const sourceLabels: Record<string, { label: string; classes: string }> = {
  sportarr: { label: 'Sportarr', classes: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30' },
  fixture: { label: 'Fixture', classes: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30' },
  manual: { label: 'Manual', classes: 'bg-purple-500/20 text-purple-400 border-purple-500/30' },
  replay: { label: 'Replay', classes: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
};

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export default function RecordingCard({ recording }: RecordingCardProps) {
  const startTime = new Date(recording.start_time);
  const endTime = new Date(recording.end_time);
  const leagueName = recording.league ? leagueNames[recording.league] || recording.league : null;
  const source = sourceLabels[recording.source] || sourceLabels.fixture;
  const duration = intervalToDuration({ start: startTime, end: endTime });
  const durationStr = formatDuration(duration, { format: ['hours', 'minutes'] });

  return (
    <div className="rounded-lg border border-border-default bg-bg-secondary p-4 transition-colors hover:border-border-accent">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-medium text-text-primary">
            {recording.title}
          </h3>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            {leagueName && (
              <span className="text-xs text-text-muted">{leagueName}</span>
            )}
            {leagueName && recording.channel_name && (
              <span className="text-xs text-text-muted">·</span>
            )}
            {recording.channel_name && (
              <span className="flex items-center gap-1 text-xs text-text-muted">
                <Tv className="h-3 w-3" />
                {recording.channel_name}
              </span>
            )}
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1.5">
          <StatusBadge status={recording.status} />
          <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium ${source.classes}`}>
            {source.label}
          </span>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-text-secondary">
        <div className="flex items-center gap-1.5">
          <Clock className="h-3.5 w-3.5" />
          <span>
            {format(startTime, 'MMM d, h:mm a')} – {format(endTime, 'h:mm a')}
          </span>
        </div>
        {durationStr && (
          <span className="text-text-muted">{durationStr}</span>
        )}
      </div>

      {recording.status === 'completed' && recording.file_size_bytes != null && (
        <div className="mt-2 flex items-center gap-1.5 text-xs text-text-muted">
          <HardDrive className="h-3.5 w-3.5" />
          <span>{formatFileSize(recording.file_size_bytes)}</span>
        </div>
      )}

      {recording.status === 'failed' && recording.error_message && (
        <div className="mt-3 rounded-md bg-red-500/10 p-2 text-xs text-red-400">
          {recording.error_message}
        </div>
      )}

      {recording.source === 'sportarr' && recording.sportarr_id && (
        <div className="mt-2 flex items-center gap-1.5 text-[10px] text-text-muted">
          <Satellite className="h-3 w-3" />
          <span className="truncate font-mono">{recording.sportarr_id}</span>
        </div>
      )}
    </div>
  );
}
