import {
  getActiveTasks,
  getOverdueTasks,
  getInboxTasks,
  getUndatedTasks,
  getTodayTasks,
  getTodayEvents,
  getTodayCommitments,
  getDashboardCounts,
  getTopOverdue,
  getGreeting,
  commitmentLabel,
} from '@/lib/dashboardPlanning';
import { Task, CalendarEvent } from '@/types';

function createTask(overrides: Partial<Task> = {}): Task {
  return {
    id: 1,
    content: 'Test task',
    status: 'todo',
    due_date: null,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function createEvent(overrides: Partial<CalendarEvent> = {}): CalendarEvent {
  return {
    id: 'evt-1',
    title: 'Test event',
    description: '',
    start_time: '2026-01-01T10:00:00.000Z',
    end_time: '2026-01-01T11:00:00.000Z',
    is_all_day: false,
    location: '',
    calendar_name: 'Test',
    ...overrides,
  };
}

describe('getActiveTasks', () => {
  it('excludes done and cancelled tasks', () => {
    const tasks = [
      createTask({ id: 1, status: 'todo' }),
      createTask({ id: 2, status: 'in_progress' }),
      createTask({ id: 3, status: 'done' }),
      createTask({ id: 4, status: 'cancelled' }),
    ];
    const active = getActiveTasks(tasks);
    expect(active).toHaveLength(2);
    expect(active.map(t => t.id)).toEqual([1, 2]);
  });

  it('returns empty array for empty input', () => {
    expect(getActiveTasks([])).toEqual([]);
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

describe('getInboxTasks', () => {
  it('returns tasks without page_name and not done', () => {
    const tasks = [
      createTask({ id: 1, page_name: undefined }),
      createTask({ id: 2, page_name: 'Some Page' }),
      createTask({ id: 3, status: 'done' }),
      createTask({ id: 4, content: '' }),
    ];
    const inbox = getInboxTasks(tasks);
    expect(inbox).toHaveLength(1);
    expect(inbox[0].id).toBe(1);
  });
});

describe('getUndatedTasks', () => {
  it('returns active tasks without due_date', () => {
    const tasks = [
      createTask({ id: 1, due_date: null }),
      createTask({ id: 2, due_date: '2026-01-01T12:00:00.000Z' }),
      createTask({ id: 3, due_date: null, status: 'done' }),
    ];
    const undated = getUndatedTasks(tasks);
    expect(undated).toHaveLength(1);
    expect(undated[0].id).toBe(1);
  });
});

describe('getTodayTasks', () => {
  it('returns tasks due today', () => {
    const today = new Date();
    today.setHours(12, 0, 0, 0);
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const tasks = [
      createTask({ id: 1, due_date: today.toISOString() }),
      createTask({ id: 2, due_date: yesterday.toISOString() }),
    ];
    const todayTasks = getTodayTasks(tasks);
    expect(todayTasks).toHaveLength(1);
    expect(todayTasks[0].id).toBe(1);
  });
});

describe('getTodayEvents', () => {
  it('returns events for today', () => {
    const today = new Date();
    today.setHours(10, 0, 0, 0);
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(10, 0, 0, 0);
    const events = [
      createEvent({ id: '1', start_time: today.toISOString() }),
      createEvent({ id: '2', start_time: tomorrow.toISOString() }),
    ];
    const todayEvents = getTodayEvents(events);
    expect(todayEvents).toHaveLength(1);
    expect(todayEvents[0].id).toBe('1');
  });
});

describe('getTodayCommitments', () => {
  it('groups today tasks by commitment level', () => {
    const today = new Date();
    today.setHours(12, 0, 0, 0);
    const tasks = [
      createTask({ id: 1, due_date: today.toISOString(), commitment_level: 'must' }),
      createTask({ id: 2, due_date: today.toISOString(), commitment_level: 'should' }),
      createTask({ id: 3, due_date: today.toISOString(), commitment_level: 'could' }),
      createTask({ id: 4, due_date: today.toISOString(), commitment_level: null }),
    ];
    const commitments = getTodayCommitments(tasks);
    expect(commitments.must).toHaveLength(1);
    expect(commitments.should).toHaveLength(1);
    expect(commitments.could).toHaveLength(1);
    expect(commitments.unassigned).toHaveLength(1);
  });
});

describe('getDashboardCounts', () => {
  it('returns all counts', () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const today = new Date();
    today.setHours(12, 0, 0, 0);
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tasks = [
      createTask({ id: 1, due_date: yesterday.toISOString(), page_name: 'Page' }),
      createTask({ id: 2, page_name: undefined, due_date: tomorrow.toISOString() }),
      createTask({ id: 3, due_date: null, page_name: 'Page' }),
      createTask({ id: 4, due_date: today.toISOString(), page_name: 'Page' }),
    ];
    const events = [createEvent({ start_time: today.toISOString() })];
    const counts = getDashboardCounts(tasks, events);
    expect(counts.overdue).toBe(1);
    expect(counts.inbox).toBe(1);
    expect(counts.undated).toBe(1);
    expect(counts.todayTasks).toBe(1);
    expect(counts.todayEvents).toBe(1);
  });
});

describe('getTopOverdue', () => {
  it('returns limited overdue tasks', () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const tasks = [
      createTask({ id: 1, due_date: yesterday.toISOString() }),
      createTask({ id: 2, due_date: yesterday.toISOString() }),
      createTask({ id: 3, due_date: yesterday.toISOString() }),
      createTask({ id: 4, due_date: yesterday.toISOString() }),
    ];
    const top = getTopOverdue(tasks, 2);
    expect(top).toHaveLength(2);
  });

  it('returns all when fewer than limit', () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const tasks = [createTask({ id: 1, due_date: yesterday.toISOString() })];
    const top = getTopOverdue(tasks, 3);
    expect(top).toHaveLength(1);
  });
});

describe('getGreeting', () => {
  it('returns a string', () => {
    const greeting = getGreeting();
    expect(typeof greeting).toBe('string');
    expect(['Good morning', 'Good afternoon', 'Good evening']).toContain(greeting);
  });
});

describe('commitmentLabel', () => {
  it('returns Must for must', () => {
    expect(commitmentLabel('must')).toBe('Must');
  });

  it('returns Should for should', () => {
    expect(commitmentLabel('should')).toBe('Should');
  });

  it('returns Could for could', () => {
    expect(commitmentLabel('could')).toBe('Could');
  });

  it('returns Unassigned for null', () => {
    expect(commitmentLabel(null)).toBe('Unassigned');
  });

  it('returns Unassigned for undefined', () => {
    expect(commitmentLabel(undefined)).toBe('Unassigned');
  });
});
