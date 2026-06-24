import type { NextApiRequest, NextApiResponse } from 'next';
import { getFolderName, getFolderPages } from '../../../../../lib/db';

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
    const folderName = await getFolderName(Number(id));
    if (!folderName) {
      return res.status(404).json({ error: 'Folder not found' });
    }

    const pages = await getFolderPages(Number(id));
    return res.status(200).json({ folderName, pages });
  } catch (error: any) {
    console.error('Export Folder API Error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}