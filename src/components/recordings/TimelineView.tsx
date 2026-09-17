import { RecordingSchedule } from '@/types';
import { format } from 'date-fns';
import { clsx } from 'clsx';
import StatusBadge from './StatusBadge';

interface TimelineViewProps {
  recordings: RecordingSchedule[];
}

const statusColors: Record<string, string> = {
  pending: 'bg-gray-500',
  scheduled: 'bg-blue-500',
  recording: 'bg-red-500',
  completed: 'bg-green-500',
  failed: 'bg-red-500',
  cancelled: 'bg-gray-600',
};

const statusBorderColors: Record<string, string> = {
  pending: 'border-gray-400',
  scheduled: 'border-blue-400',
  recording: 'border-red-400',
  completed: 'border-green-400',
  failed: 'border-red-400',
  cancelled: 'border-gray-500',
};

interface TimelineRow {
  recording: RecordingSchedule;
  row: number;
}

function assignRows(sorted: RecordingSchedule[]): TimelineRow[] {
  const rows: TimelineRow[] = [];
  const rowEnds: number[] = [];

  for (const rec of sorted) {
    const start = new Date(rec.start_time).getTime();
    let assignedRow = -1;
    for (let r = 0; r < rowEnds.length; r++) {
      if (rowEnds[r] <= start) {
        assignedRow = r;
        break;
      }
    }
    if (assignedRow === -1) {
      assignedRow = rowEnds.length;
      rowEnds.push(0);
    }
    rowEnds[assignedRow] = new Date(rec.end_time).getTime();
    rows.push({ recording: rec, row: assignedRow });
  }

  return rows;
}

function TimelineList({ recordings }: { recordings: RecordingSchedule[] }) {
  const sorted = [...recordings].sort(
    (a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
  );

  return (
    <div className="space-y-2">
      {sorted.map((recording) => {
        const start = new Date(recording.start_time);
        const end = new Date(recording.end_time);

        return (
          <div
            key={recording.id}
            className="flex items-center gap-3 rounded-lg border border-border-default bg-bg-secondary p-3"
          >
            <div
              className={clsx(
                'h-10 w-1.5 rounded-full',
                statusColors[recording.status] || 'bg-gray-500'
              )}
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-text-primary">
                {recording.title}
              </p>
              <p className="text-xs text-text-muted">
                {format(start, 'h:mm a')} – {format(end, 'h:mm a')}
              </p>
            </div>
            <StatusBadge status={recording.status} />
          </div>
        );
      })}
    </div>
  );
}

export default function TimelineView({ recordings }: TimelineViewProps) {
  if (recordings.length === 0) {
    return (
      <div className="rounded-lg border border-border-default bg-bg-secondary p-8 text-center text-sm text-text-muted">
        No recordings scheduled for today
      </div>
    );
  }

  const now = new Date();
  const dayStart = new Date(now);
  dayStart.setHours(0, 0, 0, 0);

  const totalMinutes = 24 * 60;

  const getPosition = (date: Date) => {
    const minutes = (date.getTime() - dayStart.getTime()) / (1000 * 60);
    return Math.max(0, Math.min(100, (minutes / totalMinutes) * 100));
  };

  const getWidth = (start: Date, end: Date) => {
    const startMin = Math.max(0, (start.getTime() - dayStart.getTime()) / (1000 * 60));
    const endMin = Math.min(totalMinutes, (end.getTime() - dayStart.getTime()) / (1000 * 60));
    return Math.max(1, ((endMin - startMin) / totalMinutes) * 100);
  };

  const sorted = [...recordings].sort(
    (a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
  );
  const timelineRows = assignRows(sorted);
  const maxRow = timelineRows.reduce((max, r) => Math.max(max, r.row), 0);
  const barAreaHeight = Math.max(32, (maxRow + 1) * 36);

  const hours = Array.from({ length: 24 }, (_, i) => i);

  return (
    <div className="rounded-lg border border-border-default bg-bg-secondary p-4">
      <h3 className="mb-4 text-sm font-medium text-text-primary">Today&apos;s Timeline</h3>

      <div className="hidden md:block">
        <div className="relative">
          <div className="flex border-b border-border-default pb-2">
            {hours.filter((h) => h % 3 === 0).map((hour) => (
              <div
                key={hour}
                className="text-xs text-text-muted"
                style={{ position: 'absolute', left: `${(hour / 24) * 100}%` }}
              >
                {format(new Date().setHours(hour, 0, 0, 0), 'h a')}
              </div>
            ))}
          </div>

          <div className="relative mt-6 border-l border-border-default" style={{ height: barAreaHeight }}>
            {hours.map((hour) => (
              <div
                key={hour}
                className="absolute top-0 h-full border-l border-border-default/30"
                style={{ left: `${(hour / 24) * 100}%` }}
              />
            ))}

            {timelineRows.map(({ recording, row }) => {
              const start = new Date(recording.start_time);
              const end = new Date(recording.end_time);
              const left = getPosition(start);
              const width = getWidth(start, end);
              const top = row * 36 + 2;
              const isRecording = recording.status === 'recording';

              return (
                <div
                  key={recording.id}
                  className="absolute h-8 overflow-hidden rounded-md px-2 py-1"
                  style={{
                    left: `${left}%`,
                    width: `${width}%`,
                    top: `${top}px`,
                  }}
                  title={`${recording.title} (${format(start, 'h:mm a')} – ${format(end, 'h:mm a')})`}
                >
                  <div
                    className={clsx(
                      'flex h-full w-full items-center rounded-md border-l-2',
                      statusColors[recording.status] || 'bg-gray-500',
                      statusBorderColors[recording.status] || 'border-gray-400',
                      isRecording && 'ring-2 ring-red-400/50'
                    )}
                  >
                    <span className="truncate pl-1 text-[10px] font-medium text-white drop-shadow">
                      {recording.title}
                    </span>
                  </div>
                </div>
              );
            })}

            <div
              className="absolute top-0 z-10 h-full w-0.5 bg-red-500"
              style={{ left: `${getPosition(now)}%` }}
              title={`Now — ${format(now, 'h:mm a')}`}
            >
              <div className="absolute -top-1 -left-1 h-2.5 w-2.5 rounded-full bg-red-500" />
            </div>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-3">
          {Object.entries(statusColors).map(([status, color]) => (
            <div key={status} className="flex items-center gap-1.5 text-xs text-text-secondary">
              <div className={clsx('h-2.5 w-2.5 rounded', color)} />
              <span className="capitalize">{status}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="md:hidden">
        <TimelineList recordings={recordings} />
      </div>
    </div>
  );
}
