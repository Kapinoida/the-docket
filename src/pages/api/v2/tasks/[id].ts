import type { NextApiRequest, NextApiResponse } from 'next';
import pool, { createTombstone, deleteTaskReferences } from '../../../../lib/db';
import { spawnNextRecurrence } from '../../../../lib/recurrence';
import { normalizeDateToNoon } from '../../../../lib/dateUtils';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { method } = req;
  const { id } = req.query; // This will be the ID
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
                let content = pageRes.rows[0].content;
                if (!content || typeof content !== "object" || content.type !== "doc") {
                    content = { type: "doc", content: [] };
                }
                content.content.push({
                    type: "v2Task",
                    attrs: { taskId, pageId: Number(addToPageId), status: "todo", autoFocus: false, due_date: null },
                    content: [{ type: "text", text: taskContent }]
                });
                await pool.query("UPDATE pages SET content = $1, updated_at = NOW() WHERE id = $2", [JSON.stringify(content), addToPageId]);
            }
            await addItemToPage(Number(addToPageId), taskId, "task");
        }

        // Build dynamic query
        const updates = [];
        const values = [];
        let paramIndex = 1;

        if (content !== undefined) {
             // Anti-Bloat logic REMOVED: User may clear text and re-type.
             // if (content.trim() === '') { ... }
             updates.push(`content = $${paramIndex++}`);
             values.push(content);
        }
        if (status !== undefined) {
            updates.push(`status = $${paramIndex++}`);
            values.push(status);

            // RECURRENCE LOGIC: If completing a recurring task, spawn the next one.
            if (status === 'done') {
                await spawnNextRecurrence(taskId);
            }
        }
        if (due_date !== undefined) {
            updates.push(`due_date = $${paramIndex++}`);
            values.push(normalizeDateToNoon(due_date));
        }
        
        // Fix: Allow updating the recurrence rule
        // checking for undefined because it might be null (to clear it)
        const { recurrenceRule, recurrence_rule } = req.body; 
        const ruleToUse = recurrenceRule !== undefined ? recurrenceRule : recurrence_rule;
        if (ruleToUse !== undefined) {
            updates.push(`recurrence_rule = $${paramIndex++}`);
            values.push(ruleToUse);
        }

        updates.push(`updated_at = NOW()`);

        if (updates.length === 1) return res.status(200).json({ message: 'No updates' }); // Only updated_at

        const query = `UPDATE tasks SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`;
        values.push(taskId);

        const result = await pool.query(query, values);
        
        if (result.rows.length === 0) return res.status(404).json({ error: 'Task not found' });
        
        // Map back to V2 Task interface
        const row = result.rows[0];
        return res.status(200).json({
            id: row.id,
            content: row.content,
            status: row.status,
            due_date: row.due_date,
            created_at: row.created_at,
            updated_at: row.updated_at
        });

      case 'DELETE':
        await createTombstone(taskId); // Log for Sync Deletion
        
        // 1. Remove references from Pages (TipTap Content) and page_items
        await deleteTaskReferences(taskId);

        // 2. Delete the task itself
        await pool.query('DELETE FROM tasks WHERE id = $1', [taskId]);
        
        // 3. Clean up context links
        // Use CASCADE in schema usually, but explicit:
        await pool.query('DELETE FROM page_items WHERE child_task_id = $1', [taskId]);
        
        return res.status(200).json({ success: true });

      default:
        res.setHeader('Allow', ['PUT', 'DELETE']);
        return res.status(405).end(`Method ${method} Not Allowed`);
    }
  } catch (error: any) {
    console.error('API Error:', error);
    return res.status(500).json({ error: error.message });
  }
}
