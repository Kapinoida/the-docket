import type { NextApiRequest, NextApiResponse } from 'next';
import pool from '../../../lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    // Store or update push subscription
    const { endpoint, keys } = req.body;
    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      return res.status(400).json({ error: 'Missing subscription fields' });
    }

    await pool.query(
      `INSERT INTO push_subscriptions (endpoint, p256dh, auth)
       VALUES ($1, $2, $3)
       ON CONFLICT (endpoint) DO UPDATE SET p256dh = $2, auth = $3`,
      [endpoint, keys.p256dh, keys.auth]
    );

    return res.status(200).json({ ok: true });
  }

  if (req.method === 'DELETE') {
    const { endpoint } = req.body;
    if (!endpoint) return res.status(400).json({ error: 'Missing endpoint' });

    await pool.query('DELETE FROM push_subscriptions WHERE endpoint = $1', [endpoint]);
    return res.status(200).json({ ok: true });
  }

  if (req.method === 'GET') {
    const result = await pool.query('SELECT COUNT(*)::int as count FROM push_subscriptions');
    return res.status(200).json({ subscribed: result.rows[0].count > 0 });
  }

  res.setHeader('Allow', ['POST', 'DELETE', 'GET']);
  return res.status(405).end();
}
