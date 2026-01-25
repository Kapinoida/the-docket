
import pool from '../src/lib/db';
import { getCalDAVConfigs, getCalDAVClient } from '../src/lib/caldav';
import { DAVCalendar } from 'tsdav';

async function debugEventSync() {
  console.log('Starting Debug of Event Sync...');

  try {
    const configs = await getCalDAVConfigs();
    const eventConfig = configs.find(c => c.resource_type === 'event_calendar');

    if (!eventConfig) {
        console.log('No event calendar config found.');
        return;
    }

    console.log(`Using config: ${eventConfig.name} (${eventConfig.calendar_url})`);

    const client = await getCalDAVClient(eventConfig);
    await client.login();

    // Reconstruct the synthetic calendar object
    const calendar: DAVCalendar = {
        url: eventConfig.calendar_url!,
        displayName: eventConfig.name || 'Debug Cal',
        components: ['VEVENT'],
        resourcetype: 'calendar',
        ctag: '',
        description: '',
        data: ''
    };

    // 1. Try tsdav fetch
    console.log('\n--- Attempting tsdav fetch ---');
    const now = new Date();
    const start = new Date(now); start.setMonth(start.getMonth() - 1);
    const end = new Date(now); end.setMonth(end.getMonth() + 6);
    
    // TSDAV format
    const timeRange = {
        start: start.toISOString().split('.')[0] + 'Z',
        end: end.toISOString().split('.')[0] + 'Z'
    };
    
    try {
        const objects = await client.fetchCalendarObjects({
            calendar,
            timeRange
        });
        console.log(`tsdav found: ${objects.length} objects`);
    } catch (e: any) {
        console.log(`tsdav error: ${e.message}`);
    }

    // 2. Try Raw REPORT
    console.log('\n--- Attempting Raw REPORT ---');
    const auth = 'Basic ' + Buffer.from(eventConfig.username + ':' + eventConfig.password).toString('base64');
    
    const reportBody = `<?xml version="1.0" encoding="utf-8" ?>
<c:calendar-query xmlns:d="DAV:" xmlns:c="urn:ietf:params:xml:ns:caldav">
    <d:prop>
        <d:getetag />
        <c:calendar-data />
    </d:prop>
    <c:filter>
        <c:comp-filter name="VCALENDAR">
            <c:comp-filter name="VEVENT" />
        </c:comp-filter>
    </c:filter>
</c:calendar-query>`;

    try {
        const res = await fetch(eventConfig.calendar_url!, {
            method: 'REPORT',
            headers: {
                'Authorization': auth,
                'Depth': '1',
                'Content-Type': 'application/xml; charset=utf-8'
            },
            body: reportBody
        });

        console.log(`Raw Status: ${res.status} ${res.statusText}`);
        if (res.ok) {
            const text = await res.text();
            console.log(`Response length: ${text.length} chars`);
            console.log('Snippet:', text.substring(0, 500));
            // Check for event counts roughly
            const count = (text.match(/<d:response>/g) || []).length;
            console.log(`Raw found estimate: ${count} items`);
        } else {
            console.log(await res.text());
        }
    } catch (e: any) {
        console.log(`Raw error: ${e.message}`);
    }

  } catch (error) {
    console.error('Debug FAILED:', error);
  } finally {
    await pool.end();
  }
}

debugEventSync();
