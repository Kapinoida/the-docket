import { NextApiRequest, NextApiResponse } from 'next';
import { assignTag, removeTag } from '@/lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    const { action, tagId, itemId, itemType } = req.body;

    if (!tagId || !itemId || !itemType) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (action === 'assign') {
      await assignTag(tagId, itemId, itemType);
      return res.status(200).json({ success: true });
    } 
    
    if (action === 'remove') {
      await removeTag(tagId, itemId, itemType);
      return res.status(200).json({ success: true });
    }

    return res.status(400).json({ error: 'Invalid action' });
  } catch (error: any) {
    console.error('API Error:', error);
    return res.status(500).json({ error: error.message });
  }
}
