
import ICAL from 'ical.js';

async function verifyIcal() {
    const url = 'https://calendar.google.com/calendar/ical/dplaskett%40min201.org/private-88f2b2283e18f05d257e8b905594c1c2/basic.ics';
    console.log(`Fetching ${url}...`);

    try {
        const res = await fetch(url);
        if (!res.ok) {
            console.error(`Failed: ${res.status} ${res.statusText}`);
            return;
        }

        const text = await res.text();
        console.log(`Fetched ${text.length} bytes.`);
        
        // Parse
        const jcal = ICAL.parse(text);
        const comp = new ICAL.Component(jcal);
        const vevents = comp.getAllSubcomponents('vevent');
        
        console.log(`Found ${vevents.length} VEVENTs.`);
        
        if (vevents.length > 0) {
            const first = vevents[0];
            console.log('Sample Event:', {
                summary: first.getFirstPropertyValue('summary'),
                start: first.getFirstPropertyValue('dtstart')?.toString()
            });
        }
        
    } catch (e) {
        console.error('Error:', e);
    }
}

verifyIcal();
