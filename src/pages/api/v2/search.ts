import { NextApiRequest, NextApiResponse } from 'next';
import pool from '@/lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { q } = req.query;

  if (!q || typeof q !== 'string' || q.trim().length === 0) {
    return res.status(200).json([]);
  }

  const query = `%${q.trim()}%`;

  try {
    // Parallel queries for responsiveness
    // Limit to top 5 of each for now to keep UI clean
    const pagesPromise = pool.query(
      `SELECT id, title, 'page' as type 
       FROM pages 
       WHERE title ILIKE $1 
       LIMIT 5`,
      [query]
    );

    const tasksPromise = pool.query(
      `SELECT id, content, 'task' as type 
       FROM tasks 
       WHERE content ILIKE $1 
       LIMIT 5`,
      [query]
    );

    const tagsPromise = pool.query(
      `SELECT id, name, 'tag' as type
       FROM tags
       WHERE name ILIKE $1
       LIMIT 5`,
      [query]
    );

    const [pagesResult, tasksResult, tagsResult] = await Promise.all([pagesPromise, tasksPromise, tagsPromise]);

    const results = [
      ...tagsResult.rows.map(r => ({ ...r, title: r.name })), // Tags first
      ...pagesResult.rows.map(r => ({ ...r, title: r.title || 'Untitled Page' })),
      ...tasksResult.rows.map(r => ({ ...r, title: r.content }))
    ];

    return res.status(200).json(results);
  } catch (error) {
    console.error('Search error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
