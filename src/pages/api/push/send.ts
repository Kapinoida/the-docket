import type { NextApiRequest, NextApiResponse } from 'next';
import { getPushSubscriptions, getTasksDueSoon, recordPushNotification, removePushSubscriptionById } from '../../../lib/db';
import webpush from 'web-push';

const vapidKeys = {
  publicKey: process.env.VAPID_PUBLIC_KEY || '',
  privateKey: process.env.VAPID_PRIVATE_KEY || '',
};

if (vapidKeys.publicKey && vapidKeys.privateKey) {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || 'mailto:dave@dcplaskett.com',
    vapidKeys.publicKey,
    vapidKeys.privateKey
  );
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end();
  }

  try {
    const tasks = await getTasksDueSoon();

    if (tasks.length === 0) {
      return res.status(200).json({ sent: 0 });
    }

    const subs = await getPushSubscriptions();

    if (subs.length === 0) {
      return res.status(200).json({ sent: 0, message: 'No subscribers' });
    }

    let sent = 0;
    for (const task of tasks) {
      const dueTime = new Date(task.due_date).toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        timeZoneName: 'short',
      });

      const payload = JSON.stringify({
        title: '⏰ Task Reminder',
        body: `${task.content} — due at ${dueTime}`,
        data: { url: '/inbox', taskId: task.id },
        tag: `task-${task.id}`,
      });

      for (const sub of subs) {
        try {
          await webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: { p256dh: sub.p256dh, auth: sub.auth },
            },
            payload
          );
        } catch (e: any) {
          if (e.statusCode === 410 || e.statusCode === 404) {
            await removePushSubscriptionById(sub.id);
          }
        }
      }

      await recordPushNotification(task.id);
      sent++;
    }

    return res.status(200).json({ sent });
  } catch (error: any) {
    console.error('Push send error:', error);
    return res.status(500).json({ error: error.message });
  }
}