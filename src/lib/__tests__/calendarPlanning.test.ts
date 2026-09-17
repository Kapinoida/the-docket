import {
  snapToInterval,
  getMinutesFromMidnight,
  getDateFromMinutes,
  getDayStart,
  getDayEnd,
  isSameDay,
  getDaysBetween,
  clampMinutes,
  calculateNewStart,
  calculateNewEnd,
  calculateResizeEnd,
  getEventDurationMinutes,
  getEventSegments,
  getClippedEventTimes,
  calculateOverlapLayout,
  formatMinutesAsTime,
  SNAP_INTERVAL_MINUTES,
  MIN_DURATION_MINUTES,
} from '../calendarPlanning';
import type { CalendarEvent } from '@/types';

function makeEvent(overrides: Partial<CalendarEvent> = {}): CalendarEvent {
  return {
    id: 'evt-1',
    title: 'Test Event',
    description: '',
    start_time: '2026-09-17T14:00:00.000Z',
    end_time: '2026-09-17T15:00:00.000Z',
    is_all_day: false,
    location: '',
    calendar_name: 'Test',
    ...overrides,
  };
}

describe('snapToInterval', () => {
  it('snaps to nearest 15 minutes', () => {
    expect(snapToInterval(0)).toBe(0);
    expect(snapToInterval(7)).toBe(0);
    expect(snapToInterval(8)).toBe(15);
    expect(snapToInterval(14)).toBe(15);
    expect(snapToInterval(22)).toBe(15);
    expect(snapToInterval(23)).toBe(30);
    expect(snapToInterval(37)).toBe(30);
    expect(snapToInterval(38)).toBe(45);
    expect(snapToInterval(45)).toBe(45);
    expect(snapToInterval(59)).toBe(60);
  });

  it('snaps to custom interval', () => {
    expect(snapToInterval(7, 30)).toBe(0);
    expect(snapToInterval(16, 30)).toBe(30);
  });
});

describe('getMinutesFromMidnight', () => {
  it('returns minutes from midnight', () => {
    expect(getMinutesFromMidnight(new Date(2026, 8, 17, 0, 0))).toBe(0);
    expect(getMinutesFromMidnight(new Date(2026, 8, 17, 14, 30))).toBe(870);
    expect(getMinutesFromMidnight(new Date(2026, 8, 17, 23, 59))).toBe(1439);
  });
});

describe('getDateFromMinutes', () => {
  it('creates date from midnight + minutes', () => {
    const midnight = new Date(2026, 8, 17);
    const result = getDateFromMinutes(midnight, 870);
    expect(result.getHours()).toBe(14);
    expect(result.getMinutes()).toBe(30);
  });
});

describe('getDayStart / getDayEnd', () => {
  it('returns start of day', () => {
    const d = new Date(2026, 8, 17, 14, 30, 45, 123);
    const start = getDayStart(d);
    expect(start.getHours()).toBe(0);
    expect(start.getMinutes()).toBe(0);
    expect(start.getSeconds()).toBe(0);
    expect(start.getMilliseconds()).toBe(0);
  });

  it('returns end of day', () => {
    const d = new Date(2026, 8, 17, 14, 30);
    const end = getDayEnd(d);
    expect(end.getHours()).toBe(23);
    expect(end.getMinutes()).toBe(59);
    expect(end.getSeconds()).toBe(59);
  });
});

describe('isSameDay', () => {
  it('returns true for same day', () => {
    expect(isSameDay(
      new Date(2026, 8, 17, 10, 0),
      new Date(2026, 8, 17, 22, 0)
    )).toBe(true);
  });

  it('returns false for different days', () => {
    expect(isSameDay(
      new Date(2026, 8, 17, 23, 59),
      new Date(2026, 8, 18, 0, 0)
    )).toBe(false);
  });
});

describe('getDaysBetween', () => {
  it('returns 0 for same day', () => {
    expect(getDaysBetween(
      new Date(2026, 8, 17, 10, 0),
      new Date(2026, 8, 17, 22, 0)
    )).toBe(0);
  });

  it('returns 1 for consecutive days', () => {
    expect(getDaysBetween(
      new Date(2026, 8, 17),
      new Date(2026, 8, 18)
    )).toBe(1);
  });

  it('returns 7 for a week apart', () => {
    expect(getDaysBetween(
      new Date(2026, 8, 17),
      new Date(2026, 8, 24)
    )).toBe(7);
  });
});

describe('clampMinutes', () => {
  it('clamps below minimum', () => {
    expect(clampMinutes(-30, 0, 1440)).toBe(0);
  });

  it('clamps above maximum', () => {
    expect(clampMinutes(1500, 0, 1440)).toBe(1440);
  });

  it('passes through valid value', () => {
    expect(clampMinutes(720, 0, 1440)).toBe(720);
  });
});

describe('calculateNewStart', () => {
  it('calculates new start preserving offset', () => {
    const dayStart = new Date(2026, 8, 17);
    const result = calculateNewStart(600, 30, dayStart);
    expect(result.getHours()).toBe(9);
    expect(result.getMinutes()).toBe(30);
  });

  it('snaps to interval', () => {
    const dayStart = new Date(2026, 8, 17);
    const result = calculateNewStart(607, 0, dayStart);
    expect(result.getMinutes()).toBe(0);
    expect(result.getHours()).toBe(10);
  });
});

describe('calculateNewEnd', () => {
  it('adds duration to start', () => {
    const start = new Date(2026, 8, 17, 10, 0);
    const end = calculateNewEnd(start, 90);
    expect(end.getHours()).toBe(11);
    expect(end.getMinutes()).toBe(30);
  });
});

