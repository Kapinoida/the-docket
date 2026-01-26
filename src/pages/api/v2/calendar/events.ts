import { NextApiRequest, NextApiResponse } from 'next';
import pool from '../../../../lib/db';
import ICAL from 'ical.js';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    const { start, end } = req.query;
    
    if (!start || !end) {
        return res.status(400).json({ error: 'Start and end dates required' });
    }

    const windowStart = new Date(start as string);
    const windowEnd = new Date(end as string);

    // 1. Fetch non-recurring events in range
    const regularEventsQuery = `
      SELECT e.*, c.name as calendar_name, c.username 
      FROM calendar_events e
      JOIN caldav_configs c ON e.calendar_id = c.id
      WHERE c.enabled = TRUE
      AND e.rrule IS NULL
      AND (e.start_time <= $2::timestamptz AND e.end_time >= $1::timestamptz)
    `;
    
    // 2. Fetch ALL recurring events that started before the end of the query window
    // We need to fetch them even if they started years ago, as they might recur into this window.
    const recurringEventsQuery = `
      SELECT e.*, c.name as calendar_name, c.username 
      FROM calendar_events e
      JOIN caldav_configs c ON e.calendar_id = c.id
      WHERE c.enabled = TRUE
      AND e.rrule IS NOT NULL
      AND e.start_time <= $1::timestamptz
    `;

    const [regularRes, recurringRes] = await Promise.all([
      pool.query(regularEventsQuery, [start, end]),
      pool.query(recurringEventsQuery, [end])
    ]);

    const results = [...regularRes.rows];

    // 3. Expand recurring events
    // console.log(`[Events] Found ${recurringRes.rowCount} potential recurring events for window ${windowStart.toISOString()} - ${windowEnd.toISOString()}`);
    
    for (const event of recurringRes.rows) {
        try {
            const eventStart = new Date(event.start_time);
            const eventEnd = new Date(event.end_time);
            const duration = eventEnd.getTime() - eventStart.getTime();
            
            // console.log(`[Events] expanding event ${event.id} with rrule: ${event.rrule}`);

            // Allow ICAL.js to parse the RRULE string directly
            // Fix: ICAL types might need casting if using @types/ical.js which can be wonky
            const recur = (ICAL as any).Recur.fromString(event.rrule);
            
            // Create an iterator from the event start date
            const iterator = recur.iterator(ICAL.Time.fromJSDate(eventStart));
            
            let next: ICAL.Time;

            // Iterate
            while ((next = iterator.next())) {
                const nextDate = next.toJSDate();
                
                if (nextDate > windowEnd) {
                    break;
                }
                
                if (nextDate >= windowStart) {
                    // Create an instance
                    results.push({
                        ...event,
                        id: `${event.id}_${nextDate.getTime()}`, // Virtual ID
                        start_time: nextDate.toISOString(),
                        end_time: new Date(nextDate.getTime() + duration).toISOString(),
                        is_recurring_instance: true
                    });
                }
            }
        } catch (err) {
            console.error(`Failed to expand recurrence for event ${event.id}:`, err);
            // Optionally push the original event if it falls in window?
            // Usually if RRULE fails, we treat it as single event.
            if (new Date(event.start_time) >= windowStart && new Date(event.end_time) <= windowEnd) {
                results.push(event);
            }
        }
    }
    
    // 4. Sort by start time
    results.sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());

    return res.status(200).json(results);
  } catch (error: any) {
    console.error(error);
    return res.status(500).json({ error: 'Database error fetching events' });
  }
}
