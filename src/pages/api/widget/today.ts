import type { NextApiRequest, NextApiResponse } from 'next';
import pool from '../../../lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const result = await pool.query(
    `SELECT content, due_date
     FROM tasks
     WHERE status = 'todo'
       AND due_date::date <= CURRENT_DATE
     ORDER BY due_date ASC
     LIMIT 15`
  );

  const lines = result.rows.map((t: { content: string; due_date: string }) => {
    const due = new Date(t.due_date);
    const today = new Date();
    const isToday = due.toDateString() === today.toDateString();
    const label = isToday ? 'today' : due.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    return `☐ ${t.content} · ${label}`;
  });

  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache');
  res.status(200).send(lines.join('\n') || '✓ All caught up');
}