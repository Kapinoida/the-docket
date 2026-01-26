import type { NextApiRequest, NextApiResponse } from 'next';
import pool, { createTask, addItemToPage, createTombstone, deleteTaskReferences } from '../../../../lib/db'; // Ensure createTask is exported
import { calculateNextDueDate } from '../../../../lib/recurrence';

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
        
        // Handle Move/Add to Context
        if (addToPageId) {
             await addItemToPage(Number(addToPageId), taskId, 'task');
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
                // Fetch current task to check for recurrence
                const currentTaskRes = await pool.query('SELECT * FROM tasks WHERE id = $1', [taskId]);
                if (currentTaskRes.rows.length > 0) {
                    const currentTask = currentTaskRes.rows[0];
                    if (currentTask.recurrence_rule) {
                        const rule = currentTask.recurrence_rule;
                        let nextDate: Date | null = null;
                        const baseDate = currentTask.due_date ? new Date(currentTask.due_date) : new Date();

                        try {
                            nextDate = calculateNextDueDate(baseDate, rule);

                            if (nextDate) {
                                // Create the next task (Active, with same recurrence rule)
                                const newTask = await createTask(currentTask.content, nextDate, rule);
                                console.log(`[Recurrence] Created next instance for task ${taskId} due on ${nextDate}`);

                                // Context Inheritance: Link new task to same pages as old task
                                const contextRes = await pool.query('SELECT page_id FROM page_items WHERE child_task_id = $1', [taskId]);
                                for (const row of contextRes.rows) {
                                    await addItemToPage(row.page_id, newTask.id, 'task');
                                    console.log(`[Recurrence] Linked new task ${newTask.id} to page ${row.page_id}`);
                                }

                                // Strip the recurrence rule from the COMPLETED task
                                // so it doesn't try to regenerate again if toggled, and history is clear.
                                updates.push(`recurrence_rule = NULL`); 
                                // Note: We don't increment paramIndex here because NULL is literal
                            }
                        } catch (e) {
                            console.error('Error generating recurring task:', e);
                        }
                    }
                }
            }
        }
        if (due_date !== undefined) {
            updates.push(`due_date = $${paramIndex++}`);
            values.push(due_date);
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
        
        // 1. Remove references from Pages (TipTap Content)
        // Find pages that MIGHT contain this task ID (broad search to catch string/number/spacing variants)
        // We use a regex to match "taskId": 123, "taskId": "123", "taskId":123 etc.
        // 1. Remove references from Pages (TipTap Content)
        // Find pages that MIGHT contain this task ID
        // Note: content::text on JSONB often escapes quotes like "{\"taskId\": 244}" 
        // So we need to match both ` "taskId":` and ` \"taskId\":` or just match blindly on the key name.
        // We'll match `taskId` followed by the ID, ignoring punctuation.
        const pagesWithTask = await pool.query(
            `SELECT id, content FROM pages WHERE content::text ~ $1`, 
            [`taskId\\\\*":\\\\*\\s*\\\\*"?${taskId}\\\\*"?`] // Match "taskId": 123 with optional backslash escaping
        );
        
        console.log(`[Cleaner] Checking pages for task ${taskId}. Found candidates: ${pagesWithTask.rows.length}`);

        for (const page of pagesWithTask.rows) {
            const oldContent = page.content;
            let changed = false;

            // Recursive function to filter out the task node
            const removeTaskNode = (node: any): any => {
                if (!node) return node;
                
                // Check if it's the task we're looking for
                // Use loose equality (==) to handle string/number mismatch
                if (node.type === 'v2Task' && node.attrs && node.attrs.taskId == taskId) {
                    changed = true;
                    return null;
                }

                // If it has content, recurse
                if (node.content && Array.isArray(node.content)) {
                    node.content = node.content
                        .map((child: any) => removeTaskNode(child))
                        .filter((child: any) => child !== null);
                }
                
                return node;
            };

            const newContent = removeTaskNode(JSON.parse(JSON.stringify(oldContent))); // Deep copy

            if (changed) {
                await pool.query('UPDATE pages SET content = $1, updated_at = NOW() WHERE id = $2', [newContent, page.id]);
                console.log(`[Cleaner] Removed task ${taskId} from page ${page.id}`);
            } else {
                 console.log(`[Cleaner] Task ${taskId} not found in nodes of page ${page.id} despite text match.`);
            }
        }

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
