
import pool from '../src/lib/db';

async function migrate() {
  console.log('Starting Calendar Integration migration...');
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 1. Create calendar_events table
    console.log('Creating table: calendar_events');
    await client.query(`
      CREATE TABLE IF NOT EXISTS calendar_events (
        id SERIAL PRIMARY KEY,
        uid TEXT NOT NULL,
        calendar_id INTEGER REFERENCES caldav_configs(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        description TEXT,
        start_time TIMESTAMP WITH TIME ZONE NOT NULL,
        end_time TIMESTAMP WITH TIME ZONE NOT NULL,
        is_all_day BOOLEAN DEFAULT FALSE,
        location TEXT,
        status TEXT DEFAULT 'CONFIRMED',
        etag TEXT,
        last_synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        raw_data TEXT,
        UNIQUE(uid, calendar_id)
      );
    `);
    
    // Index for range queries
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_calendar_events_range ON calendar_events(start_time, end_time);
    `);

    // 2. Update caldav_configs table
    console.log('Updating table: caldav_configs');
    
    // Add resource_type column if it doesn't exist
    await client.query(`
      ALTER TABLE caldav_configs 
      ADD COLUMN IF NOT EXISTS resource_type TEXT DEFAULT 'task_list',
      ADD COLUMN IF NOT EXISTS name TEXT;
    `);

    // Set default name for existing configs
    await client.query(`
      UPDATE caldav_configs SET name = 'Default Account' WHERE name IS NULL;
    `);

    await client.query('COMMIT');
    console.log('Migration completed successfully.');
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('Migration failed:', e);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
