import pool, { createTask, addItemToPage } from './db';
import { calculateNextDueDate, shouldRecur } from './recurrenceCalc';
import { RecurrenceRule } from '@/types';

export { calculateNextDueDate, getNthDayOfMonth, shouldRecur } from './recurrenceCalc';

export async function spawnNextRecurrence(completedTaskId: number): Promise<number | null> {
  const currentTaskRes = await pool.query('SELECT * FROM tasks WHERE id = $1', [completedTaskId]);
  if (currentTaskRes.rows.length === 0) return null;
  
  const currentTask = currentTaskRes.rows[0];
  if (!currentTask.recurrence_rule) return null;

  const rule: RecurrenceRule = currentTask.recurrence_rule;
  const baseDate = currentTask.due_date ? new Date(currentTask.due_date) : new Date();

  let nextDate: Date | null = null;
  try {
    nextDate = calculateNextDueDate(baseDate, rule);
  } catch (e) {
    console.error(`[Recurrence] Failed to calculate next date for task ${completedTaskId}:`, e);
    return null;
  }
  
  if (!nextDate) return null;

  if (!shouldRecur(rule, nextDate)) {
    await pool.query('UPDATE tasks SET recurrence_rule = NULL WHERE id = $1', [completedTaskId]);
    return null;
  }

  let nextRule: RecurrenceRule | null = null;
  if (rule.count && rule.count > 1) {
    nextRule = { ...rule, count: rule.count - 1 };
  } else if (!rule.count) {
    nextRule = { ...rule };
  } else {
    nextRule = null;
  }

  await pool.query('UPDATE tasks SET recurrence_rule = NULL WHERE id = $1', [completedTaskId]);

  // Preserve duration: shift end_time by the same offset as the due date.
  let nextEndTime: Date | null = null;
  if (currentTask.end_time && currentTask.due_date && nextDate) {
    const durationMs = new Date(currentTask.end_time).getTime() - new Date(currentTask.due_date).getTime();
    if (!isNaN(durationMs) && durationMs > 0) {
      nextEndTime = new Date(nextDate.getTime() + durationMs);
    }
  }

  const newTask = await createTask(currentTask.content, nextDate, nextRule, nextEndTime);

  const pageItemsRes = await pool.query(
    'SELECT page_id FROM page_items WHERE child_task_id = $1',
    [completedTaskId]
  );
  
  for (const pi of pageItemsRes.rows) {
    try {
      await addItemToPage(pi.page_id, newTask.id, "task");
      
      const pageRes = await pool.query('SELECT content FROM pages WHERE id = $1', [pi.page_id]);
      if (pageRes.rows.length > 0) {
        let pageContent = pageRes.rows[0].content;
        if (!pageContent || typeof pageContent !== 'object' || pageContent.type !== 'doc') {
          pageContent = { type: 'doc', content: [] };
        }
pageContent.content.push({
          type: "v2Task",
          attrs: {
            taskId: newTask.id,
            pageId: pi.page_id,
            status: 'todo',
            autoFocus: false,
            due_date: nextDate.toISOString(),
            ...(nextEndTime ? { end_time: nextEndTime.toISOString() } : {}),
          },
          content: [{ type: "text", text: currentTask.content }],
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

  return newTask.id;
}