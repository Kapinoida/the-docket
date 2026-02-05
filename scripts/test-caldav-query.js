
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgres://postgres:password@localhost:5433/the_docket',
});

async function testQuery() {
  console.log('Testing CalDAV config SELECT query...');
  try {
    const query = `
      SELECT id, server_url, username, calendar_url, enabled, name, resource_type, created_at 
      FROM caldav_configs 
      WHERE enabled = TRUE 
      ORDER BY created_at ASC
    `;
    
    console.log('Running query:', query);
    
    const res = await pool.query(query);
    
    console.log('Query successful!');
    console.log('Rows returned:', res.rows.length);
    console.log('First row (if any):', res.rows[0]);
    
  } catch (err) {
    console.error('Query FAILED:', err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

testQuery();
