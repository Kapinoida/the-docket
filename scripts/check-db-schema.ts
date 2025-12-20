import { Pool } from 'pg';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const pool = new Pool({
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME,
});

async function checkSchema() {
  const client = await pool.connect();
  try {
    console.log('Checking tables and columns...');
    
    const tables = ['folders', 'notes', 'tasks', 'note_tasks'];
    
    for (const table of tables) {
      console.log(`\nTable: ${table}`);
      const res = await client.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = $1
        ORDER BY ordinal_position
      `, [table]);
      
      if (res.rows.length === 0) {
        console.log('  (Table not found)');
      } else {
        res.rows.forEach(row => {
          console.log(`  - ${row.column_name} (${row.data_type})`);
        });
      }
    }
    
  } catch (error) {
    console.error('Error checking schema:', error);
  } finally {
    client.release();
    pool.end();
  }
}

checkSchema();
