import { apiFetch } from './api';
import { parseCaptureText } from './captureParser';
import { Task } from '@/types';

export interface TaskCaptureInput {
  content: string;
  dueDate?: Date | string | null;
  endTime?: Date | string | null;
  pageId?: number | null;
  source: 'sidebar' | 'capture' | 'calendar' | 'inbox' | 'today' | 'other';
}

export interface TaskCaptureResult {
  task: Task;
  source: string;
}

/**
 * Unified task creation service.
 *
 * Handles:
 * - Natural-language date parsing (if dueDate not provided)
 * - API submission via apiFetch
 * - Consistent error handling (AuthError propagation)
 * - taskCreated event dispatch for view synchronization
 */
export async function createTaskFromCapture(input: TaskCaptureInput): Promise<TaskCaptureResult> {
  const { content, source } = input;

  // Parse natural-language dates only if dueDate was not provided (undefined)
  // If dueDate is null, the user explicitly removed it, so respect that
  let dueDate = input.dueDate;
  if (dueDate === undefined && content) {
    const parsed = parseCaptureText(content);
    if (parsed.dueDate) {
      dueDate = parsed.dueDate;
    }
  }

  const payload: Record<string, unknown> = { content };

  if (dueDate) {
    payload.dueDate = dueDate instanceof Date ? dueDate.toISOString() : dueDate;
  }

  if (input.endTime) {
    payload.endTime = input.endTime instanceof Date ? input.endTime.toISOString() : input.endTime;
  }

  if (input.pageId) {
    payload.pageId = input.pageId;
  }

  const task = await apiFetch<Task>('/api/v2/tasks', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  // Dispatch taskCreated event for cross-view synchronization
  window.dispatchEvent(
    new CustomEvent('taskCreated', { detail: { task, source } })
  );

  return { task, source };
}
