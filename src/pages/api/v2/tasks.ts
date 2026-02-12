
import type { NextApiRequest, NextApiResponse } from 'next';
import { createTask, getTask, addItemToPage, createTombstone, deleteTaskReferences } from '../../../lib/db';
import pool from '../../../lib/db';

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
          const { due, context } = req.query;
          
          let query = `
            SELECT t.*, p.id as context_page_id, p.title as context_page_title 
            FROM tasks t
            LEFT JOIN page_items pi ON t.id = pi.child_task_id
            LEFT JOIN pages p ON pi.page_id = p.id
          `;
          let params: any[] = [];
          
          if (due === 'today') {
              // Tasks due on or before today that are not done
              query += ` WHERE t.due_date::date <= CURRENT_DATE AND (t.status IS NULL OR t.status != 'done') AND t.content != ''`;
              query += ` ORDER BY t.due_date ASC, t.created_at ASC`;
          } else if (context === 'none') {
              // Contextless Inbox: Not done, no page context
              query += ` 
                WHERE t.content != '' 
                AND (t.status IS NULL OR t.status != 'done')
                AND pi.child_task_id IS NULL
                ORDER BY t.created_at DESC
              `;
          } else {
              // General Listing with Filters
              const { status, sort } = req.query;

              query += " WHERE t.content != ''";
              
              // Status Filter
              if (status === 'todo') {
                  query += " AND (t.status IS NULL OR t.status != 'done')";
              } else if (status === 'done') {
                  query += " AND t.status = 'done'";
              }
              // 'all' includes both, so no extra clause needed
              
              // Sorting
              if (sort === 'dueDate') {
                  // Sort by due date (nulls last), then created
                  query += " ORDER BY t.due_date ASC NULLS LAST, t.created_at ASC";
              } else if (sort === 'oldest') {
                  query += " ORDER BY t.created_at ASC";
              } else {
                  // Default: Newest created first
                  query += " ORDER BY t.created_at DESC";
              }
          }
          
          const result = await pool.query(query, params);
          
          const tasks = result.rows.map((row: any) => {
            const task = {
                ...row,
                context: row.context_page_id ? { page_id: row.context_page_id, title: row.context_page_title } : null,
            };
            delete task.context_page_id;
            delete task.context_page_title;
            return task;
          });
          
          return res.status(200).json(tasks);
        }

      case 'POST':
        // ... (existing POST logic) ...
        const { content, dueDate, pageId, recurrenceRule } = req.body;
        // Allow empty string for content (new task from editor widget)
        if (content === undefined || content === null) return res.status(400).json({ error: 'Content is required' });
        
        const newTask = await createTask(content, dueDate ? new Date(dueDate) : null, recurrenceRule || null);
        
        // If created in context of a page, link it
        if (pageId) {
            await addItemToPage(Number(pageId), newTask.id, 'task');
        }

        return res.status(201).json(newTask);

      case 'PUT':
        if (!id) return res.status(400).json({ error: 'Task ID is required for update' });
        const { content: newContent, status, dueDate: newDueDate, recurrenceRule: newRecurrenceRule } = req.body;
        
        // Build dynamic update query
        let updateFields = [];
        let updateParams = [];
        let pIdx = 1;

        if (newContent !== undefined) {
            updateFields.push(`content = $${pIdx++}`);
            updateParams.push(newContent);
        }
        if (status !== undefined) {
            updateFields.push(`status = $${pIdx++}`);
            updateParams.push(status);
        }
        if (newDueDate !== undefined) {
            updateFields.push(`due_date = $${pIdx++}`);
            updateParams.push(newDueDate ? new Date(newDueDate) : null);
        }
        if (newRecurrenceRule !== undefined) {
            updateFields.push(`recurrence_rule = $${pIdx++}`);
            updateParams.push(newRecurrenceRule);
        }
        
        if (updateFields.length === 0) return res.status(400).json({ error: 'No fields to update' });

        // Always update updated_at
        updateFields.push(`updated_at = NOW()`);

        updateParams.push(Number(id));
        const updateQuery = `UPDATE tasks SET ${updateFields.join(', ')} WHERE id = $${pIdx} RETURNING *`;
        
        console.log('[API] PUT Request:', { id, body: req.body, query: updateQuery, params: updateParams });

        const updateRes = await pool.query(updateQuery, updateParams);
        console.log('[API] PUT Result:', { rowCount: updateRes.rowCount, found: (updateRes.rowCount || 0) > 0 });

        if ((updateRes.rowCount || 0) === 0) return res.status(404).json({ error: 'Task not found' });
        
        return res.status(200).json(updateRes.rows[0]);

      case 'DELETE':
        const { bulk_action } = req.query;

        if (bulk_action === 'delete_completed') {
            // Bulk delete completed tasks
            const completedTasksRes = await pool.query("SELECT id FROM tasks WHERE status = 'done'");
            const completedIds = completedTasksRes.rows.map(r => r.id);

            if (completedIds.length === 0) {
                return res.status(200).json({ count: 0 });
            }

            // Create tombstones for sync
            for (const taskId of completedIds) {
                await createTombstone(taskId);
            }

            // Delete tasks
            const deleteRes = await pool.query("DELETE FROM tasks WHERE status = 'done'");
            return res.status(200).json({ success: true, count: deleteRes.rowCount });

        } else {
            // Single task delete
            if (!id) return res.status(400).json({ error: 'Task ID is required for deletion' });
            
            const taskId = Number(id);
            await createTombstone(taskId);

            // 1. Remove references from Pages (TipTap Content)
            await deleteTaskReferences(taskId);

            // 2. Delete the task itself
            await pool.query('DELETE FROM tasks WHERE id = $1', [id]);
            
            // 3. Clean up context links
            // Use CASCADE in schema usually, but explicit:
            await pool.query('DELETE FROM page_items WHERE child_task_id = $1', [id]);
            
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
