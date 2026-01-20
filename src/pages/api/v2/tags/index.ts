import { NextApiRequest, NextApiResponse } from 'next';
import { createTag, getTags } from '@/lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method === 'GET') {
      const tags = await getTags();
      return res.status(200).json(tags);
    } 
    
    if (req.method === 'POST') {
      const { name, color } = req.body;
      if (!name) return res.status(400).json({ error: 'Name is required' });
      const tag = await createTag(name, color);
      return res.status(201).json(tag);
    }

    res.setHeader('Allow', ['GET', 'POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  } catch (error: any) {
    console.error('API Error:', error);
    return res.status(500).json({ error: error.message });
  }
}
