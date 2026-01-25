
import pool from '../src/lib/db';

async function addGoogleDirect() {
    const url = 'https://calendar.google.com/calendar/ical/dplaskett%40min201.org/private-88f2b2283e18f05d257e8b905594c1c2/basic.ics';
    const name = 'Google Direct';
    
    try {
        // Check if exists
        const check = await pool.query('SELECT id FROM caldav_configs WHERE calendar_url = $1', [url]);
        if (check.rows.length > 0) {
            console.log('Config already exists.');
            // Update name?
            await pool.query('UPDATE caldav_configs SET name = $1, enabled = TRUE WHERE id = $2', [name, check.rows[0].id]);
        } else {
            console.log('Inserting new config...');
            await pool.query(`
                INSERT INTO caldav_configs (server_url, username, password, calendar_url, enabled, name, resource_type)
                VALUES ($1, $2, $3, $4, $5, $6, $7)
            `, [
                url, // Server URL acts as ID/Base
                'google', // Dummy user
                'none', // Dummy pass
                url, // Calendar URL (trigger for our new logic)
                true,
                name,
                'event_calendar'
            ]);
        }
        console.log('Done.');
    } catch (e) {
        console.error('Error:', e);
    } finally {
        await pool.end();
    }
}

addGoogleDirect();
