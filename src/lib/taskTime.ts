import { Task } from '@/types';

export const DEFAULT_TASK_DURATION_MINUTES = 30;

export function getTaskDurationMinutes(task: Task): number {
  if (!task.due_date || !task.end_time) return DEFAULT_TASK_DURATION_MINUTES;
  const start = new Date(task.due_date).getTime();
  const end = new Date(task.end_time).getTime();
  const dur = (end - start) / 60000;
  return isNaN(dur) || dur <= 0 ? DEFAULT_TASK_DURATION_MINUTES : dur;
}

export function isTaskAllDay(task: Task): boolean {
  if (!task.due_date) return true;
  const d = new Date(task.due_date);
  return d.getUTCHours() === 0 && d.getUTCMinutes() === 0 && d.getUTCSeconds() === 0 && !task.end_time;
}

export function isTaskTimed(task: Task): boolean {
  return !!task.due_date && !isTaskAllDay(task);
}

export function isSameCalendarDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function isValidEndTime(dueDate: string | Date | null, endTime: string | Date | null): boolean {
  if (!endTime) return true;
  if (!dueDate) return false;
  const start = new Date(dueDate);
  const end = new Date(endTime);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return false;
  if (end <= start) return false;
  return isSameCalendarDay(start, end);
}

export function sameDayClampDragStart(
  startMinutes: number,
  durationMinutes: number,
  hourStart: number,
  hourEnd: number,
  snapMinutes = 15
): number {
  const minStart = hourStart * 60;
  const maxStart = hourEnd * 60 - durationMinutes;
  const clamped = Math.max(minStart, Math.min(startMinutes, maxStart));
  return Math.round(clamped / snapMinutes) * snapMinutes;
}