import { ConflictPair } from '@/types';
import { format } from 'date-fns';
import { AlertTriangle, Clock } from 'lucide-react';

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
        <AlertTriangle className="h-5 w-5 shrink-0" />
        <h3 className="text-sm font-medium">
          {conflicts.length} Recording Conflict{conflicts.length !== 1 ? 's' : ''}
        </h3>
      </div>
      <p className="mt-1 text-xs text-text-muted">
        These recordings overlap and may compete for tuner access.
      </p>

      <div className="mt-4 space-y-3">
        {conflicts.map((conflict, idx) => {
          const aStart = new Date(conflict.start_time);
          const aEnd = new Date(conflict.end_time);
          const bStart = new Date(conflict.conflict_start);
          const bEnd = new Date(conflict.conflict_end);

          return (
            <div
              key={idx}
              className="rounded-md border border-red-500/20 bg-bg-secondary p-3"
            >
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <p className="truncate text-sm font-medium text-text-primary">
                    {conflict.title}
                  </p>
                  <div className="mt-1 flex items-center gap-1.5 text-xs text-text-muted">
                    <Clock className="h-3 w-3" />
                    <span>
                      {format(aStart, 'h:mm a')} – {format(aEnd, 'h:mm a')}
                    </span>
                  </div>
                </div>
                <div>
                  <p className="truncate text-sm font-medium text-text-primary">
                    {conflict.conflict_title}
                  </p>
                  <div className="mt-1 flex items-center gap-1.5 text-xs text-text-muted">
                    <Clock className="h-3 w-3" />
                    <span>
                      {format(bStart, 'h:mm a')} – {format(bEnd, 'h:mm a')}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
