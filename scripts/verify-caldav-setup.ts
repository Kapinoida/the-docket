
import pool from '../src/lib/db';
import { syncCalDAV } from '../src/lib/caldav';

async function verify() {
  console.log('Starting Verification...');

  try {
    // 1. Check Tables
    const tableRes = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('calendar_events', 'caldav_configs')
    `);
    const tables = tableRes.rows.map(r => r.table_name);
    console.log('Tables found:', tables);
    
    if (!tables.includes('calendar_events')) throw new Error('Missing calendar_events table');
    
    // 2. Check Columns
    const colRes = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'caldav_configs'
    `);
    const columns = colRes.rows.map(r => r.column_name);
    console.log('caldav_configs columns:', columns);
    
    if (!columns.includes('resource_type')) throw new Error('Missing resource_type column in caldav_configs');
    if (!columns.includes('name')) throw new Error('Missing name column in caldav_configs');

    // 3. Dry Run Sync (will likely do nothing if no configs, or fail if no creds, but proving the function runs)
    console.log('Attempting dry-run of syncCalDAV()...');
    const result = await syncCalDAV();
    console.log('Sync result:', result);

  } catch (error) {
    console.error('Verification FAILED:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

verify();
