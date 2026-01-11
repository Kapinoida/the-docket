import { NextApiRequest, NextApiResponse } from 'next';
import pool from '@/lib/db';

const mapFolder = (row: any) => ({
  id: String(row.id),
  name: row.name,
  parentId: row.parent_id ? String(row.parent_id) : undefined,
  createdAt: row.created_at
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method === 'GET') {
      const result = await pool.query('SELECT * FROM folders ORDER BY name ASC');
      return res.status(200).json(result.rows.map(mapFolder));
    } 
    
    if (req.method === 'POST') {
      const { name, parentId } = req.body;
      console.log('[API] POST folder Body:', req.body);
      
      if (!name) {
        return res.status(400).json({ error: 'Name is required' });
      }

      const result = await pool.query(
        'INSERT INTO folders (name, parent_id) VALUES ($1, $2) RETURNING *',
        [name, parentId || null]
      );
      
      return res.status(201).json(mapFolder(result.rows[0]));
    }

    res.setHeader('Allow', ['GET', 'POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
