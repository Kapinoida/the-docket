
import pool from '../src/lib/db';
import { getCalDAVConfigs } from '../src/lib/caldav';

async function debugNativeTimeRange() {
  console.log('Starting Debug of Native Calendar TimeRange...');

  try {
    const configs = await getCalDAVConfigs();
    if (configs.length === 0) return;
    const config = configs[0]; // Just need creds

    const baseUrl = config.server_url.endsWith('/') ? config.server_url : config.server_url + '/';
    const personalUrl = `${baseUrl.split('remote.php')[0]}remote.php/dav/calendars/${config.username}/personal/`;
    
    const auth = 'Basic ' + Buffer.from(config.username + ':' + config.password).toString('base64');

    // Time Range: -1 month to +6 months
    const now = new Date();
    const start = new Date(now); start.setMonth(start.getMonth() - 1);
    const end = new Date(now); end.setMonth(end.getMonth() + 6);
    
    const formatToCalDAV = (date: Date) => {
        return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    };
    
    const tStart = formatToCalDAV(start);
    const tEnd = formatToCalDAV(end);

    console.log(`Time Range: ${tStart} to ${tEnd}`);

    const res = await fetch(personalUrl, {
        method: 'REPORT',
        headers: {
            'Authorization': auth,
            'Depth': '1',
            'Content-Type': 'application/xml; charset=utf-8'
        },
        body: `<?xml version="1.0" encoding="utf-8" ?>
<c:calendar-query xmlns:d="DAV:" xmlns:c="urn:ietf:params:xml:ns:caldav">
    <d:prop>
        <d:getetag />
        <c:calendar-data />
    </d:prop>
    <c:filter>
        <c:comp-filter name="VCALENDAR">
            <c:comp-filter name="VEVENT">
                <c:time-range start="${tStart}" end="${tEnd}"/>
            </c:comp-filter>
        </c:comp-filter>
    </c:filter>
</c:calendar-query>`
    });

    if (res.ok) {
        const text = await res.text();
        const count = text.split('<d:response>').length - 1;
        console.log(`TimeRange REPORT found ${count} items.`);
    } else {
         console.log(`TimeRange REPORT Failed: ${res.status}`);
         console.log(await res.text());
    }

  } catch (error) {
    console.error('Debug FAILED:', error);
  } finally {
    await pool.end();
  }
}

debugNativeTimeRange();
