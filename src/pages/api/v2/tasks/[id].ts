import type { NextApiRequest, NextApiResponse } from 'next';
import pool, { addItemToPage, createTombstone, deleteTaskReferences, updateTask, deleteTask } from '../../../../lib/db';
import { spawnNextRecurrence } from '../../../../lib/recurrence';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { method } = req;
  const { id } = req.query;
  const taskId = Number(id);

  if (isNaN(taskId)) return res.status(400).json({ error: 'Invalid Task ID' });

  try {
    switch (method) {
      case 'PUT':
        const { content, status, due_date, addToPageId } = req.body;
        
        if (addToPageId) {
            const taskRes = await pool.query("SELECT content FROM tasks WHERE id = $1", [taskId]);
            const taskContent = taskRes.rows[0]?.content || "";
            const pageRes = await pool.query("SELECT content FROM pages WHERE id = $1", [addToPageId]);
            if (pageRes.rows.length > 0) {
                let pageContent = pageRes.rows[0].content;
                if (!pageContent || typeof pageContent !== "object" || pageContent.type !== "doc") {
                    pageContent = { type: "doc", content: [] };
                }
                pageContent.content.push({
                    type: "v2Task",
                    attrs: { taskId, pageId: Number(addToPageId), status: "todo", autoFocus: false, due_date: null },
                    content: [{ type: "text", text: taskContent }]
                });
                await pool.query("UPDATE pages SET content = $1, updated_at = NOW() WHERE id = $2", [JSON.stringify(pageContent), addToPageId]);
            }
            await addItemToPage(Number(addToPageId), taskId, "task");
        }

        const fields: Record<string, any> = {};
        if (content !== undefined) fields.content = content;
        if (status !== undefined) {
            fields.status = status;
            if (status === 'done') {
                await spawnNextRecurrence(taskId);
            }
        }
        if (due_date !== undefined) fields.due_date = due_date;

        const { recurrenceRule, recurrence_rule } = req.body;
        const ruleToUse = recurrenceRule !== undefined ? recurrenceRule : recurrence_rule;
        if (ruleToUse !== undefined) fields.recurrence_rule = ruleToUse;

        if (Object.keys(fields).length === 0) return res.status(200).json({ message: 'No updates' });

        const updatedTask = await updateTask(taskId, fields);
        if (!updatedTask) return res.status(404).json({ error: 'Task not found' });
        
        return res.status(200).json(updatedTask);

      case 'DELETE':
        await deleteTask(taskId);
        return res.status(200).json({ success: true });

      default:
        res.setHeader('Allow', ['PUT', 'DELETE']);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }
  } catch (error: any) {
    console.error('API Error:', error);
    return res.status(500).json({ error: error.message });
  }
}