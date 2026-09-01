import { Task } from '@/types';
import { CalendarEvent, isTrulyAllDay } from '@/lib/calendar';
import { parseLocalDateNode } from '@/lib/dateUtils';

const STALE_THRESHOLD_DAYS = 14;
const LOOKAHEAD_DAYS = 14;

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

function getActiveTasks(tasks: Task[]): Task[] {
  return tasks.filter(t => t.status !== 'done' && t.status !== 'cancelled');
}

export interface LooseEnds {
  inbox: Task[];
  undated: Task[];
  withoutContext: Task[];
  withoutNextAction: Task[];
}

export function getLooseEnds(tasks: Task[]): LooseEnds {
  const active = getActiveTasks(tasks);
  return {
    inbox: tasks.filter(t => !t.page_name && t.status !== 'done' && t.content !== ''),
    undated: active.filter(t => !t.due_date),
    withoutContext: active.filter(t => !t.page_name),
    withoutNextAction: active.filter(t => !t.next_action),
  };
}

export function getStaleTasks(tasks: Task[]): Task[] {
  const now = new Date();
  const threshold = new Date(now.getTime() - STALE_THRESHOLD_DAYS * 24 * 60 * 60 * 1000);
  return getActiveTasks(tasks).filter(t => {
    const updated = new Date(t.updated_at);
    return updated < threshold;
  });
}

export function getOverdueTasks(tasks: Task[]): Task[] {
  const todayStr = getCalendarDateStr(new Date());
  return getActiveTasks(tasks).filter(t => {
    if (!t.due_date) return false;
    const dueStr = getCalendarDateStr(t.due_date);
    return dueStr < todayStr;
  });
}

export function getLookaheadEvents(events: CalendarEvent[]): CalendarEvent[] {
  const now = new Date();
  const end = new Date(now.getTime() + LOOKAHEAD_DAYS * 24 * 60 * 60 * 1000);
  return events.filter(event => {
    const eventDate = isTrulyAllDay(event)
      ? (parseLocalDateNode(event.start_time) as Date)
      : new Date(event.start_time);
    return eventDate >= now && eventDate <= end;
  });
}

export function getLookaheadTasks(tasks: Task[]): Task[] {
  const now = new Date();
  const end = new Date(now.getTime() + LOOKAHEAD_DAYS * 24 * 60 * 60 * 1000);
  return getActiveTasks(tasks).filter(t => {
    if (!t.due_date) return false;
    const dueDate = parseLocalDateNode(t.due_date);
    if (!dueDate) return false;
    return dueDate >= now && dueDate <= end;
  });
}

export interface ReviewSummary {
  looseEnds: LooseEnds;
  staleTasks: Task[];
  overdueTasks: Task[];
  lookaheadEvents: CalendarEvent[];
  lookaheadTasks: Task[];
}

export function getReviewSummary(tasks: Task[], events: CalendarEvent[]): ReviewSummary {
  return {
    looseEnds: getLooseEnds(tasks),
    staleTasks: getStaleTasks(tasks),
    overdueTasks: getOverdueTasks(tasks),
    lookaheadEvents: getLookaheadEvents(events),
    lookaheadTasks: getLookaheadTasks(tasks),
  };
}

export function getTaskAgeDays(task: Task): number {
  const now = new Date();
  const updated = new Date(task.updated_at);
  const diffMs = now.getTime() - updated.getTime();
  return Math.floor(diffMs / (24 * 60 * 60 * 1000));
}

export function getWeekRange(): { start: Date; end: Date; label: string } {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const start = new Date(now);
  start.setDate(now.getDate() - dayOfWeek);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  const startLabel = start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const endLabel = end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return { start, end, label: `${startLabel} – ${endLabel}` };
}
