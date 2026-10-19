import type { NextApiRequest, NextApiResponse } from 'next';
import { getPushSubscriptionByEndpoint, removePushSubscriptionById } from '../../../lib/db';
import webpush from 'web-push';
import { withAuth } from '../../../lib/apiAuth';

if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || 'mailto:dave@dcplaskett.com',
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
}

/**
 * Sends a single test notification to the caller's own device.
 *
 * Session authenticated (the browser cookie), never trigger authenticated —
 * this is a user-facing action from Settings, not a server-to-server call.
 * The endpoint must already be a known subscription so a session cannot be
 * used to push to arbitrary endpoints.
 */
export default withAuth(async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end();
  }

  const endpoint = typeof req.body?.endpoint === 'string' ? req.body.endpoint.trim() : '';

  if (!endpoint) {
    return res.status(400).json({ error: 'Missing endpoint' });
  }

  const sub = await getPushSubscriptionByEndpoint(endpoint);

  if (!sub) {
    return res.status(404).json({ error: 'Subscription not found' });
  }

  const payload = JSON.stringify({
    title: '✅ Docket test notification',
    body: 'Push notifications are working.',
    data: { url: '/inbox' },
    tag: 'docket-test',
  });

  try {
    await webpush.sendNotification(
      {
        endpoint: sub.endpoint,
        keys: { p256dh: sub.p256dh, auth: sub.auth },
      },
      payload
    );

    return res.status(200).json({ ok: true });
  } catch (e: any) {
    const statusCode = typeof e?.statusCode === 'number' ? e.statusCode : null;

    if (statusCode === 404 || statusCode === 410) {
      await removePushSubscriptionById(sub.id);
      return res.status(410).json({ error: 'Subscription expired' });
    }

    // Message only — the raw error can contain the push endpoint.
    console.error('Push test notification error:', e?.message || 'unknown error');
    return res.status(502).json({ error: 'Failed to deliver test notification' });
  }
});
