import { NextApiRequest, NextApiResponse } from 'next';
import { getCalendarEventWithConfig, updateCalendarEvent, updateCalendarEventRawData, getCalendarEventById } from '../../../../../lib/db';
import { getCalDAVClient } from '../../../../../lib/caldav';
import ICAL from 'ical.js';
import { updateCalendarObject } from 'tsdav';

function parseISO(s: unknown): Date | null {
  if (typeof s !== 'string') return null;
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'PATCH') {
    res.setHeader('Allow', ['PATCH']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    const { id } = req.query;
    const body = req.body;

    if (!id || typeof id !== 'string') {
      return res.status(400).json({ error: 'Missing or invalid event id' });
    }

    if (!body || typeof body !== 'object') {
      return res.status(400).json({ error: 'Request body is required' });
    }

    const uid = id;
    const calendarId = typeof body.calendar_id === 'number' ? body.calendar_id : undefined;

    const event = await getCalendarEventWithConfig(uid, calendarId);

    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    const updateFields: { start_time?: string; end_time?: string; is_all_day?: boolean; last_synced_at?: Date } = {
      last_synced_at: new Date(),
    };

    if (body.start_time !== undefined) {
      const parsed = parseISO(body.start_time);
      if (!parsed) {
        return res.status(400).json({ error: 'Invalid start_time' });
      }
      updateFields.start_time = parsed.toISOString();
    }

    if (body.end_time !== undefined) {
      const parsed = parseISO(body.end_time);
      if (!parsed) {
        return res.status(400).json({ error: 'Invalid end_time' });
      }
      updateFields.end_time = parsed.toISOString();
    }

    if (body.is_all_day !== undefined) {
      if (typeof body.is_all_day !== 'boolean') {
        return res.status(400).json({ error: 'is_all_day must be a boolean' });
      }
      updateFields.is_all_day = body.is_all_day;
    }

    const finalStart = updateFields.start_time ? new Date(updateFields.start_time) : new Date(event.start_time);
    const finalEnd = updateFields.end_time ? new Date(updateFields.end_time) : new Date(event.end_time);

    if (finalEnd <= finalStart) {
      return res.status(400).json({ error: 'end_time must be after start_time' });
    }

    await updateCalendarEvent(uid, event.calendar_id, updateFields);

    if (event.raw_data && event.uid && event.calendar_url && event.server_url) {
      try {
        const jcal = ICAL.parse(event.raw_data);
        const vcal = new ICAL.Component(jcal);
        const vevent = vcal.getFirstSubcomponent('vevent');
        
        if (vevent) {
          const v = vevent as any;
          const isAllDay = updateFields.is_all_day ?? event.is_all_day;

          if (updateFields.start_time) {
            if (isAllDay) {
              const dateOnly = (ICAL.Time.fromJSDate as (date: Date, useUTC?: boolean) => ICAL.Time)(finalStart, true);
              (dateOnly as any).isDate = true;
              v.updatePropertyWithValue('dtstart', dateOnly);
            } else {
              const icalDt = (ICAL.Time.fromJSDate as (date: Date, useUTC?: boolean) => ICAL.Time)(finalStart, false);
              v.updatePropertyWithValue('dtstart', icalDt);
            }
          }
          
          if (updateFields.end_time) {
            if (isAllDay) {
              const endDate = new Date(finalEnd);
              endDate.setUTCDate(endDate.getUTCDate() + 1);
              const dateOnly = (ICAL.Time.fromJSDate as (date: Date, useUTC?: boolean) => ICAL.Time)(endDate, true);
              (dateOnly as any).isDate = true;
              v.updatePropertyWithValue('dtend', dateOnly);
            } else {
              const icalDt = (ICAL.Time.fromJSDate as (date: Date, useUTC?: boolean) => ICAL.Time)(finalEnd, false);
              v.updatePropertyWithValue('dtend', icalDt);
            }
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

          await updateCalendarEventRawData(uid, event.calendar_id, updatedRawData);
        }
      } catch (caldavError: any) {
        return res.status(200).json({
          ...await getCalendarEventById(uid, event.calendar_id),
          _caldav_error: caldavError.message || 'CalDAV sync failed',
        });
      }
    }

    const updated = await getCalendarEventById(uid, event.calendar_id);
    return res.status(200).json(updated);
  } catch (error: any) {
    console.error('PATCH event error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
