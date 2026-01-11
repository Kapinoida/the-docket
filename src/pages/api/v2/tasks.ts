
import type { NextApiRequest, NextApiResponse } from 'next';
import { createTask, getTask, addItemToPage } from '../../../lib/db';
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
          
          let query = 'SELECT * FROM tasks';
          let params: any[] = [];
          
          if (due === 'today') {
              // Tasks due on or before today that are not done
              query += ` WHERE due_date::date <= CURRENT_DATE AND (status IS NULL OR status != 'done') AND content != ''`;
              query += ` ORDER BY due_date ASC, created_at ASC`;
          } else if (context === 'none') {
              // Contextless Inbox: Not done, no page context
              query += ` 
                WHERE content != '' 
                AND (status IS NULL OR status != 'done')
                AND id NOT IN (SELECT child_task_id FROM page_items WHERE child_task_id IS NOT NULL)
                ORDER BY created_at DESC
              `;
          } else {
              // General Listing with Filters
              const { status, sort } = req.query;

              query += " WHERE content != ''";
              
              // Status Filter
              if (status === 'todo') {
                  query += " AND (status IS NULL OR status != 'done')";
              } else if (status === 'done') {
                  query += " AND status = 'done'";
              }
              // 'all' includes both, so no extra clause needed
              
              // Sorting
              if (sort === 'dueDate') {
                  // Sort by due date (nulls last), then created
                  query += " ORDER BY due_date ASC NULLS LAST, created_at ASC";
              } else if (sort === 'oldest') {
                  query += " ORDER BY created_at ASC";
              } else {
                  // Default: Newest created first
                  query += " ORDER BY created_at DESC";
              }
          }
          
          const result = await pool.query(query, params);
          return res.status(200).json(result.rows);
        }

      case 'POST':
        const { content, dueDate, pageId, recurrenceRule } = req.body;
        // Allow empty string for content (new task from editor widget)
        if (content === undefined || content === null) return res.status(400).json({ error: 'Content is required' });
        
        const newTask = await createTask(content, dueDate ? new Date(dueDate) : null, recurrenceRule || null);
        
        // If created in context of a page, link it
        if (pageId) {
            await addItemToPage(Number(pageId), newTask.id, 'task');
        }

        return res.status(201).json(newTask);

      default:
        res.setHeader('Allow', ['GET', 'POST']);
        return res.status(405).end(`Method ${method} Not Allowed`);
    }
  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
