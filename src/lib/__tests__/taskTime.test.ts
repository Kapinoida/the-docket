import {
  getTaskDurationMinutes,
  isTaskAllDay,
  isTaskTimed,
  isSameCalendarDay,
  isValidEndTime,
  sameDayClampDragStart,
  DEFAULT_TASK_DURATION_MINUTES,
} from '@/lib/taskTime';
import { Task } from '@/types';

function task(partial: Partial<Task>): Task {
  return {
    id: 1,
    content: 'Test',
    status: 'todo',
    due_date: null,
    created_at: '',
    updated_at: '',
    ...partial,
  } as Task;
}

function iso(year: number, month: number, day: number, h = 0, m = 0): string {
  return new Date(year, month, day, h, m, 0, 0).toISOString();
}

describe('getTaskDurationMinutes', () => {
  it('returns default when no end_time', () => {
    expect(getTaskDurationMinutes(task({ due_date: iso(2026, 5, 15, 10, 0) }))).toBe(DEFAULT_TASK_DURATION_MINUTES);
  });

  it('returns default when no due_date', () => {
    expect(getTaskDurationMinutes(task({ end_time: iso(2026, 5, 15, 11, 0) }))).toBe(DEFAULT_TASK_DURATION_MINUTES);
  });

  it('computes duration from due_date and end_time', () => {
    expect(getTaskDurationMinutes(task({ due_date: iso(2026, 5, 15, 10, 0), end_time: iso(2026, 5, 15, 12, 0) }))).toBe(120);
  });

  it('returns default for end <= start', () => {
    expect(getTaskDurationMinutes(task({ due_date: iso(2026, 5, 15, 10, 0), end_time: iso(2026, 5, 15, 9, 0) }))).toBe(DEFAULT_TASK_DURATION_MINUTES);
  });

  it('handles 30-minute block', () => {
    expect(getTaskDurationMinutes(task({ due_date: iso(2026, 5, 15, 10, 0), end_time: iso(2026, 5, 15, 10, 30) }))).toBe(30);
  });
});

describe('isTaskAllDay', () => {
  it('true when no due_date', () => {
    expect(isTaskAllDay(task({}))).toBe(true);
  });

  it('true when midnight UTC and no end_time', () => {
    const d = new Date(Date.UTC(2026, 5, 15)).toISOString();
    expect(isTaskAllDay(task({ due_date: d }))).toBe(true);
  });

  it('false when end_time present', () => {
    const d = new Date(Date.UTC(2026, 5, 15)).toISOString();
    expect(isTaskAllDay(task({ due_date: d, end_time: iso(2026, 5, 15, 12, 0) }))).toBe(false);
  });

  it('false when start has a time', () => {
    expect(isTaskAllDay(task({ due_date: iso(2026, 5, 15, 14, 0) }))).toBe(false);
  });
});

describe('isTaskTimed', () => {
  it('false when no due_date', () => {
    expect(isTaskTimed(task({}))).toBe(false);
  });

  it('true with a start time', () => {
    expect(isTaskTimed(task({ due_date: iso(2026, 5, 15, 14, 0) }))).toBe(true);
  });

  it('true with midnight start + end_time', () => {
    const d = new Date(Date.UTC(2026, 5, 15)).toISOString();
    expect(isTaskTimed(task({ due_date: d, end_time: iso(2026, 5, 15, 12, 0) }))).toBe(true);
  });
});

describe('isSameCalendarDay', () => {
  it('same day', () => {
    expect(isSameCalendarDay(new Date(2026, 5, 15, 10, 0), new Date(2026, 5, 15, 23, 0))).toBe(true);
  });

  it('different day', () => {
    expect(isSameCalendarDay(new Date(2026, 5, 15, 23, 0), new Date(2026, 5, 16, 0, 0))).toBe(false);
  });
});

describe('isValidEndTime', () => {
  it('null end_time is valid', () => {
    expect(isValidEndTime(iso(2026, 5, 15, 10, 0), null)).toBe(true);
  });

  it('end after start same day is valid', () => {
    expect(isValidEndTime(iso(2026, 5, 15, 10, 0), iso(2026, 5, 15, 12, 0))).toBe(true);
  });

  it('end before start invalid', () => {
    expect(isValidEndTime(iso(2026, 5, 15, 10, 0), iso(2026, 5, 15, 9, 0))).toBe(false);
  });

  it('end on different day invalid', () => {
    expect(isValidEndTime(iso(2026, 5, 15, 23, 0), iso(2026, 5, 16, 1, 0))).toBe(false);
  });

  it('end without start invalid', () => {
    expect(isValidEndTime(null, iso(2026, 5, 15, 12, 0))).toBe(false);
  });
});

describe('sameDayClampDragStart', () => {
  it('clamps start so block fits within grid end', () => {
    // 90-min block, grid 6-22, drag to 21:30 (1290 min) → must fit
    const result = sameDayClampDragStart(21 * 60 + 30, 90, 6, 22);
    expect(result).toBe(22 * 60 - 90); // 1230 (20:30)
  });

  it('clamps to grid start', () => {
    expect(sameDayClampDragStart(5 * 60, 30, 6, 22)).toBe(6 * 60);
  });

  it('snaps to 15-min increments', () => {
    expect(sameDayClampDragStart(10 * 60 + 7, 30, 6, 22)).toBe(10 * 60); // 10:07 → 10:00
    expect(sameDayClampDragStart(10 * 60 + 23, 30, 6, 22)).toBe(10 * 60 + 30); // 10:23 → 10:30
  });

  it('preserves already-valid start', () => {
    expect(sameDayClampDragStart(10 * 60, 60, 6, 22)).toBe(10 * 60);
  });
});