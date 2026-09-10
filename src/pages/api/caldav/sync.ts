import { NextApiRequest, NextApiResponse } from 'next';
import { syncTasks } from '../../../lib/caldav';
import { withAuth } from '../../../lib/apiAuth';

export default withAuth(async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    const result = await syncTasks();
    
    if (result.errors.length > 0) {
      console.warn('Sync completed with errors:', result.errors);
    }
    
    return res.status(200).json(result);
  } catch (error: any) {
    console.error('Sync Fatal Error:', error);
    return res.status(500).json({ error: 'Sync failed' });
  }
});
