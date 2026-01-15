import { NextApiRequest, NextApiResponse } from 'next';
import pool from '../../../lib/db';
import { getCalDAVClient } from '../../../lib/caldav';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      const result = await pool.query('SELECT id, server_url, username, calendar_url, enabled, created_at FROM caldav_configs WHERE enabled = TRUE LIMIT 1');
      if (result.rows.length === 0) {
        return res.status(200).json(null);
      }
      return res.status(200).json(result.rows[0]);
    } catch (error: any) {
      console.error(error);
      return res.status(500).json({ error: 'Database error' });
    }
  } else if (req.method === 'POST') {
    const { server_url, username, password, calendar_url } = req.body;
    
    if (!server_url || !username || !password) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    try {
      // Test connection before saving
      try {
        const testClient = await getCalDAVClient({ server_url, username, password } as any);
        await testClient.login();
        await testClient.fetchCalendars();
      } catch (connError: any) {
        return res.status(400).json({ error: 'Connection failed: ' + connError.message });
      }

      // Upsert: Reset previous configs ensuring one active config for MVP
      await pool.query('DELETE FROM caldav_configs');
      
      const result = await pool.query(
        'INSERT INTO caldav_configs (server_url, username, password, calendar_url) VALUES ($1, $2, $3, $4) RETURNING id, server_url, username, enabled',
        [server_url, username, password, calendar_url]
      );
      
      return res.status(201).json(result.rows[0]);
    } catch (error: any) {
      console.error(error);
      return res.status(500).json({ error: error.message });
    }
  } else if (req.method === 'DELETE') {
     await pool.query('DELETE FROM caldav_configs');
     return res.status(200).json({ success: true });
  } else {
    res.setHeader('Allow', ['GET', 'POST', 'DELETE']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
