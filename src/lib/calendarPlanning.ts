import { CalendarEvent } from '@/types';

export const SNAP_INTERVAL_MINUTES = 15;
export const MIN_DURATION_MINUTES = 15;
export const HOUR_HEIGHT = 60;

export interface EventSegment {
  event: CalendarEvent;
  dayStart: Date;
  dayEnd: Date;
  isStart: boolean;
  isEnd: boolean;
}

export interface DragState {
  event: CalendarEvent;
  offsetMinutes: number;
  currentStart: Date;
  currentEnd: Date;
}

export interface ResizeState {
  event: CalendarEvent;
  originalEnd: Date;
  newEnd: Date;
}

export function snapToInterval(minutes: number, intervalMinutes: number = SNAP_INTERVAL_MINUTES): number {
  return Math.round(minutes / intervalMinutes) * intervalMinutes;
}

export function getMinutesFromMidnight(date: Date): number {
  return date.getHours() * 60 + date.getMinutes();
}

export function getDateFromMinutes(midnight: Date, minutes: number): Date {
  const date = new Date(midnight);
  date.setHours(0, 0, 0, 0);
  date.setMinutes(minutes);
  return date;
}

export function getDayStart(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function getDayEnd(date: Date): Date {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

export function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() &&
         a.getMonth() === b.getMonth() &&
         a.getDate() === b.getDate();
}

export function getDaysBetween(start: Date, end: Date): number {
  const startDay = getDayStart(start);
  const endDay = getDayStart(end);
  return Math.round((endDay.getTime() - startDay.getTime()) / (24 * 60 * 60 * 1000));
}

export function clampMinutes(minutes: number, minMinutes: number, maxMinutes: number): number {
  return Math.max(minMinutes, Math.min(maxMinutes, minutes));
}

export function calculateDragOffset(
  clientY: number,
  containerRect: { top: number },
  hourStart: number,
  hourEnd: number
): number {
  const y = clientY - containerRect.top;
  const totalMinutes = (hourEnd - hourStart) * 60;
  const minutes = (y / HOUR_HEIGHT) * 60 + hourStart * 60;
  return snapToInterval(minutes);
}

export function calculateNewStart(
  dragMinutes: number,
  offsetMinutes: number,
  dayStart: Date
): Date {
  const snapped = snapToInterval(dragMinutes - offsetMinutes);
  return getDateFromMinutes(dayStart, snapped);
}

export function calculateNewEnd(
  newStart: Date,
  durationMinutes: number
): Date {
  const end = new Date(newStart);
  end.setMinutes(end.getMinutes() + durationMinutes);
  return end;
}

export function calculateResizeEnd(
  clientY: number,
  containerRect: { top: number },
  hourStart: number,
  eventStart: Date
): Date {
  const y = clientY - containerRect.top;
  const minutes = (y / HOUR_HEIGHT) * 60 + hourStart * 60;
  const snapped = snapToInterval(minutes);
  
  const dayStart = getDayStart(eventStart);
  const newEnd = getDateFromMinutes(dayStart, snapped);
  
  const minEnd = new Date(eventStart);
  minEnd.setMinutes(minEnd.getMinutes() + MIN_DURATION_MINUTES);
  
  return newEnd < minEnd ? minEnd : newEnd;
}

export function getEventDurationMinutes(start: Date, end: Date): number {
  return (end.getTime() - start.getTime()) / (1000 * 60);
}

export function getEventSegments(
  event: CalendarEvent,
  rangeStart: Date,
  rangeEnd: Date
): EventSegment[] {
  const eventStart = new Date(event.start_time);
  const eventEnd = new Date(event.end_time);
  const segments: EventSegment[] = [];
  
  let currentDay = getDayStart(rangeStart);
  const endDay = getDayStart(rangeEnd);
  
  while (currentDay <= endDay) {
    const dayStart = getDayStart(currentDay);
    const dayEnd = getDayEnd(currentDay);
    
    if (eventEnd > dayStart && eventStart <= dayEnd) {
      segments.push({
        event,
        dayStart,
        dayEnd,
        isStart: isSameDay(eventStart, currentDay),
        isEnd: isSameDay(eventEnd, currentDay),
      });
    }
    
    currentDay = new Date(currentDay);
    currentDay.setDate(currentDay.getDate() + 1);
  }
  
  return segments;
}

export function getClippedEventTimes(
  segment: EventSegment
): { start: Date; end: Date } {
  const eventStart = new Date(segment.event.start_time);
  const eventEnd = new Date(segment.event.end_time);
  
  return {
    start: segment.isStart ? eventStart : segment.dayStart,
    end: segment.isEnd ? eventEnd : segment.dayEnd,
  };
}

export interface OverlapLayout {
  column: number;
  totalColumns: number;
}

export function calculateOverlapLayout(
  events: Array<{ id: string | number; start: Date; end: Date }>
): Map<string | number, OverlapLayout> {
  const layouts = new Map<string | number, OverlapLayout>();
  
  if (events.length === 0) return layouts;
  
  const sorted = [...events].sort((a, b) => a.start.getTime() - b.start.getTime());
  const columns: Array<{ end: Date; ids: (string | number)[] }> = [];
  
  for (const event of sorted) {
    let placed = false;
    
    for (let col = 0; col < columns.length; col++) {
      if (columns[col].end <= event.start) {
        columns[col].end = event.end;
        columns[col].ids.push(event.id);
        layouts.set(event.id, { column: col, totalColumns: 0 });
        placed = true;
        break;
      }
    }
    
    if (!placed) {
      columns.push({ end: event.end, ids: [event.id] });
      layouts.set(event.id, { column: columns.length - 1, totalColumns: 0 });
    }
  }
  
  for (const [, layout] of layouts) {
    layout.totalColumns = columns.length;
  }
  
  return layouts;
}

export function formatMinutesAsTime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
  return `${displayHours}:${mins.toString().padStart(2, '0')} ${period}`;
}
