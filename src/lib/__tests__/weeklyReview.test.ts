import {
  getLooseEnds,
  getStaleTasks,
  getOverdueTasks,
  getLookaheadEvents,
  getLookaheadTasks,
  getLookaheadItems,
  groupLookaheadByDay,
  getReviewSummary,
  getTaskAgeDays,
  getWeekRange,
  getWaitingTasks,
  getSomedayTasks,
} from '@/lib/weeklyReview';
import { Task, CalendarEvent } from '@/types';

function createTask(overrides: Partial<Task> = {}): Task {
  return {
    id: 1,
    content: 'Test task',
    status: 'todo',
    due_date: null,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

function createEvent(overrides: Partial<CalendarEvent> = {}): CalendarEvent {
  return {
    id: 'evt-1',
    title: 'Test event',
    description: '',
    start_time: new Date().toISOString(),
    end_time: new Date(Date.now() + 3600000).toISOString(),
    is_all_day: false,
    location: '',
    calendar_name: 'Test',
    ...overrides,
  };
}

describe('getLooseEnds', () => {
  it('returns inbox tasks (no page_name, not done, not empty)', () => {
    const tasks = [
      createTask({ id: 1, page_name: undefined }),
      createTask({ id: 2, page_name: 'Some Page' }),
      createTask({ id: 3, status: 'done' }),
      createTask({ id: 4, content: '' }),
    ];
    const loose = getLooseEnds(tasks);
    expect(loose.inbox).toHaveLength(1);
    expect(loose.inbox[0].id).toBe(1);
  });

  it('returns undated active tasks', () => {
    const tasks = [
      createTask({ id: 1, due_date: null }),
      createTask({ id: 2, due_date: '2026-01-01T12:00:00.000Z' }),
      createTask({ id: 3, due_date: null, status: 'done' }),
    ];
    const loose = getLooseEnds(tasks);
    expect(loose.undated).toHaveLength(1);
    expect(loose.undated[0].id).toBe(1);
  });

  it('returns tasks without page context', () => {
    const tasks = [
      createTask({ id: 1, page_name: undefined }),
      createTask({ id: 2, page_name: 'Page' }),
    ];
    const loose = getLooseEnds(tasks);
    expect(loose.withoutContext).toHaveLength(1);
    expect(loose.withoutContext[0].id).toBe(1);
  });

  it('returns tasks without next_action', () => {
    const tasks = [
      createTask({ id: 1, next_action: null }),
      createTask({ id: 2, next_action: 'Do something' }),
    ];
    const loose = getLooseEnds(tasks);
    expect(loose.withoutNextAction).toHaveLength(1);
    expect(loose.withoutNextAction[0].id).toBe(1);
  });
});

describe('getStaleTasks', () => {
  it('returns tasks updated more than 14 days ago', () => {
    const old = new Date();
    old.setDate(old.getDate() - 20);
    const recent = new Date();
    recent.setDate(recent.getDate() - 5);
    const tasks = [
      createTask({ id: 1, updated_at: old.toISOString() }),
      createTask({ id: 2, updated_at: recent.toISOString() }),
    ];
    const stale = getStaleTasks(tasks);
    expect(stale).toHaveLength(1);
    expect(stale[0].id).toBe(1);
  });

  it('excludes done and cancelled tasks', () => {
    const old = new Date();
    old.setDate(old.getDate() - 20);
    const tasks = [
      createTask({ id: 1, updated_at: old.toISOString(), status: 'done' }),
      createTask({ id: 2, updated_at: old.toISOString(), status: 'cancelled' }),
      createTask({ id: 3, updated_at: old.toISOString(), status: 'todo' }),
    ];
    const stale = getStaleTasks(tasks);
    expect(stale).toHaveLength(1);
    expect(stale[0].id).toBe(3);
  });

  it('excludes tasks updated exactly 14 days ago', () => {
    const exactly14 = new Date();
    exactly14.setDate(exactly14.getDate() - 14);
    const tasks = [createTask({ id: 1, updated_at: exactly14.toISOString() })];
    const stale = getStaleTasks(tasks);
    expect(stale).toHaveLength(0);
  });
});

describe('getOverdueTasks', () => {
  it('returns tasks with due_date before today', () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const tasks = [
      createTask({ id: 1, due_date: yesterday.toISOString() }),
      createTask({ id: 2, due_date: null }),
    ];
    const overdue = getOverdueTasks(tasks);
    expect(overdue).toHaveLength(1);
    expect(overdue[0].id).toBe(1);
  });

  it('excludes tasks due today', () => {
    const today = new Date();
    today.setHours(12, 0, 0, 0);
    const tasks = [createTask({ id: 1, due_date: today.toISOString() })];
    expect(getOverdueTasks(tasks)).toHaveLength(0);
  });

  it('excludes done tasks', () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const tasks = [createTask({ id: 1, status: 'done', due_date: yesterday.toISOString() })];
    expect(getOverdueTasks(tasks)).toHaveLength(0);
  });
});

