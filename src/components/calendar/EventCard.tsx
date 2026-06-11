'use client';

import { CalendarEvent, eventColorStyle, isTrulyAllDay } from '@/lib/calendar';
import { format } from 'date-fns';

interface EventCardProps {
  event: CalendarEvent;
  onClick?: (event: CalendarEvent) => void;
  variant?: 'standard' | 'compact' | 'allday';
  className?: string;
}

export function EventCard({ event, onClick, variant = 'standard', className = '' }: EventCardProps) {
  const colors = eventColorStyle(event.calendar_color);
  const showTime = !isTrulyAllDay(event);
  const timeStr = showTime ? format(new Date(event.start_time), 'h:mm a') : null;

  if (variant === 'allday') {
    return (
      <div
        onClick={() => onClick?.(event)}
        className={`px-2 py-1 rounded text-xs border cursor-pointer hover:opacity-80 ${className}`}
        style={{ backgroundColor: colors.backgroundColor, borderColor: colors.borderColor, color: colors.color }}
      >
        {event.title}
      </div>
    );
  }

  if (variant === 'compact') {
    return (
      <div
        onClick={() => onClick?.(event)}
        className={`p-0.5 px-1.5 rounded text-[10px] truncate cursor-pointer hover:opacity-80 ${className}`}
        style={{ backgroundColor: colors.backgroundColor, borderColor: colors.borderColor, color: colors.color }}
      >
        {showTime && <span className="opacity-60 mr-1">{timeStr}</span>}
        {event.title}
      </div>
    );
  }

  return (
    <div
      onClick={() => onClick?.(event)}
      className={`p-1.5 px-2.5 rounded text-xs border ${onClick ? 'cursor-pointer hover:opacity-80' : ''} ${className}`}
      style={{ backgroundColor: colors.backgroundColor, borderColor: colors.borderColor, color: colors.color }}
    >
      <div className="flex items-center gap-1.5">
        {showTime && <span className="text-xs opacity-75 whitespace-nowrap">{timeStr}</span>}
        <span className="font-medium truncate">{event.title}</span>
      </div>
    </div>
  );
}