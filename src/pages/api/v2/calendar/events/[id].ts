import { NextApiRequest, NextApiResponse } from 'next';
import pool from '../../../../../lib/db';
import { getCalDAVClient } from '../../../../../lib/caldav';
import ICAL from 'ical.js';
import { updateCalendarObject } from 'tsdav';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'PATCH') {
    res.setHeader('Allow', ['PATCH']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    const { id } = req.query;
    const { start_time, end_time } = req.body;

    if (!id || !start_time || !end_time) {
      return res.status(400).json({ error: 'Missing id, start_time, or end_time' });
    }

    // 1. Fetch the event with calendar config
    const result = await pool.query(`
      SELECT e.*, c.server_url, c.username, c.password, c.calendar_url
      FROM calendar_events e
      JOIN caldav_configs c ON e.calendar_id = c.id
      WHERE e.id = $1 AND c.enabled = TRUE
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }

    const event = result.rows[0];
    const newStart = new Date(start_time);
    const newEnd = new Date(end_time);

    // 2. Update local DB immediately (optimistic)
    await pool.query(`
      UPDATE calendar_events 
      SET start_time = $1, end_time = $2, last_synced_at = NOW()
      WHERE id = $3
    `, [newStart.toISOString(), newEnd.toISOString(), id]);

    // 3. If we have raw_data and a CalDAV config, push update to remote
    if (event.raw_data && event.uid && event.calendar_url && event.server_url) {
      try {
        // Parse and modify the ICAL data
        const jcal = ICAL.parse(event.raw_data);
        const vcal = new ICAL.Component(jcal);
        const vevent = vcal.getFirstSubcomponent('vevent');
        
        if (vevent) {
          // Cast to any — ical.js type defs are incomplete
          const v = vevent as any;
          
          // Update DTSTART
          const dtstart = v.getFirstProperty('dtstart');
          if (dtstart) {
            const icalDt = ICAL.Time.fromJSDate(newStart, !event.is_all_day);
            v.updatePropertyWithValue('dtstart', icalDt);
          }
          
          // Update DTEND
          const dtend = v.getFirstProperty('dtend');
          if (dtend) {
            const icalDt = ICAL.Time.fromJSDate(newEnd, !event.is_all_day);
            v.updatePropertyWithValue('dtend', icalDt);
          }

          const updatedRawData = vcal.toString();

          // Push to CalDAV server
          const client = await getCalDAVClient({
            server_url: event.server_url,
            username: event.username,
            password: event.password,
          } as any);
          await client.login();

          await updateCalendarObject({
            calendarObject: {
              url: `${event.calendar_url}${event.uid}.ics`,
              data: updatedRawData,
              etag: event.etag || undefined,
            },
          });

          // Update local raw_data with the pushed version
          await pool.query(`
            UPDATE calendar_events SET raw_data = $1 WHERE id = $2
          `, [updatedRawData, id]);
        }
      } catch (caldavError: any) {
        console.error('CalDAV push failed (local DB already updated):', caldavError.message);
        // Local update already persisted — warn but don't fail
        const updated = await pool.query(`
          SELECT e.*, c.name as calendar_name, c.color as calendar_color
          FROM calendar_events e
          JOIN caldav_configs c ON e.calendar_id = c.id
          WHERE e.id = $1
        `, [id]);
        return res.status(200).json({ 
          ...updated.rows[0],
          warning: 'Local updated, remote sync failed: ' + caldavError.message 
        });
      }
    }

    // 4. Return the updated event
    const updated = await pool.query(`
      SELECT e.*, c.name as calendar_name, c.color as calendar_color
      FROM calendar_events e
      JOIN caldav_configs c ON e.calendar_id = c.id
      WHERE e.id = $1
    `, [id]);

    return res.status(200).json(updated.rows[0]);
  } catch (error: any) {
    console.error('PATCH event error:', error);
    return res.status(500).json({ error: error.message });
  }
}
