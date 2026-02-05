
import pool from '../src/lib/db';

async function migrate() {
  console.log('Starting migration to add columns to caldav_configs...');

  try {
    // Add 'name' column
    await pool.query(`
      ALTER TABLE caldav_configs 
      ADD COLUMN IF NOT EXISTS name VARCHAR(255);
    `);
    console.log("Added 'name' column.");

    // Add 'resource_type' column
    await pool.query(`
      ALTER TABLE caldav_configs 
      ADD COLUMN IF NOT EXISTS resource_type VARCHAR(50) DEFAULT 'task_list';
    `);
    console.log("Added 'resource_type' column.");

    console.log('Migration completed successfully.');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

migrate();