describe('calculateResizeEnd', () => {
  it('snaps end time to interval', () => {
    const eventStart = new Date(2026, 8, 17, 10, 0);
    const containerRect = { top: 0 };
    const result = calculateResizeEnd(90, containerRect, 10, eventStart);
    expect(result.getMinutes()).toBe(30);
    expect(result.getHours()).toBe(11);
  });

  it('enforces minimum duration', () => {
    const eventStart = new Date(2026, 8, 17, 10, 0);
    const containerRect = { top: 0 };
    const result = calculateResizeEnd(0, containerRect, 10, eventStart);
    const duration = getEventDurationMinutes(eventStart, result);
    expect(duration).toBeGreaterThanOrEqual(MIN_DURATION_MINUTES);
  });
});

describe('getEventDurationMinutes', () => {
  it('calculates duration in minutes', () => {
    const start = new Date(2026, 8, 17, 10, 0);
    const end = new Date(2026, 8, 17, 11, 30);
    expect(getEventDurationMinutes(start, end)).toBe(90);
  });
});

describe('getEventSegments', () => {
  it('returns single segment for same-day event', () => {
    const event = makeEvent({
      start_time: '2026-09-17T10:00:00.000Z',
      end_time: '2026-09-17T12:00:00.000Z',
    });
    const rangeStart = new Date(2026, 8, 16);
    const rangeEnd = new Date(2026, 8, 18);
    const segments = getEventSegments(event, rangeStart, rangeEnd);
    expect(segments.length).toBe(1);
    expect(segments[0].isStart).toBe(true);
    expect(segments[0].isEnd).toBe(true);
  });

  it('returns multiple segments for multi-day event', () => {
    const event = makeEvent({
      start_time: '2026-09-17T10:00:00.000Z',
      end_time: '2026-09-19T12:00:00.000Z',
    });
    const rangeStart = new Date(2026, 8, 16);
    const rangeEnd = new Date(2026, 8, 20);
    const segments = getEventSegments(event, rangeStart, rangeEnd);
    expect(segments.length).toBe(3);
    expect(segments[0].isStart).toBe(true);
    expect(segments[0].isEnd).toBe(false);
    expect(segments[1].isStart).toBe(false);
    expect(segments[1].isEnd).toBe(false);
    expect(segments[2].isStart).toBe(false);
    expect(segments[2].isEnd).toBe(true);
  });

  it('returns no segments for event outside range', () => {
    const event = makeEvent({
      start_time: '2026-09-20T10:00:00.000Z',
      end_time: '2026-09-20T12:00:00.000Z',
    });
    const rangeStart = new Date(2026, 8, 16);
    const rangeEnd = new Date(2026, 8, 18);
    const segments = getEventSegments(event, rangeStart, rangeEnd);
    expect(segments.length).toBe(0);
  });
});

describe('getClippedEventTimes', () => {
  it('clips start segment to day end', () => {
    const event = makeEvent({
      start_time: '2026-09-17T22:00:00.000Z',
      end_time: '2026-09-18T06:00:00.000Z',
    });
    const dayStart = new Date(2026, 8, 17);
    const dayEnd = new Date(2026, 8, 17, 23, 59, 59, 999);
    const segment = { event, dayStart, dayEnd, isStart: true, isEnd: false };
    const { start, end } = getClippedEventTimes(segment);
    expect(start).toEqual(new Date('2026-09-17T22:00:00.000Z'));
    expect(end).toEqual(dayEnd);
  });

  it('clips end segment to day start', () => {
    const event = makeEvent({
      start_time: '2026-09-17T22:00:00.000Z',
      end_time: '2026-09-18T06:00:00.000Z',
    });
    const dayStart = new Date(2026, 8, 18);
    const dayEnd = new Date(2026, 8, 18, 23, 59, 59, 999);
    const segment = { event, dayStart, dayEnd, isStart: false, isEnd: true };
    const { start, end } = getClippedEventTimes(segment);
    expect(start).toEqual(dayStart);
    expect(end).toEqual(new Date('2026-09-18T06:00:00.000Z'));
  });
});

describe('calculateOverlapLayout', () => {
  it('assigns non-overlapping events to column 0', () => {
    const events = [
      { id: 'a', start: new Date(2026, 8, 17, 10, 0), end: new Date(2026, 8, 17, 11, 0) },
      { id: 'b', start: new Date(2026, 8, 17, 12, 0), end: new Date(2026, 8, 17, 13, 0) },
    ];
    const layout = calculateOverlapLayout(events);
    expect(layout.get('a')?.column).toBe(0);
    expect(layout.get('b')?.column).toBe(0);
  });

  it('assigns overlapping events to different columns', () => {
    const events = [
      { id: 'a', start: new Date(2026, 8, 17, 10, 0), end: new Date(2026, 8, 17, 12, 0) },
      { id: 'b', start: new Date(2026, 8, 17, 11, 0), end: new Date(2026, 8, 17, 13, 0) },
    ];
    const layout = calculateOverlapLayout(events);
    expect(layout.get('a')?.column).toBe(0);
    expect(layout.get('b')?.column).toBe(1);
    expect(layout.get('a')?.totalColumns).toBe(2);
    expect(layout.get('b')?.totalColumns).toBe(2);
  });

  it('handles empty input', () => {
    const layout = calculateOverlapLayout([]);
    expect(layout.size).toBe(0);
  });
});

describe('formatMinutesAsTime', () => {
  it('formats morning time', () => {
    expect(formatMinutesAsTime(540)).toBe('9:00 AM');
  });

  it('formats afternoon time', () => {
    expect(formatMinutesAsTime(870)).toBe('2:30 PM');
  });

  it('formats midnight', () => {
    expect(formatMinutesAsTime(0)).toBe('12:00 AM');
  });

  it('formats noon', () => {
    expect(formatMinutesAsTime(720)).toBe('12:00 PM');
  });
});
