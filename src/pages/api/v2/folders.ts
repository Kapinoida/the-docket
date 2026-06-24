import { NextApiRequest, NextApiResponse } from 'next';
import { getFolders, createFolder } from '@/lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method === 'GET') {
      const folders = await getFolders();
      return res.status(200).json(folders);
    } 
    
    if (req.method === 'POST') {
      const { name, parentId } = req.body;
      
      if (!name) {
        return res.status(400).json({ error: 'Name is required' });
      }

      const folder = await createFolder(name, parentId || null);
      return res.status(201).json(folder);
    }

    res.setHeader('Allow', ['GET', 'POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}