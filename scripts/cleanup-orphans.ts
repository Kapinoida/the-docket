
import { Pool } from 'pg';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env.local
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

async function cleanup() {
  const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5433'),
    database: process.env.DB_NAME || 'the_docket',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'password',
  });

  console.log('Starting cleanup of orphaned pages...');
  
  try {
    // 1. Delete pages with invalid folder_id
    const res = await pool.query(`
      DELETE FROM pages 
      WHERE folder_id IS NOT NULL 
      AND folder_id NOT IN (SELECT id FROM folders)
      RETURNING id, title;
    `);
    
    console.log(`Deleted ${res.rowCount} orphaned pages:`);
    res.rows.forEach(r => console.log(` - ${r.title} (ID: ${r.id})`));

  } catch (err) {
    console.error('Cleanup failed:', err);
  } finally {
    await pool.end();
  }
}

cleanup();
