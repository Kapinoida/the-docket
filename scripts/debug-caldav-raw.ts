
import pool from '../src/lib/db';
import { getCalDAVConfigs } from '../src/lib/caldav';

async function debugDiscovery() {
  console.log('Starting Raw Debug of Calendar Discovery...');

  try {
    const configs = await getCalDAVConfigs();
    if (configs.length === 0) {
        console.log('No configs found in DB.');
        return;
    }

    const config = configs[0]; // Use the first one
    console.log(`Using config: ${config.username} @ ${config.server_url}`);

    // Construct the Calendar Home URL based on what we saw in the logs
    // Pattern: /remote.php/dav/calendars/USERNAME/
    // We can guess it from the server_url if it's the base, but let's try to be smart.
    // Usually server_url is base.
    
    // We will try a few paths
    const paths = [
        config.server_url, // Might be the direct home
        `${config.server_url}/calendars/${config.username}/`, // Common Nextcloud
        new URL(`/remote.php/dav/calendars/${config.username}/`, config.server_url).toString() // Absolute guess
    ];

    const auth = 'Basic ' + Buffer.from(config.username + ':' + config.password).toString('base64');

    console.log('\n--- PROBING PATHS ---');

    for (const url of paths) {
        console.log(`\nProbing: ${url}`);
        try {
            const res = await fetch(url, {
                method: 'PROPFIND',
                headers: {
                    'Authorization': auth,
                    'Depth': '1',
                    'Content-Type': 'application/xml; charset=utf-8'
                },
                body: `<?xml version="1.0" encoding="utf-8" ?>
                       <d:propfind xmlns:d="DAV:" xmlns:c="urn:ietf:params:xml:ns:caldav">
                         <d:prop>
                           <d:resourcetype/>
                           <d:displayname/>
                           <c:supported-calendar-component-set/>
                         </d:prop>
                       </d:propfind>`
            });

            console.log(`Status: ${res.status} ${res.statusText}`);
            if (res.ok) {
                const text = await res.text();
                console.log('--- RESPONSE XML (First 1000 chars) ---');
                console.log(text.substring(0, 1000));
                console.log('...\n--- END SNIPPET ---');
                
                // Simple regex extraction of HREFs and DisplayNames to see what's there
                const responses = text.split('<d:response>');
                console.log(`\nFound ${responses.length - 1} items in response.`);
                
                responses.slice(1).forEach(r => {
                    const href = r.match(/<d:href>([^<]+)<\/d:href>/)?.[1];
                    const name = r.match(/<d:displayname>([^<]+)<\/d:displayname>/)?.[1];
                    const isCalendar = r.includes('<c:calendar/>') || r.includes('calendar');
                    const isCollection = r.includes('<d:collection/>');
                    
                    if (href) {
                        console.log(`Item: ${name || '(No Name)'}`);
                        console.log(`  HREF: ${href}`);
                        console.log(`  Type: ${isCalendar ? 'Calendar' : ''} ${isCollection ? 'Collection' : ''}`);
                    }
                });
                
                // If we found items, this is likely the right path, so break?
                if (responses.length > 2) break; 
            }
        } catch (e: any) {
            console.log(`Error probing ${url}: ${e.message}`);
        }
    }

  } catch (error) {
    console.error('Debug FAILED:', error);
  } finally {
    await pool.end();
  }
}

debugDiscovery();
