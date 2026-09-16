import { isTrulyAllDay, eventColorStyle, hexToRgb } from '../calendar';
import type { CalendarEvent } from '@/types';

function makeEvent(overrides: Partial<CalendarEvent> = {}): CalendarEvent {
  return {
    id: 'test-uid',
    title: 'Test Event',
    description: '',
    start_time: '2026-09-16T10:00:00.000Z',
    end_time: '2026-09-16T11:00:00.000Z',
    is_all_day: false,
    location: '',
    calendar_name: 'Test Calendar',
    calendar_color: '#3b82f6',
    ...overrides,
  };
}

describe('isTrulyAllDay', () => {
  it('returns true when is_all_day flag is set', () => {
    const event = makeEvent({ is_all_day: true });
    expect(isTrulyAllDay(event)).toBe(true);
  });

  it('returns true for midnight-to-midnight UTC events (24h duration)', () => {
    const event = makeEvent({
      is_all_day: false,
      start_time: '2026-09-16T00:00:00.000Z',
      end_time: '2026-09-17T00:00:00.000Z',
    });
    expect(isTrulyAllDay(event)).toBe(true);
  });

  it('returns false for timed events with non-midnight start', () => {
    const event = makeEvent({
      is_all_day: false,
      start_time: '2026-09-16T10:00:00.000Z',
      end_time: '2026-09-16T11:00:00.000Z',
    });
    expect(isTrulyAllDay(event)).toBe(false);
  });

  it('returns false for midnight start but not 24h duration', () => {
    const event = makeEvent({
      is_all_day: false,
      start_time: '2026-09-16T00:00:00.000Z',
      end_time: '2026-09-16T12:00:00.000Z',
    });
    expect(isTrulyAllDay(event)).toBe(false);
  });
});

describe('eventColorStyle', () => {
  it('returns rgba styles from hex color', () => {
    const style = eventColorStyle('#3b82f6');
    expect(style.backgroundColor).toContain('rgba(59, 130, 246');
    expect(style.borderColor).toContain('rgba(59, 130, 246');
    expect(style.color).toBe('#fff');
  });

  it('falls back to default purple when no color provided', () => {
    const style = eventColorStyle();
    expect(style.backgroundColor).toContain('rgba(124, 58, 237');
  });

  it('falls back to default purple for invalid hex', () => {
    const style = eventColorStyle('not-a-color');
    expect(style.backgroundColor).toContain('rgba(124, 58, 237');
  });
});

describe('hexToRgb', () => {
  it('parses 6-digit hex color', () => {
    expect(hexToRgb('#3b82f6')).toEqual({ r: 59, g: 130, b: 246 });
  });

  it('parses hex without hash', () => {
    expect(hexToRgb('ff0000')).toEqual({ r: 255, g: 0, b: 0 });
  });

  it('returns default for invalid input', () => {
    expect(hexToRgb('invalid')).toEqual({ r: 124, g: 58, b: 237 });
  });
});

describe('multi-day event inclusion', () => {
  function getItemsForDay(events: CalendarEvent[], date: Date) {
    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(date);
    dayEnd.setHours(23, 59, 59, 999);
    return events.filter(e => {
      const eStart = new Date(e.start_time);
      const eEnd = new Date(e.end_time);
      return eStart <= dayEnd && eEnd >= dayStart;
    });
  }

  const multiDayEvent = makeEvent({
    id: 'multi-day',
    start_time: '2026-09-15T09:00:00.000Z',
    end_time: '2026-09-18T17:00:00.000Z',
  });

  const singleDayEvent = makeEvent({
    id: 'single-day',
    start_time: '2026-09-16T10:00:00.000Z',
    end_time: '2026-09-16T11:00:00.000Z',
  });

  it('includes multi-day event on its start day', () => {
    const day = new Date(2026, 8, 15);
    const result = getItemsForDay([multiDayEvent, singleDayEvent], day);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('multi-day');
  });

  it('includes multi-day event on middle days', () => {
    const day = new Date(2026, 8, 16);
    const result = getItemsForDay([multiDayEvent, singleDayEvent], day);
    expect(result).toHaveLength(2);
    expect(result.map(e => e.id).sort()).toEqual(['multi-day', 'single-day']);
  });

  it('includes multi-day event on its end day', () => {
    const day = new Date(2026, 8, 18);
    const result = getItemsForDay([multiDayEvent], day);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('multi-day');
  });

  it('excludes multi-day event on days outside its range', () => {
    const day = new Date(2026, 8, 19);
    const result = getItemsForDay([multiDayEvent], day);
    expect(result).toHaveLength(0);
  });

  it('excludes multi-day event on days before its range', () => {
    const day = new Date(2026, 8, 14);
    const result = getItemsForDay([multiDayEvent], day);
    expect(result).toHaveLength(0);
  });
});
