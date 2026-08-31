import { Task, CommitmentLevel } from '@/types';

export interface GroupedTodayTasks {
  must: Task[];
  should: Task[];
  could: Task[];
  unassigned: Task[];
}

export function groupTasksByCommitment(tasks: Task[]): GroupedTodayTasks {
  const grouped: GroupedTodayTasks = {
    must: [],
    should: [],
    could: [],
    unassigned: [],
  };

  for (const task of tasks) {
    if (task.commitment_level === 'must') {
      grouped.must.push(task);
    } else if (task.commitment_level === 'should') {
      grouped.should.push(task);
    } else if (task.commitment_level === 'could') {
      grouped.could.push(task);
    } else {
      grouped.unassigned.push(task);
    }
  }

  return grouped;
}

export function sortTodayTasks(tasks: Task[]): Task[] {
  return [...tasks].sort((a, b) => {
    if (a.due_date && b.due_date) {
      const dateA = new Date(a.due_date).getTime();
      const dateB = new Date(b.due_date).getTime();
      if (dateA !== dateB) {
        return dateA - dateB;
      }
    } else if (a.due_date && !b.due_date) {
      return -1;
    } else if (!a.due_date && b.due_date) {
      return 1;
    }
    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
  });
}

export function commitmentLabel(level: CommitmentLevel | null | undefined): string {
  if (level === 'must') return 'Must';
  if (level === 'should') return 'Should';
  if (level === 'could') return 'Could';
  return 'Unassigned';
}