describe('getLookaheadEvents', () => {
  it('returns events within the next 14 days', () => {
    const in3Days = new Date();
    in3Days.setDate(in3Days.getDate() + 3);
    const in20Days = new Date();
    in20Days.setDate(in20Days.getDate() + 20);
    const events = [
      createEvent({ id: '1', start_time: in3Days.toISOString() }),
      createEvent({ id: '2', start_time: in20Days.toISOString() }),
    ];
    const lookahead = getLookaheadEvents(events);
    expect(lookahead).toHaveLength(1);
    expect(lookahead[0].id).toBe('1');
  });

  it('excludes past events', () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const events = [createEvent({ id: '1', start_time: yesterday.toISOString() })];
    expect(getLookaheadEvents(events)).toHaveLength(0);
  });
});

describe('getLookaheadTasks', () => {
  it('returns tasks due within the next 14 days', () => {
    const in3Days = new Date();
    in3Days.setDate(in3Days.getDate() + 3);
    const in20Days = new Date();
    in20Days.setDate(in20Days.getDate() + 20);
    const tasks = [
      createTask({ id: 1, due_date: in3Days.toISOString() }),
      createTask({ id: 2, due_date: in20Days.toISOString() }),
    ];
    const lookahead = getLookaheadTasks(tasks);
    expect(lookahead).toHaveLength(1);
    expect(lookahead[0].id).toBe(1);
  });

  it('excludes undated tasks', () => {
    const tasks = [createTask({ id: 1, due_date: null })];
    expect(getLookaheadTasks(tasks)).toHaveLength(0);
  });
});

describe('getLookaheadItems', () => {
  it('merges events and tasks sorted chronologically', () => {
    const in1Day = new Date();
    in1Day.setDate(in1Day.getDate() + 1);
    in1Day.setHours(9, 0, 0, 0);

    const in2Days = new Date();
    in2Days.setDate(in2Days.getDate() + 2);
    in2Days.setHours(14, 0, 0, 0);

    const in3Days = new Date();
    in3Days.setDate(in3Days.getDate() + 3);
    in3Days.setHours(10, 0, 0, 0);

    const events = [
      createEvent({ id: 'evt-1', start_time: in1Day.toISOString() }),
      createEvent({ id: 'evt-2', start_time: in3Days.toISOString() }),
    ];
    const tasks = [
      createTask({ id: 1, due_date: in2Days.toISOString() }),
    ];

    const items = getLookaheadItems(events, tasks);
    expect(items).toHaveLength(3);
    expect(items[0].kind).toBe('event');
    expect(items[1].kind).toBe('task');
    expect(items[2].kind).toBe('event');
  });

  it('sorts same-day items by time', () => {
    const now = new Date();
    const in1Hour = new Date(now.getTime() + 3600000);
    const in2Hours = new Date(now.getTime() + 7200000);
    const in3Hours = new Date(now.getTime() + 10800000);

    const events = [
      createEvent({ id: 'evt-1', start_time: in3Hours.toISOString() }),
    ];
    const tasks = [
      createTask({ id: 1, due_date: in1Hour.toISOString() }),
      createTask({ id: 2, due_date: in2Hours.toISOString() }),
    ];

    const items = getLookaheadItems(events, tasks);
    expect(items).toHaveLength(3);
    expect(items[0].kind).toBe('task');
    expect(items[1].kind).toBe('task');
    expect(items[2].kind).toBe('event');
  });

  it('excludes done and cancelled tasks', () => {
    const in2Days = new Date();
    in2Days.setDate(in2Days.getDate() + 2);

    const tasks = [
      createTask({ id: 1, due_date: in2Days.toISOString(), status: 'todo' }),
      createTask({ id: 2, due_date: in2Days.toISOString(), status: 'done' }),
      createTask({ id: 3, due_date: in2Days.toISOString(), status: 'cancelled' }),
    ];

    const items = getLookaheadItems([], tasks);
    expect(items).toHaveLength(1);
  });

  it('excludes past events and tasks', () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const events = [createEvent({ id: 'evt-1', start_time: yesterday.toISOString() })];
    const tasks = [createTask({ id: 1, due_date: yesterday.toISOString() })];

    const items = getLookaheadItems(events, tasks);
    expect(items).toHaveLength(0);
  });

  it('returns empty array when nothing is scheduled', () => {
    const items = getLookaheadItems([], []);
    expect(items).toHaveLength(0);
  });
});

