import { NextApiRequest, NextApiResponse } from 'next';
import { getCalendarEventWithConfig, updateCalendarEvent, updateCalendarEventRawData, getCalendarEventById } from '../../../../../lib/db';
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

    const event = await getCalendarEventWithConfig(String(id));

    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    const newStart = new Date(start_time);
    const newEnd = new Date(end_time);

    await updateCalendarEvent(String(id), {
      start_time: newStart.toISOString(),
      end_time: newEnd.toISOString(),
      last_synced_at: new Date(),
    });

    if (event.raw_data && event.uid && event.calendar_url && event.server_url) {
      try {
        const jcal = ICAL.parse(event.raw_data);
        const vcal = new ICAL.Component(jcal);
        const vevent = vcal.getFirstSubcomponent('vevent');
        
        if (vevent) {
          const v = vevent as any;
          
          const dtstart = v.getFirstProperty('dtstart');
          if (dtstart) {
            const icalDt = ICAL.Time.fromJSDate(newStart, !event.is_all_day);
            v.updatePropertyWithValue('dtstart', icalDt);
          }
          
          const dtend = v.getFirstProperty('dtend');
          if (dtend) {
            const icalDt = ICAL.Time.fromJSDate(newEnd, !event.is_all_day);
            v.updatePropertyWithValue('dtend', icalDt);
          }

          const updatedRawData = vcal.toString();

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

          await updateCalendarEventRawData(String(id), updatedRawData);
        }
      } catch (caldavError: any) {
        console.error('CalDAV push failed (local DB already updated):', caldavError.message);
      }
    }

    const updated = await getCalendarEventById(String(id));
    return res.status(200).json(updated);
  } catch (error: any) {
    console.error('PATCH event error:', error);
    return res.status(500).json({ error: error.message });
  }
}