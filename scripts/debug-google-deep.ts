
import pool from '../src/lib/db';
import { getCalDAVConfigs } from '../src/lib/caldav';

async function debugGoogleDeep() {
  console.log('Starting Deep Debug of Google Calendar...');

  try {
    const configs = await getCalDAVConfigs();
    const targetConfig = configs.find(c => c.name?.includes('Dave - Personal'));

    if (!targetConfig) {
        console.log('Target config "Dave - Personal" not found.');
        return;
    }

    console.log(`Target: ${targetConfig.name} (${targetConfig.calendar_url})`);

    const auth = 'Basic ' + Buffer.from(targetConfig.username + ':' + targetConfig.password).toString('base64');
    
    // 1. Check Collection Properties (Depth 0)
    console.log('\n--- 1. Collection Properties (Depth 0) ---');
    const resProp = await fetch(targetConfig.calendar_url!, {
        method: 'PROPFIND',
        headers: {
            'Authorization': auth,
            'Depth': '0',
            'Content-Type': 'application/xml; charset=utf-8'
        },
        body: `<?xml version="1.0" encoding="utf-8" ?>
               <d:propfind xmlns:d="DAV:">
                 <d:allprop/>
               </d:propfind>`
    });

    if (resProp.ok) {
        console.log(await resProp.text());
    } else {
        console.log(`Failed: ${resProp.status}`);
    }

    // 2. Try User-Agent "Thunderbird" with REPORT
    console.log('\n--- 2. REPORT with User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:91.0) Gecko/20100101 Thunderbird/91.0 ---');
    
    // Time Range: -1m to +1m (Keep it small)
    const now = new Date();
    const start = new Date(now); start.setMonth(start.getMonth() - 1);
    const end = new Date(now); end.setMonth(end.getMonth() + 1);
    const tStart = start.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    const tEnd = end.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

    const resReport = await fetch(targetConfig.calendar_url!, {
        method: 'REPORT',
        headers: {
            'Authorization': auth,
            'Depth': '1',
            'Content-Type': 'application/xml; charset=utf-8',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:91.0) Gecko/20100101 Thunderbird/91.0'
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

    if (resReport.ok) {
        const text = await resReport.text();
        const count = text.split('<d:response>').length - 1;
        console.log(`Found ${count} items with Thunderbird UA.`);
        if (count === 0) console.log('Snippet:', text.substring(0, 500));
    } else {
        console.log(`Failed: ${resReport.status}`);
        console.log(await resReport.text());
    }

  } catch (error) {
    console.error('Debug FAILED:', error);
  } finally {
    await pool.end();
  }
}

debugGoogleDeep();
