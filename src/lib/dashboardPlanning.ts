import { Task, CommitmentLevel } from '@/types';
import { CalendarEvent, isTrulyAllDay } from '@/lib/calendar';
import { parseLocalDateNode } from '@/lib/dateUtils';

export interface DashboardCounts {
  overdue: number;
  inbox: number;
  undated: number;
  todayTasks: number;
  todayEvents: number;
}

export interface DashboardCommitments {
  must: Task[];
  should: Task[];
  could: Task[];
  unassigned: Task[];
}

function getCalendarDateStr(dateVal: Date | string): string {
  if (typeof dateVal === 'string') {
    return dateVal.split('T')[0];
  }
  const d = new Date(dateVal);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getActiveTasks(tasks: Task[]): Task[] {
  return tasks.filter(t => t.status !== 'done' && t.status !== 'cancelled' && t.status !== 'someday');
}

export function getOverdueTasks(tasks: Task[]): Task[] {
  const todayStr = getCalendarDateStr(new Date());
  return getActiveTasks(tasks).filter(t => {
    if (!t.due_date) return false;
    const dueStr = getCalendarDateStr(t.due_date);
    return dueStr < todayStr;
  });
}

export function getInboxTasks(tasks: Task[]): Task[] {
  return tasks.filter(t => !t.page_name && t.status !== 'done' && t.status !== 'someday' && t.content !== '');
}

export function getUndatedTasks(tasks: Task[]): Task[] {
  return getActiveTasks(tasks).filter(t => !t.due_date);
}

export function getTodayTasks(tasks: Task[]): Task[] {
  const todayStr = getCalendarDateStr(new Date());
  return getActiveTasks(tasks).filter(t => {
    if (!t.due_date) return false;
    const dueStr = getCalendarDateStr(t.due_date);
    return dueStr === todayStr;
  });
}

export function getTodayEvents(events: CalendarEvent[]): CalendarEvent[] {
  const todayDate = new Date();
  todayDate.setHours(0, 0, 0, 0);
  return events.filter(event => {
    const eventDate = isTrulyAllDay(event) ? (parseLocalDateNode(event.start_time) as Date) : new Date(event.start_time);
    const eventDay = new Date(eventDate);
    eventDay.setHours(0, 0, 0, 0);
    return eventDay.getTime() === todayDate.getTime();
  });
}

export function getTodayCommitments(tasks: Task[]): DashboardCommitments {
  const todayTasks = getTodayTasks(tasks);
  const commitments: DashboardCommitments = { must: [], should: [], could: [], unassigned: [] };
  for (const task of todayTasks) {
    if (task.commitment_level === 'must') commitments.must.push(task);
    else if (task.commitment_level === 'should') commitments.should.push(task);
    else if (task.commitment_level === 'could') commitments.could.push(task);
    else commitments.unassigned.push(task);
  }
  return commitments;
}

export function getDashboardCounts(
  tasks: Task[],
  events: CalendarEvent[]
): DashboardCounts {
  return {
    overdue: getOverdueTasks(tasks).length,
    inbox: getInboxTasks(tasks).length,
    undated: getUndatedTasks(tasks).length,
    todayTasks: getTodayTasks(tasks).length,
    todayEvents: getTodayEvents(events).length,
  };
}

export function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export function getTopOverdue(tasks: Task[], limit: number = 3): Task[] {
  return getOverdueTasks(tasks).slice(0, limit);
}

export function commitmentLabel(level: CommitmentLevel | null | undefined): string {
  if (level === 'must') return 'Must';
  if (level === 'should') return 'Should';
  if (level === 'could') return 'Could';
  return 'Unassigned';
}
