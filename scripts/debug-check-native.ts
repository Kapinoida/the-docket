
import pool from '../src/lib/db';
import { getCalDAVConfigs } from '../src/lib/caldav';

async function debugNative() {
  console.log('Starting Debug of Native Calendar (Personal)...');

  try {
    const configs = await getCalDAVConfigs();
    if (configs.length === 0) return;
    const config = configs[0]; // Just need creds

    const baseUrl = config.server_url.endsWith('/') ? config.server_url : config.server_url + '/';
    // Construct URL for "Personal" (Native)
    // /remote.php/dav/calendars/dcplaskett/personal/
    const personalUrl = `${baseUrl.split('remote.php')[0]}remote.php/dav/calendars/${config.username}/personal/`;
    
    console.log(`Targeting: ${personalUrl}`);
    const auth = 'Basic ' + Buffer.from(config.username + ':' + config.password).toString('base64');

    // 1. PROPFIND
    console.log('\n--- PROPFIND Depth 1 ---');
    const res = await fetch(personalUrl, {
        method: 'PROPFIND',
        headers: {
            'Authorization': auth,
            'Depth': '1',
            'Content-Type': 'application/xml; charset=utf-8'
        },
        body: `<?xml version="1.0" encoding="utf-8" ?>
               <d:propfind xmlns:d="DAV:">
                 <d:prop>
                   <d:resourcetype/>
                   <d:getetag/>
                   <d:displayname/>
                 </d:prop>
               </d:propfind>`
    });

    if (res.ok) {
        const text = await res.text();
        const count = text.split('<d:response>').length - 1;
        console.log(`Found ${count} items.`);
        if (count > 0) console.log('Native PROPFIND SUCCESS (contains items).');
        else console.log('Native PROPFIND returned 0 items (Calendar might be empty).');
    } else {
        console.log(`PROPFIND Failed: ${res.status}`);
    }

    // 2. REPORT (Unfiltered)
    console.log('\n--- REPORT (Fetch All) ---');
    const res2 = await fetch(personalUrl, {
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
            <c:comp-filter name="VEVENT" />
        </c:comp-filter>
    </c:filter>
</c:calendar-query>`
    });

    if (res2.ok) {
        const text = await res2.text();
        const count = text.split('<d:response>').length - 1;
        console.log(`REPORT found ${count} items.`);
    } else {
         console.log(`REPORT Failed: ${res2.status}`);
    }


  } catch (error) {
    console.error('Debug FAILED:', error);
  } finally {
    await pool.end();
  }
}

debugNative();
