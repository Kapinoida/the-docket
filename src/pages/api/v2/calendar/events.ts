import { NextApiRequest, NextApiResponse } from 'next';
import { getCalendarEvents } from '../../../../lib/db';
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

    const { regular, recurring } = await getCalendarEvents(start as string, end as string);

    const results = [...regular];

    for (const event of recurring) {
        try {
            const eventStart = new Date(event.start_time);
            const eventEnd = new Date(event.end_time);
            const duration = eventEnd.getTime() - eventStart.getTime();

            const recur = (ICAL as any).Recur.fromString(event.rrule);
            const iterator = recur.iterator(ICAL.Time.fromJSDate(eventStart));
            
            let next: ICAL.Time;

            while ((next = iterator.next())) {
                const nextDate = next.toJSDate();
                
                if (nextDate > windowEnd) {
                    break;
                }
                
                if (nextDate >= windowStart) {
                    results.push({
                        ...event,
                        id: `${event.id}_${nextDate.getTime()}`,
                        start_time: nextDate.toISOString(),
                        end_time: new Date(nextDate.getTime() + duration).toISOString(),
                        is_recurring_instance: true
                    });
                }
            }
        } catch (err) {
            console.error(`Failed to expand recurrence for event ${event.id}:`, err);
            if (new Date(event.start_time) >= windowStart && new Date(event.end_time) <= windowEnd) {
                results.push(event);
            }
        }
    }
    
    results.sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());

    return res.status(200).json(results);
  } catch (error: any) {
    console.error(error);
    return res.status(500).json({ error: 'Database error fetching events' });
  }
}