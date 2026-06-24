import type { CalendarEvent } from '@/types';
import { parseLocalDateNode } from '@/lib/dateUtils';

export type { CalendarEvent, CalendarSource } from '@/types';

export const hexToRgb = (hex: string) => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) }
    : { r: 124, g: 58, b: 237 };
};

export const eventColorStyle = (color?: string) => {
  const c = color || '#7c3aed';
  const { r, g, b } = hexToRgb(c);
  return {
    backgroundColor: `rgba(${r}, ${g}, ${b}, 0.75)`,
    borderColor: `rgba(${r}, ${g}, ${b}, 0.85)`,
    color: '#fff',
  };
};

export const isTrulyAllDay = (event: CalendarEvent) => {
  if (event.is_all_day) return true;
  if (typeof event.start_time === 'string' && event.start_time.endsWith('T00:00:00.000Z')) {
    const dur = new Date(event.end_time).getTime() - new Date(event.start_time).getTime();
    if (dur === 24 * 60 * 60 * 1000) return true;
  }
  return false;
};