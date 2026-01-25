
import { NextApiRequest, NextApiResponse } from 'next';
import { getCalDAVClient } from '../../../lib/caldav';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const { server_url, username, password } = req.body;

  if (!server_url || !username || !password) {
    return res.status(400).json({ error: 'Missing required credentials' });
  }

  try {
    // Use tsdav client primarily for Auth validation
    const client = await getCalDAVClient({ server_url, username, password } as any);
    await client.login();
    
    // Fallback: Raw PROPFIND to discover calendars that tsdav might miss (e.g. subscribed/Google calendars)
    // We try to guess the calendar home URL based on common patterns if the user provided URL isn't it.
    
    const possiblePaths = [
        server_url,
        // Common Nextcloud/OwnCloud pattern
        server_url.endsWith('/') 
            ? `${server_url}remote.php/dav/calendars/${username}/`
            : `${server_url}/remote.php/dav/calendars/${username}/`,
        // If user gave a path like /remote.php/dav but no calendars
        server_url.includes('remote.php/dav') && !server_url.includes('calendars') 
            ? `${server_url.split('remote.php/dav')[0]}remote.php/dav/calendars/${username}/` 
            : null,
        // Generic CALDAV standard
        server_url.endsWith('/') ? `${server_url}calendars/${username}/` : `${server_url}/calendars/${username}/`,
    ].filter(Boolean) as string[];

    const uniquePaths = Array.from(new Set(possiblePaths));
    const auth = 'Basic ' + Buffer.from(username + ':' + password).toString('base64');
    
    let allCalendars: any[] = [];
    
    for (const url of uniquePaths) {
        try {
            console.log(`[Discovery] Probing: ${url}`);
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

            if (res.ok) {
                const text = await res.text();
                // Extract items using regex
                const responseBlocks = text.split('<d:response>');
                const found = responseBlocks.slice(1).map(block => {
                    const hrefMatch = block.match(/<d:href>([^<]+)<\/d:href>/);
                    const nameMatch = block.match(/<d:displayname>([^<]+)<\/d:displayname>/);
                    const isCalendar = block.includes('<c:calendar/>') || block.includes('calendar');
                    
                    if (hrefMatch && isCalendar) {
                        let href = hrefMatch[1];
                        // Ensure absolute URL
                        const baseUrl = new URL(url);
                        const fullUrl = new URL(href, baseUrl).toString();
                        
                        return {
                            name: nameMatch ? nameMatch[1] : 'Untitled',
                            url: fullUrl,
                            components: block.includes('VEVENT') ? ['VEVENT'] : ['VTODO'] // Guessing/Defaulting if not explicit
                        };
                    }
                    return null;
                }).filter(Boolean);

                if (found.length > 0) {
                    console.log(`[Discovery] Found ${found.length} calendars at ${url}`);
                    allCalendars = found;
                    break; // Stop at first valid hit
                }
            }
        } catch (e) {
            console.error(`[Discovery] Error at ${url}`, e);
        }
    }

    if (allCalendars.length === 0) {
        // Fallback to tsdav if raw fails completely (unlikely if valid)
        console.log('[Discovery] Raw discovery failed, falling back to tsdav');
         const calendars = await client.fetchCalendars();
         allCalendars = calendars.map(c => ({
             name: c.displayName || c.url,
             url: c.url,
             components: c.components
         }));
    }

    return res.status(200).json(allCalendars);
  } catch (error: any) {
    console.error('Failed to fetch calendars:', error);
    return res.status(500).json({ error: 'Failed to fetch calendars: ' + error.message });
  }
}