describe('groupLookaheadByDay', () => {
  it('groups items by calendar date', () => {
    const today9am = new Date();
    today9am.setHours(9, 0, 0, 0);

    const today2pm = new Date();
    today2pm.setHours(14, 0, 0, 0);

    const tomorrow10am = new Date();
    tomorrow10am.setDate(tomorrow10am.getDate() + 1);
    tomorrow10am.setHours(10, 0, 0, 0);

    const items = [
      { kind: 'task' as const, date: today9am, task: createTask({ id: 1 }) },
      { kind: 'task' as const, date: today2pm, task: createTask({ id: 2 }) },
      { kind: 'event' as const, date: tomorrow10am, event: createEvent({ id: 'evt-1' }) },
    ];

    const groups = groupLookaheadByDay(items);
    expect(groups).toHaveLength(2);
    expect(groups[0].label).toBe('Today');
    expect(groups[0].items).toHaveLength(2);
    expect(groups[1].label).toBe('Tomorrow');
    expect(groups[1].items).toHaveLength(1);
  });

  it('labels today and tomorrow correctly', () => {
    const today = new Date();
    today.setHours(12, 0, 0, 0);
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(12, 0, 0, 0);

    const items = [
      { kind: 'task' as const, date: today, task: createTask({ id: 1 }) },
      { kind: 'task' as const, date: tomorrow, task: createTask({ id: 2 }) },
    ];

    const groups = groupLookaheadByDay(items);
    expect(groups[0].label).toBe('Today');
    expect(groups[1].label).toBe('Tomorrow');
  });

  it('uses weekday+date for days beyond tomorrow', () => {
    const in5Days = new Date();
    in5Days.setDate(in5Days.getDate() + 5);
    in5Days.setHours(12, 0, 0, 0);

    const items = [
      { kind: 'task' as const, date: in5Days, task: createTask({ id: 1 }) },
    ];

    const groups = groupLookaheadByDay(items);
    expect(groups).toHaveLength(1);
    expect(groups[0].label).not.toBe('Today');
    expect(groups[0].label).not.toBe('Tomorrow');
    expect(groups[0].label).toMatch(/\w{3},?\s\w{3} \d{1,2}/);
  });

  it('returns empty array for empty input', () => {
    const groups = groupLookaheadByDay([]);
    expect(groups).toHaveLength(0);
  });
});

describe('getReviewSummary', () => {
  it('returns all summary data', () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const in3Days = new Date();
    in3Days.setDate(in3Days.getDate() + 3);
    const tasks = [
      createTask({ id: 1, page_name: undefined, due_date: null }),
      createTask({ id: 2, due_date: yesterday.toISOString(), page_name: 'Page' }),
      createTask({ id: 3, due_date: in3Days.toISOString(), page_name: 'Page' }),
    ];
    const events = [createEvent({ start_time: in3Days.toISOString() })];
    const summary = getReviewSummary(tasks, events);
    expect(summary.looseEnds.inbox).toHaveLength(1);
    expect(summary.overdueTasks).toHaveLength(1);
    expect(summary.lookaheadTasks).toHaveLength(1);
    expect(summary.lookaheadEvents).toHaveLength(1);
  });
});

