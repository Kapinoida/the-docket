import type { NextApiRequest, NextApiResponse } from 'next';
import { createTask, getTask, addItemToPage, createTombstone, deleteTaskReferences, updateTask, deleteTask, deleteCompletedTasks, getTasks } from '../../../lib/db';
import { normalizeDateToNoon } from '../../../lib/dateUtils';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { method } = req;
  const { id } = req.query;

  try {
    switch (method) {
      case 'GET':
        if (id) {
          const task = await getTask(Number(id));
          if (!task) return res.status(404).json({ error: 'Task not found' });
          return res.status(200).json(task);
        } else {
          const { due, context, status, sort } = req.query;
          const tasks = await getTasks({
            due: due as 'today' | undefined,
            context: context as 'none' | undefined,
            status: status as 'todo' | 'done' | 'all' | undefined,
            sort: sort as 'dueDate' | 'oldest' | 'newest' | undefined,
          });
          return res.status(200).json(tasks);
        }

      case 'POST':
        const { content, dueDate, due_date, pageId, recurrenceRule, recurrence_rule } = req.body;
        if (content === undefined || content === null) return res.status(400).json({ error: 'Content is required' });
        
        const finalDueDate = due_date !== undefined ? due_date : dueDate;
        const finalRecurrenceRule = recurrence_rule !== undefined ? recurrence_rule : recurrenceRule;
        
        const newTask = await createTask(content, normalizeDateToNoon(finalDueDate), finalRecurrenceRule || null);
        
        if (pageId) {
            await addItemToPage(Number(pageId), newTask.id, 'task');
        }

        return res.status(201).json(newTask);

      case 'PUT':
        if (!id) return res.status(400).json({ error: 'Task ID is required for update' });
        const { content: newContent, status, dueDate: newDueDate, due_date: newDueDateSnake, recurrenceRule: newRecurrenceRule, recurrence_rule: newRecurrenceRuleSnake } = req.body;
        
        const resolvedDueDate = newDueDateSnake !== undefined ? newDueDateSnake : newDueDate;
        const resolvedRecurrenceRule = newRecurrenceRuleSnake !== undefined ? newRecurrenceRuleSnake : newRecurrenceRule;
        
        const fields: Record<string, any> = {};
        if (newContent !== undefined) fields.content = newContent;
        if (status !== undefined) fields.status = status;
        if (resolvedDueDate !== undefined) fields.due_date = normalizeDateToNoon(resolvedDueDate);
        if (resolvedRecurrenceRule !== undefined) fields.recurrence_rule = resolvedRecurrenceRule;
        
        if (Object.keys(fields).length === 0) return res.status(400).json({ error: 'No fields to update' });

        const updatedTask = await updateTask(Number(id), fields);
        
        if (!updatedTask) return res.status(404).json({ error: 'Task not found' });
        return res.status(200).json(updatedTask);

      case 'DELETE':
        const { bulk_action } = req.query;

        if (bulk_action === 'delete_completed') {
            const count = await deleteCompletedTasks();
            return res.status(200).json({ success: true, count });
        } else {
            if (!id) return res.status(400).json({ error: 'Task ID is required for deletion' });
            await deleteTask(Number(id));
            return res.status(200).json({ success: true });
        }

      default:
        res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
        return res.status(405).end(`Method ${method} Not Allowed`);
    }
  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}