import type { NextApiRequest, NextApiResponse } from 'next';
import { upsertPushSubscription, removePushSubscription, hasPushSubscriptions } from '../../../lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    const { endpoint, keys } = req.body;
    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      return res.status(400).json({ error: 'Missing subscription fields' });
    }

    await upsertPushSubscription(endpoint, keys.p256dh, keys.auth);
    return res.status(200).json({ ok: true });
  }

  if (req.method === 'DELETE') {
    const { endpoint } = req.body;
    if (!endpoint) return res.status(400).json({ error: 'Missing endpoint' });

    await removePushSubscription(endpoint);
    return res.status(200).json({ ok: true });
  }

  if (req.method === 'GET') {
    const subscribed = await hasPushSubscriptions();
    return res.status(200).json({ subscribed });
  }

  res.setHeader('Allow', ['POST', 'DELETE', 'GET']);
  return res.status(405).end();
}