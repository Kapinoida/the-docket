
import pool from '../src/lib/db';

async function resetDb() {
  const client = await pool.connect();
  try {
    console.log('Starting Clean Slate Protocol...');
    
    // Clear in order of dependencies
    await client.query('DELETE FROM page_items');
    console.log('✅ Wiped page_items');
    
    await client.query('DELETE FROM tasks');
    console.log('✅ Wiped tasks');
    
    await client.query('DELETE FROM pages');
    console.log('✅ Wiped pages');

    // Reset sequences so IDs start from 1 again (optional but nice for "clean slate")
    await client.query('ALTER SEQUENCE pages_id_seq RESTART WITH 1');
    await client.query('ALTER SEQUENCE tasks_id_seq RESTART WITH 1');
    await client.query('ALTER SEQUENCE page_items_id_seq RESTART WITH 1');
    console.log('✅ Reset ID sequences');

    console.log('Clean Slate Protocol Complete.');
  } catch (err) {
    console.error('Error resetting DB:', err);
  } finally {
    client.release();
    pool.end();
  }
}

resetDb();
