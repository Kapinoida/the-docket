
const { Pool } = require('pg');

// Use environment variables for connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgres://postgres:password@postgres:5432/the_docket',
});

async function migrate() {
  console.log('Starting production migration check...');

  try {
    // 1. Add 'name' column to caldav_configs
    await pool.query(`
      ALTER TABLE caldav_configs 
      ADD COLUMN IF NOT EXISTS name VARCHAR(255);
    `);
    console.log("Checked/Added 'name' column to caldav_configs.");

    // 2. Add 'resource_type' column to caldav_configs
    await pool.query(`
      ALTER TABLE caldav_configs 
      ADD COLUMN IF NOT EXISTS resource_type VARCHAR(50) DEFAULT 'task_list';
    `);
    console.log("Checked/Added 'resource_type' column to caldav_configs.");

    // 3. Create deleted_task_sync_log table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS deleted_task_sync_log (
        id SERIAL PRIMARY KEY,
        caldav_uid TEXT NOT NULL,
        deleted_at TIMESTAMP DEFAULT NOW()
      );
    `);
    
    // 4. Create index for deleted_task_sync_log
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_deleted_task_log_uid ON deleted_task_sync_log(caldav_uid);
    `);
    console.log("Checked/Created 'deleted_task_sync_log' table.");

    console.log('Migration check completed successfully.');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

migrate();
