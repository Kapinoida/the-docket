
import fs from 'fs';
import path from 'path';
import { Pool } from 'pg';

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5433'),
  database: process.env.DB_NAME || 'the_docket',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
});

async function restore() {
  console.log('Starting legacy table restoration...');
  console.log('DB Config:', {
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || '5433',
      database: process.env.DB_NAME || 'the_docket'
  });

  try {
    const sqlPath = path.join(process.cwd(), 'scripts', 'restore_legacy_tables.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    console.log('Reading SQL...');
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      console.log('Applying SQL...');
      await client.query(sql);
      await client.query('COMMIT');
      console.log('Restoration completed successfully.');
    } catch (e) {
      await client.query('ROLLBACK');
      console.error('SQL Error:', e);
      throw e;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

restore();
