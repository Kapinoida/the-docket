import { groupTasksByCommitment, sortTodayTasks, commitmentLabel } from '@/lib/todayPlanning';
import { Task } from '@/types';

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

describe('groupTasksByCommitment', () => {
  it('groups tasks by commitment level', () => {
    const tasks = [
      createTask({ id: 1, commitment_level: 'must' }),
      createTask({ id: 2, commitment_level: 'should' }),
      createTask({ id: 3, commitment_level: 'could' }),
      createTask({ id: 4, commitment_level: null }),
      createTask({ id: 5 }),
    ];

    const grouped = groupTasksByCommitment(tasks);

    expect(grouped.must).toHaveLength(1);
    expect(grouped.must[0].id).toBe(1);
    expect(grouped.should).toHaveLength(1);
    expect(grouped.should[0].id).toBe(2);
    expect(grouped.could).toHaveLength(1);
    expect(grouped.could[0].id).toBe(3);
    expect(grouped.unassigned).toHaveLength(2);
    expect(grouped.unassigned.map(t => t.id)).toEqual([4, 5]);
  });

  it('returns empty arrays for missing levels', () => {
    const tasks = [createTask({ commitment_level: 'must' })];
    const grouped = groupTasksByCommitment(tasks);

    expect(grouped.must).toHaveLength(1);
    expect(grouped.should).toHaveLength(0);
    expect(grouped.could).toHaveLength(0);
    expect(grouped.unassigned).toHaveLength(0);
  });

  it('handles empty task list', () => {
    const grouped = groupTasksByCommitment([]);

    expect(grouped.must).toHaveLength(0);
    expect(grouped.should).toHaveLength(0);
    expect(grouped.could).toHaveLength(0);
    expect(grouped.unassigned).toHaveLength(0);
  });
});

describe('sortTodayTasks', () => {
  it('sorts tasks by due_date ascending', () => {
    const tasks = [
      createTask({ id: 1, due_date: '2026-01-01T15:00:00.000Z' }),
      createTask({ id: 2, due_date: '2026-01-01T10:00:00.000Z' }),
      createTask({ id: 3, due_date: '2026-01-01T12:00:00.000Z' }),
    ];

    const sorted = sortTodayTasks(tasks);
    expect(sorted.map(t => t.id)).toEqual([2, 3, 1]);
  });

  it('sorts tasks with due_date before tasks without', () => {
    const tasks = [
      createTask({ id: 1, due_date: null }),
      createTask({ id: 2, due_date: '2026-01-01T10:00:00.000Z' }),
    ];

    const sorted = sortTodayTasks(tasks);
    expect(sorted.map(t => t.id)).toEqual([2, 1]);
  });

  it('sorts tasks without due_date by created_at', () => {
    const tasks = [
      createTask({ id: 1, due_date: null, created_at: '2026-01-01T12:00:00.000Z' }),
      createTask({ id: 2, due_date: null, created_at: '2026-01-01T10:00:00.000Z' }),
    ];

    const sorted = sortTodayTasks(tasks);
    expect(sorted.map(t => t.id)).toEqual([2, 1]);
  });

  it('does not mutate the original array', () => {
    const tasks = [
      createTask({ id: 1, due_date: '2026-01-01T15:00:00.000Z' }),
      createTask({ id: 2, due_date: '2026-01-01T10:00:00.000Z' }),
    ];

    sortTodayTasks(tasks);
    expect(tasks.map(t => t.id)).toEqual([1, 2]);
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
