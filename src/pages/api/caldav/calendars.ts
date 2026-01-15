
import { NextApiRequest, NextApiResponse } from 'next';
import { getCalDAVClient } from '../../../lib/caldav';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const { server_url, username, password } = req.body;

  if (!server_url || !username || !password) {
    return res.status(400).json({ error: 'Missing required credentials' });
  }

  try {
    const client = await getCalDAVClient({ server_url, username, password } as any);
    await client.login();
    const calendars = await client.fetchCalendars();
    
    // Filter for calendars that support VTODO
    const taskCalendars = calendars.filter(c => 
      c.components && c.components.includes('VTODO')
    ).map(c => ({
      name: c.displayName || c.url,
      url: c.url
    }));

    return res.status(200).json(taskCalendars);
  } catch (error: any) {
    console.error('Failed to fetch calendars:', error);
    return res.status(500).json({ error: 'Failed to fetch calendars: ' + error.message });
  }
}
