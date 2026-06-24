import { NextApiRequest, NextApiResponse } from 'next';
import { updateFolder, deleteFolder } from '@/lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;
  const folderId = Number(id);

  if (isNaN(folderId)) {
    return res.status(400).json({ error: 'Invalid folder ID' });
  }

  try {
    if (req.method === 'PUT') {
      const { name, parentId } = req.body;
      
      if (parentId === folderId) {
          return res.status(400).json({ error: 'Cannot move folder into itself' });
      }

      const fields: { name?: string; parent_id?: number | null } = {};
      if (name !== undefined) fields.name = name;
      if (parentId !== undefined) fields.parent_id = parentId || null;

      if (Object.keys(fields).length === 0) {
          return res.status(400).json({ error: 'No fields to update' });
      }

      const updated = await updateFolder(folderId, fields);
      if (!updated) return res.status(404).json({ error: 'Folder not found' });
      return res.status(200).json(updated);
    }

    if (req.method === 'DELETE') {
      await deleteFolder(folderId);
      return res.status(200).json({ success: true });
    }

    res.setHeader('Allow', ['PUT', 'DELETE']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}