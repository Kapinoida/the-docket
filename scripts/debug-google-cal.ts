
import pool from '../src/lib/db';
import { getCalDAVConfigs } from '../src/lib/caldav';

async function debugGoogleCal() {
  console.log('Starting Debug of Google Calendar...');

  try {
    const configs = await getCalDAVConfigs();
    const targetConfig = configs.find(c => c.name?.includes('Dave - Personal'));

    if (!targetConfig) {
        console.log('Target config "Dave - Personal" not found.');
        return;
    }

    console.log(`Using config: ${targetConfig.name} (${targetConfig.calendar_url})`);

    const auth = 'Basic ' + Buffer.from(targetConfig.username + ':' + targetConfig.password).toString('base64');
    
    // 1. PROPFIND Depth 1 (List all items)
    console.log('\n--- Attempting PROPFIND Depth 1 ---');
    try {
        const res = await fetch(targetConfig.calendar_url!, {
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
                       <d:getcontentlength/>
                       <d:getetag/>
                       <d:displayname/>
                     </d:prop>
                   </d:propfind>`
        });

        console.log(`PROPFIND Status: ${res.status} ${res.statusText}`);
        if (res.ok) {
            const text = await res.text();
            // Count responses
            const responses = text.split('<d:response>');
            console.log(`Found ${responses.length - 1} items.`);
            
            // Log first few items to see what they look like
            responses.slice(1, 4).forEach((r, i) => {
                const href = r.match(/<d:href>([^<]+)<\/d:href>/)?.[1];
                console.log(`Item ${i+1}: ${href}`);
            });
            
            // If we found items, pick one and fetch it directly to see content
            if (responses.length > 2) {
                const sampleHref = responses[2].match(/<d:href>([^<]+)<\/d:href>/)?.[1];
                if (sampleHref) {
                     const url = new URL(sampleHref, targetConfig.server_url).toString();
                     console.log(`\n--- Fetching Sample Item: ${url} ---`);
                     const itemRes = await fetch(url, {
                        headers: { 'Authorization': auth }
                     });
                     if (itemRes.ok) {
                         const ical = await itemRes.text();
                         console.log(ical.substring(0, 500));
                     } else {
                         console.log(`Failed to fetch item: ${itemRes.status}`);
                     }
                }
            }
        }
    } catch (e: any) {
        console.log(`PROPFIND error: ${e.message}`);
    }

  } catch (error) {
    console.error('Debug FAILED:', error);
  } finally {
    await pool.end();
  }
}

debugGoogleCal();
