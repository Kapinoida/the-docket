import { 
  addDays, 
  addWeeks, 
  addMonths, 
  addYears, 
  startOfMonth, 
  endOfMonth, 
  getDate, 
  getDay, 
  setDate,
  isSameMonth
} from 'date-fns';
import { RecurrenceRule } from '@/types/v2';
import pool, { createTask, addItemToPage } from './db';
import { v4 as uuidv4 } from 'uuid';

export function calculateNextDueDate(baseDate: Date, rule: RecurrenceRule): Date {
  const interval = rule.interval || 1;
  let nextDate = new Date(baseDate);

  switch (rule.type) {
    case 'daily':
      return addDays(baseDate, interval);
    
    case 'weekly':
      // Simple interval
      if (!rule.daysOfWeek || rule.daysOfWeek.length === 0) {
        return addWeeks(baseDate, interval);
      }
      // If daysOfWeek is specified (e.g., Mon, Wed), find the next occurrence
      // This is complex for "Every 2 weeks on Mon, Wed".
      // Simplified approach: If simple interval, just add weeks.
      // If specifying days, we usually mean "Next valid day".
      // Let's stick to simple "Every X weeks" for now unless user asks for multiple days/week.
      // User asked for "Every 2 weeks", that's covered by interval.
      return addWeeks(baseDate, interval);

    case 'monthly':
      // Base monthly add
      let tentativeDate = addMonths(baseDate, interval);
      
      // Handle "Nth [Day] of Month"
      if (rule.weekOfMonth && rule.daysOfWeek && rule.daysOfWeek.length > 0) {
         return getNthDayOfMonth(tentativeDate, rule.weekOfMonth, rule.daysOfWeek);
      }
      
      // Handle "Same day of month" (e.g. 25th)
      // addMonths automatically handles 31st -> 30th/28th clamping.
      return tentativeDate;

    case 'yearly':
      return addYears(baseDate, interval);
      
    default:
      return addDays(baseDate, interval);
  }
}

function getNthDayOfMonth(date: Date, n: number, validDays: number[]): Date {
  // n: 1 = 1st, 2 = 2nd, -1 = Last
  // validDays: 0-6 (Sun-Sat)
  
  const monthStart = startOfMonth(date);
  const monthEnd = endOfMonth(date);
  
  const candidates: Date[] = [];
  
  // Collect all matching days in the month
  let current = monthStart;
  while (current <= monthEnd) {
     if (validDays.includes(getDay(current))) {
         candidates.push(new Date(current));
     }
     current = addDays(current, 1);
  }
  
  if (candidates.length === 0) return date; // Fallback
  
  if (n > 0) {
      // 1-based index
      const index = n - 1;
      return candidates[index] || candidates[candidates.length - 1]; // Fallback to last if overflow
  } else {
      // Negative index (from end)
      // -1 = last, -2 = second to last
      const index = candidates.length + n;
      return candidates[index] || candidates[0]; // Fallback to first if underflow
  }
}

/**
 * Spawn the next instance of a recurring task, copying page context.
 * Called when a recurring task is marked 'done' — from both the API handler
 * and the CalDAV sync path.
 *
 * Returns the new task ID, or null if the task has no recurrence rule
 * or if next date calculation fails.
 */
export async function spawnNextRecurrence(completedTaskId: number): Promise<number | null> {
  // Fetch the completed task
  const currentTaskRes = await pool.query('SELECT * FROM tasks WHERE id = $1', [completedTaskId]);
  if (currentTaskRes.rows.length === 0) return null;
  
  const currentTask = currentTaskRes.rows[0];
  if (!currentTask.recurrence_rule) return null;

  const rule = currentTask.recurrence_rule;
  const baseDate = currentTask.due_date ? new Date(currentTask.due_date) : new Date();
  
  let nextDate: Date | null = null;
  try {
    nextDate = calculateNextDueDate(baseDate, rule);
  } catch (e) {
    console.error(`[Recurrence] Failed to calculate next date for task ${completedTaskId}:`, e);
    return null;
  }
  
  if (!nextDate) return null;

  // Create the next instance
  const newTask = await createTask(currentTask.content, nextDate, rule);
  console.log(`[Recurrence] Created next instance for task ${completedTaskId} → ${newTask.id} due ${nextDate}`);

  // Register for CalDAV sync
  const newUid = uuidv4();
  await pool.query(
    'INSERT INTO task_sync_meta (task_id, caldav_uid, last_synced_at) VALUES ($1, $2, NOW())',
    [newTask.id, newUid]
  );
  console.log(`[Recurrence] Registered new instance ${newTask.id} for sync (uid: ${newUid})`);

  // Copy page context from the completed task
  const pageItemsRes = await pool.query(
    'SELECT page_id FROM page_items WHERE child_task_id = $1',
    [completedTaskId]
  );
  
  for (const pi of pageItemsRes.rows) {
    try {
      await addItemToPage(pi.page_id, newTask.id, "task");
      
      // Append a v2Task node to the page content
      const pageRes = await pool.query('SELECT content FROM pages WHERE id = $1', [pi.page_id]);
      if (pageRes.rows.length > 0) {
        let pageContent = pageRes.rows[0].content;
        if (!pageContent || typeof pageContent !== 'object' || pageContent.type !== 'doc') {
          pageContent = { type: 'doc', content: [] };
        }
        pageContent.content.push({
          type: 'v2Task',
          attrs: {
            taskId: newTask.id,
            pageId: pi.page_id,
            status: 'todo',
            autoFocus: false,
            due_date: nextDate.toISOString(),
          },
          content: [{ type: 'text', text: currentTask.content }],
        });
        await pool.query(
          'UPDATE pages SET content = $1, updated_at = NOW() WHERE id = $2',
          [JSON.stringify(pageContent), pi.page_id]
        );
      }
    } catch (e) {
      console.error(
        `[Recurrence] Failed to copy page ${pi.page_id} context for new task ${newTask.id}:`,
        e
      );
    }
  }

  // Strip recurrence rule from the completed task so it doesn't re-fire
  await pool.query('UPDATE tasks SET recurrence_rule = NULL WHERE id = $1', [completedTaskId]);

  return newTask.id;
}
