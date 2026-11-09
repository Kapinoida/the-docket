'use client';

import { CalendarDays, X } from 'lucide-react';
import { formatCaptureDate } from '@/lib/captureParser';

interface CaptureDatePreviewProps {
  date: Date | null;
  onChange: (date: Date | null) => void;
}

export default function CaptureDatePreview({ date, onChange }: CaptureDatePreviewProps) {
  if (!date) return null;

  const dateValue = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  const timeValue = date.getHours() === 12 && date.getMinutes() === 0
    ? ''
    : `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;

  const updateDate = (nextDate: string, nextTime: string) => {
    if (!nextDate) {
      onChange(null);
      return;
    }
    const [year, month, day] = nextDate.split('-').map(Number);
    const [hours, minutes] = (nextTime || '12:00').split(':').map(Number);
    const result = new Date(year, month - 1, day, hours, minutes, 0, 0);
    onChange(result);
  };

  return (
    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-text-secondary" aria-label="Parsed date">
      <CalendarDays size={14} className="text-blue-400" />
      <span>Due: <strong className="font-medium text-text-primary">{formatCaptureDate(date)}</strong></span>
      <input
        aria-label="Edit parsed date"
        type="date"
        value={dateValue}
        onChange={(event) => updateDate(event.target.value, timeValue)}
        className="rounded border border-border-default bg-bg-secondary px-1.5 py-1 text-xs text-text-primary"
      />
      <input
        aria-label="Edit parsed time"
        type="time"
        value={timeValue}
        onChange={(event) => updateDate(dateValue, event.target.value)}
        className="rounded border border-border-default bg-bg-secondary px-1.5 py-1 text-xs text-text-primary"
      />
      <button
        type="button"
        onClick={() => onChange(null)}
        className="inline-flex items-center gap-1 rounded px-1.5 py-1 text-text-muted hover:bg-bg-tertiary hover:text-text-primary"
        aria-label="Remove parsed date"
      >
        <X size={13} /> Remove
      </button>
    </div>
  );
}