describe('getTaskAgeDays', () => {
  it('returns 0 for tasks updated today', () => {
    const task = createTask({ updated_at: new Date().toISOString() });
    expect(getTaskAgeDays(task)).toBe(0);
  });

  it('returns correct age for old tasks', () => {
    const old = new Date();
    old.setDate(old.getDate() - 10);
    const task = createTask({ updated_at: old.toISOString() });
    expect(getTaskAgeDays(task)).toBe(10);
  });
});

describe('getWeekRange', () => {
  it('returns start, end, and label', () => {
    const range = getWeekRange();
    expect(range.start).toBeInstanceOf(Date);
    expect(range.end).toBeInstanceOf(Date);
    expect(typeof range.label).toBe('string');
    expect(range.label).toContain('–');
  });

  it('end is 6 days after start', () => {
    const range = getWeekRange();
    const diffDays = Math.floor((range.end.getTime() - range.start.getTime()) / (24 * 60 * 60 * 1000));
    expect(diffDays).toBe(6);
  });
});

describe('getWaitingTasks', () => {
  it('returns only waiting tasks', () => {
    const tasks = [
      createTask({ id: 1, status: 'todo' }),
      createTask({ id: 2, status: 'waiting', waiting_on: 'Bob' }),
      createTask({ id: 3, status: 'someday' }),
      createTask({ id: 4, status: 'waiting', waiting_on: 'Alice' }),
    ];
    const waiting = getWaitingTasks(tasks);
    expect(waiting).toHaveLength(2);
    expect(waiting.map(t => t.id)).toEqual([2, 4]);
  });

  it('returns empty array when no waiting tasks', () => {
    const tasks = [createTask({ id: 1, status: 'todo' })];
    expect(getWaitingTasks(tasks)).toHaveLength(0);
  });
});

describe('getSomedayTasks', () => {
  it('returns only someday tasks', () => {
    const tasks = [
      createTask({ id: 1, status: 'todo' }),
      createTask({ id: 2, status: 'someday' }),
      createTask({ id: 3, status: 'waiting' }),
      createTask({ id: 4, status: 'someday' }),
    ];
    const someday = getSomedayTasks(tasks);
    expect(someday).toHaveLength(2);
    expect(someday.map(t => t.id)).toEqual([2, 4]);
  });
});

describe('someday exclusion', () => {
  it('excludes someday from getLooseEnds inbox', () => {
    const tasks = [
      createTask({ id: 1, page_name: undefined, status: 'todo' }),
      createTask({ id: 2, page_name: undefined, status: 'someday' }),
    ];
    const loose = getLooseEnds(tasks);
    expect(loose.inbox).toHaveLength(1);
    expect(loose.inbox[0].id).toBe(1);
  });

  it('excludes someday from getStaleTasks', () => {
    const old = new Date();
    old.setDate(old.getDate() - 20);
    const tasks = [
      createTask({ id: 1, updated_at: old.toISOString(), status: 'todo' }),
      createTask({ id: 2, updated_at: old.toISOString(), status: 'someday' }),
    ];
    const stale = getStaleTasks(tasks);
    expect(stale).toHaveLength(1);
    expect(stale[0].id).toBe(1);
  });

  it('excludes someday from getOverdueTasks', () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const tasks = [
      createTask({ id: 1, due_date: yesterday.toISOString(), status: 'todo' }),
      createTask({ id: 2, due_date: yesterday.toISOString(), status: 'someday' }),
    ];
    const overdue = getOverdueTasks(tasks);
    expect(overdue).toHaveLength(1);
    expect(overdue[0].id).toBe(1);
  });

  it('includes waiting tasks in review summary', () => {
    const tasks = [
      createTask({ id: 1, status: 'waiting', waiting_on: 'Bob' }),
      createTask({ id: 2, status: 'someday' }),
    ];
    const summary = getReviewSummary(tasks, []);
    expect(summary.waitingTasks).toHaveLength(1);
    expect(summary.somedayTasks).toHaveLength(1);
  });
});
