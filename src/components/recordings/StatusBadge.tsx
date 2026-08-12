import { RecordingStatus } from '@/types';
import { clsx } from 'clsx';

interface StatusBadgeProps {
  status: RecordingStatus;
  className?: string;
}

const statusConfig: Record<RecordingStatus, { label: string; classes: string }> = {
  pending: {
    label: 'Pending',
    classes: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
  },
  scheduled: {
    label: 'Scheduled',
    classes: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  },
  recording: {
    label: 'Recording',
    classes: 'bg-red-500/20 text-red-400 border-red-500/30 animate-pulse',
  },
  completed: {
    label: 'Completed',
    classes: 'bg-green-500/20 text-green-400 border-green-500/30',
  },
  failed: {
    label: 'Failed',
    classes: 'bg-red-500/20 text-red-400 border-red-500/30',
  },
  cancelled: {
    label: 'Cancelled',
    classes: 'bg-gray-500/20 text-gray-500 border-gray-500/30',
  },
};

export default function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status];

  return (
    <span
      className={clsx(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium',
        config.classes,
        className
      )}
    >
      {config.label}
    </span>
  );
}
