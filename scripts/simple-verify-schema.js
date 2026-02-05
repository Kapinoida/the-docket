
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgres://postgres:password@localhost:5433/the_docket',
});

async function verify() {
  console.log('Verifying caldav_configs schema...');
  try {
    const res = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'caldav_configs'
    `);
    
    const columns = res.rows.map(r => r.column_name);
    console.log('Columns found:', columns);

    const missing = [];
    if (!columns.includes('name')) missing.push('name');
    if (!columns.includes('resource_type')) missing.push('resource_type');

    if (missing.length > 0) {
      console.error('FAIL: Missing columns:', missing);
      process.exit(1);
    } else {
      console.log('SUCCESS: All required columns are present.');
    }
  } catch (err) {
    console.error('Error querying database:', err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

verify();
