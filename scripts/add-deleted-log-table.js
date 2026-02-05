
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgres://postgres:password@localhost:5433/the_docket',
});

async function migrate() {
  console.log('Migrating: Adding deleted_task_sync_log table...');

  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS deleted_task_sync_log (
        id SERIAL PRIMARY KEY,
        caldav_uid TEXT NOT NULL,
        deleted_at TIMESTAMP DEFAULT NOW()
      );
    `);
    
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_deleted_task_log_uid ON deleted_task_sync_log(caldav_uid);
    `);

    console.log('Migration success: Table created.');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

migrate();
