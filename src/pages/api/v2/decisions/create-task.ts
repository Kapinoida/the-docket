import type { NextApiRequest, NextApiResponse } from 'next';
import pool from '@/lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    const { criterionId, criterionText, pageId } = req.body;

    if (!criterionId || !criterionText || !pageId) {
      return res.status(400).json({ error: 'Missing required fields: criterionId, criterionText, pageId' });
    }

    // Create the task
    const taskResult = await pool.query(
      `INSERT INTO tasks (content, status, created_at, updated_at)
       VALUES ($1, 'todo', NOW(), NOW())
       RETURNING *`,
      [criterionText]
    );

    const task = taskResult.rows[0];

    // Link the task to the page
    await pool.query(
      `INSERT INTO page_items (page_id, item_type, item_id, position, created_at)
       VALUES ($1, 'task', $2, 
         (SELECT COALESCE(MAX(position), 0) + 1 FROM page_items WHERE page_id = $1),
         NOW())`,
      [pageId, task.id]
    );

    return res.status(200).json({
      task_id: task.id,
      task,
    });
  } catch (error) {
    console.error('Failed to create task from criterion:', error);
    return res.status(500).json({ error: 'Failed to create task from criterion' });
  }
}
