import { NextApiRequest, NextApiResponse } from 'next';
import { getFocusTasks } from '../../../../lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const data = await getFocusTasks();
    res.status(200).json(data);
  } catch (error) {
    console.error('Error fetching focus tasks:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}
