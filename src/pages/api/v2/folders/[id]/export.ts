import type { NextApiRequest, NextApiResponse } from 'next';
import pool from '../../../../../lib/db';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { method } = req;
  const { id } = req.query;

  if (method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end(`Method ${method} Not Allowed`);
  }

  if (!id) {
    return res.status(400).json({ error: 'Folder ID is required' });
  }

  try {
    // 1. Get folder info
    const folderRes = await pool.query('SELECT name FROM folders WHERE id = $1', [Number(id)]);
    if (folderRes.rowCount === 0) {
      return res.status(404).json({ error: 'Folder not found' });
    }
    const folderName = folderRes.rows[0].name;

    // 2. Get all pages in this folder
    const pagesRes = await pool.query('SELECT id, title, content FROM pages WHERE folder_id = $1 ORDER BY title ASC', [Number(id)]);
    const pages = pagesRes.rows;

    return res.status(200).json({ folderName, pages });
  } catch (error: any) {
    console.error('Export Folder API Error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
