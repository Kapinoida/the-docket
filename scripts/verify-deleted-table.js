
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgres://postgres:password@localhost:5433/the_docket',
});

async function verify() {
  console.log('Verifying deleted_task_sync_log schema...');
  try {
    const res = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'deleted_task_sync_log'
    `);
    
    const columns = res.rows.map(r => r.column_name);
    console.log('Columns found:', columns);

    if (columns.includes('caldav_uid')) {
      console.log('SUCCESS: Table and column present.');
    } else {
      console.error('FAIL: Table or column missing.');
      process.exit(1);
    }
  } catch (err) {
    console.error('Error querying database:', err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

verify();
