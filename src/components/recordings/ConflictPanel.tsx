import { ConflictPair } from '@/types';
import { format } from 'date-fns';
import { AlertTriangle } from 'lucide-react';

interface ConflictPanelProps {
  conflicts: ConflictPair[];
}

export default function ConflictPanel({ conflicts }: ConflictPanelProps) {
  if (conflicts.length === 0) {
    return null;
  }

  return (
    <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-4">
      <div className="flex items-center gap-2 text-red-400">
        <AlertTriangle className="h-5 w-5" />
        <h3 className="text-sm font-medium">Recording Conflicts Detected</h3>
      </div>
      <p className="mt-1 text-xs text-text-muted">
        {conflicts.length} overlapping recording{conflicts.length !== 1 ? 's' : ''}
      </p>

      <div className="mt-4 space-y-3">
        {conflicts.map((conflict, idx) => (
          <div
            key={idx}
            className="rounded-md border border-red-500/20 bg-bg-secondary p-3"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-text-primary">
                  {conflict.title}
                </p>
                <p className="mt-0.5 text-xs text-text-muted">
                  {format(new Date(conflict.start_time), 'h:mm a')} -{' '}
                  {format(new Date(conflict.end_time), 'h:mm a')}
                </p>
              </div>
              <span className="shrink-0 text-xs text-red-400">conflicts with</span>
            </div>
            <div className="mt-2 border-t border-border-default pt-2">
              <p className="truncate text-sm font-medium text-text-primary">
                {conflict.conflict_title}
              </p>
              <p className="mt-0.5 text-xs text-text-muted">
                {format(new Date(conflict.conflict_start), 'h:mm a')} -{' '}
                {format(new Date(conflict.conflict_end), 'h:mm a')}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
