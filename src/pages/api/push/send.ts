import type { NextApiRequest, NextApiResponse } from 'next';
import pool from '../../../lib/db';
import webpush from 'web-push';

// Configure web-push once
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
    // Find tasks due within the next 10 minutes that have explicit times
    // and haven't been notified since last update
    const tasks = await pool.query(`
      SELECT t.id, t.content, t.due_date
      FROM tasks t
      WHERE t.status = 'todo'
        AND t.due_date IS NOT NULL
        AND t.due_date > NOW()
        AND t.due_date <= NOW() + INTERVAL '10 minutes'
        AND NOT EXISTS (
          SELECT 1 FROM push_notifications pn
          WHERE pn.task_id = t.id
            AND pn.sent_at > t.updated_at
        )
      ORDER BY t.due_date
    `);

    if (tasks.rows.length === 0) {
      return res.status(200).json({ sent: 0 });
    }

    // Get all subscriptions
    const subs = await pool.query('SELECT * FROM push_subscriptions');

    if (subs.rows.length === 0) {
      return res.status(200).json({ sent: 0, message: 'No subscribers' });
    }

    let sent = 0;
    for (const task of tasks.rows) {
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

      for (const sub of subs.rows) {
        try {
          await webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: { p256dh: sub.p256dh, auth: sub.auth },
            },
            payload
          );
        } catch (e: any) {
          // Remove dead subscriptions
          if (e.statusCode === 410 || e.statusCode === 404) {
            await pool.query('DELETE FROM push_subscriptions WHERE id = $1', [sub.id]);
          }
        }
      }

      // Record notification
      await pool.query('INSERT INTO push_notifications (task_id) VALUES ($1)', [task.id]);
      sent++;
    }

    return res.status(200).json({ sent });
  } catch (error: any) {
    console.error('Push send error:', error);
    return res.status(500).json({ error: error.message });
  }
}
