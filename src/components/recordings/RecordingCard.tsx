import { RecordingSchedule } from '@/types';
import { format } from 'date-fns';
import StatusBadge from './StatusBadge';
import { Clock, Tv } from 'lucide-react';

interface RecordingCardProps {
  recording: RecordingSchedule;
}

const leagueNames: Record<string, string> = {
  'eng.1': 'Premier League',
  'usa.1': 'MLS',
};

export default function RecordingCard({ recording }: RecordingCardProps) {
  const startTime = new Date(recording.start_time);
  const endTime = new Date(recording.end_time);
  const leagueName = recording.league ? leagueNames[recording.league] || recording.league : null;

  return (
    <div className="rounded-lg border border-border-default bg-bg-secondary p-4 transition-colors hover:border-border-accent">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-medium text-text-primary">
            {recording.title}
          </h3>
          {leagueName && (
            <p className="mt-1 text-xs text-text-muted">{leagueName}</p>
          )}
        </div>
        <StatusBadge status={recording.status} />
      </div>

      <div className="mt-3 flex items-center gap-4 text-xs text-text-secondary">
        <div className="flex items-center gap-1.5">
          <Clock className="h-3.5 w-3.5" />
          <span>
            {format(startTime, 'MMM d, h:mm a')} - {format(endTime, 'h:mm a')}
          </span>
        </div>
        {recording.channel_name && (
          <div className="flex items-center gap-1.5">
            <Tv className="h-3.5 w-3.5" />
            <span className="truncate">{recording.channel_name}</span>
          </div>
        )}
      </div>

      {recording.status === 'failed' && recording.error_message && (
        <div className="mt-3 rounded-md bg-red-500/10 p-2 text-xs text-red-400">
          {recording.error_message}
        </div>
      )}
    </div>
  );
}
