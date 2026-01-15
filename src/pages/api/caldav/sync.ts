import { NextApiRequest, NextApiResponse } from 'next';
import { syncTasks } from '../../../lib/caldav';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    const result = await syncTasks();
    
    if (result.errors.length > 0) {
      // Partial success is still a 200 usually, but with warnings?
      // If purely errors and no sync, maybe 500?
      // Let's return 200 with error details.
      console.warn('Sync completed with errors:', result.errors);
    }
    
    return res.status(200).json(result);
  } catch (error: any) {
    console.error('Sync Fatal Error:', error);
    return res.status(500).json({ error: error.message });
  }
}
