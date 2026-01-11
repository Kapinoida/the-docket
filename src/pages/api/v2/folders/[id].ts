import { NextApiRequest, NextApiResponse } from 'next';
import pool from '@/lib/db';

const mapFolder = (row: any) => ({
  id: String(row.id),
  name: row.name,
  parentId: row.parent_id ? String(row.parent_id) : undefined,
  createdAt: row.created_at
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;
  const folderId = Number(id);

  if (isNaN(folderId)) {
    return res.status(400).json({ error: 'Invalid folder ID' });
  }

  try {


    if (req.method === 'PUT') {
      const { name, parentId } = req.body;
      console.log(`[API] PUT folder ${folderId} Body:`, req.body);
      
      if (parentId === folderId) {
          return res.status(400).json({ error: 'Cannot move folder into itself' });
      }

      let query = 'UPDATE folders SET ';
      const values: any[] = [];
      let paramCount = 1;

      if (name !== undefined) {
        query += `name = $${paramCount}, `;
        values.push(name);
        paramCount++;
      }

      if (parentId !== undefined) {
        query += `parent_id = $${paramCount}, `;
        values.push(parentId); // parentId can be null
        paramCount++;
      }

      // Remove trailing comma
      query = query.slice(0, -2); 
      query += ` WHERE id = $${paramCount} RETURNING *`;
      values.push(folderId);

      if (values.length === 1) { // Only ID passed, no updates
         return res.status(400).json({ error: 'No fields to update' });
      }

      const result = await pool.query(query, values);
      
      if (result.rowCount === 0) {
        return res.status(404).json({ error: 'Folder not found' });
      }

      return res.status(200).json(mapFolder(result.rows[0]));
    }

    if (req.method === 'DELETE') {
      // Note: This might fail if there are subfolders or pages attached, 
      // depending on FK constraints. The UI checks simple cases.
      const result = await pool.query('DELETE FROM folders WHERE id = $1', [folderId]);
      
      if (result.rowCount === 0) {
        return res.status(404).json({ error: 'Folder not found' });
      }
      
      return res.status(200).json({ success: true });
    }

    res.setHeader('Allow', ['PUT', 'DELETE']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
