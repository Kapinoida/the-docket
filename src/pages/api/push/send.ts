import type { NextApiRequest, NextApiResponse } from 'next';
import { getPushSubscriptions, getTasksDueSoon, recordPushNotification, removePushSubscriptionById } from '../../../lib/db';
import webpush from 'web-push';
import { requireAuth, AuthError } from '../../../lib/apiAuth';
import { extractTriggerToken, isValidPushTrigger } from '../../../lib/pushTrigger';

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

/**
 * Authorization for the push trigger.
 *
 * Two credentials are accepted:
 *   1. The dedicated server-to-server trigger secret (`PUSH_TRIGGER_TOKEN`
 *      presented in the `X-Push-Trigger-Token` header) — used by the
 *      external cron job.
 *   2. A normal user session cookie — used by the in-app test notification.
 *
 * Anything else is rejected. The route is never unauthenticated.
 */
async function isAuthorized(req: NextApiRequest): Promise<boolean> {
  if (isValidPushTrigger(req.headers, process.env.PUSH_TRIGGER_TOKEN)) {
    return true;
  }

  try {
    await requireAuth(req);
    return true;
  } catch (error) {
    if (error instanceof AuthError) {
      if (extractTriggerToken(req.headers) && !process.env.PUSH_TRIGGER_TOKEN) {
        console.warn(
          'Push trigger presented but PUSH_TRIGGER_TOKEN is not configured on the server'
        );
      }
      return false;
    }
    throw error;
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end();
  }

  if (!(await isAuthorized(req))) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
    return res.status(503).json({ error: 'Push notifications are not configured' });
  }

  try {
    const tasks = await getTasksDueSoon();

    if (tasks.length === 0) {
      return res.status(200).json({
        sent: 0,
        delivered: 0,
        failed: 0,
        removed: 0,
        tasks: 0,
        message: 'No tasks due',
      });
    }

    const subs = await getPushSubscriptions();

    if (subs.length === 0) {
      return res.status(200).json({
        sent: 0,
        delivered: 0,
        failed: 0,
        removed: 0,
        tasks: tasks.length,
        message: 'No subscribers',
      });
    }

    // Accounting:
    //   sent      — tasks where at least one delivery succeeded
    //   delivered — successful subscription deliveries
    //   failed    — failed subscription deliveries
    //   removed   — expired subscriptions (404/410) deleted
    let sent = 0;
    let delivered = 0;
    let failed = 0;
    let removed = 0;
    const failuresByStatus: Record<string, number> = {};

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

      let deliveredForTask = 0;

      for (const sub of subs) {
        try {
          await webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: { p256dh: sub.p256dh, auth: sub.auth },
            },
            payload
          );
          delivered += 1;
          deliveredForTask += 1;
        } catch (e: any) {
          failed += 1;

          const statusCode = typeof e?.statusCode === 'number' ? e.statusCode : 'unknown';
          failuresByStatus[statusCode] = (failuresByStatus[statusCode] || 0) + 1;

          // The push service told us this subscription is gone — clean it up.
          if (statusCode === 410 || statusCode === 404) {
            await removePushSubscriptionById(sub.id);
            removed += 1;
          }
        }
      }

      // Only record a notification when the task was actually delivered to at
      // least one device. Otherwise the task stays eligible and is retried.
      if (deliveredForTask > 0) {
        await recordPushNotification(task.id);
        sent += 1;
      }
    }

    if (failed > 0) {
      // Counts only — never log endpoints or subscription keys.
      const breakdown = Object.entries(failuresByStatus)
        .map(([status, count]) => `${status}:${count}`)
        .join(', ');
      console.warn(
        `Push delivery: ${failed} of ${delivered + failed} deliveries failed (${breakdown}); ` +
          `${removed} expired subscriptions removed`
      );
    }

    return res.status(200).json({
      sent,
      delivered,
      failed,
      removed,
      tasks: tasks.length,
    });
  } catch (error: any) {
    // Log the message only — a raw error object can carry a push endpoint.
    console.error('Push send error:', error?.message || 'unknown error');
    return res.status(500).json({ error: 'Push notification failed' });
  }
}
