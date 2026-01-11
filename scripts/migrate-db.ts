
import fs from 'fs';
import path from 'path';
import pool from '../src/lib/db';

async function migrate() {
  console.log('Starting migration...');
  try {
    const schemaPath = path.join(__dirname, '..', 'schema.sql');
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');

    console.log('Reading schema.sql...');
    
    // Split into statements if needed, but pool.query usually handles multiple statements
    // However, explicit transaction is safer
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      console.log('Applying schema...');
      await client.query(schemaSql);
      await client.query('COMMIT');
      console.log('Migration completed successfully.');
    } catch (e) {
      await client.query('ROLLBACK');
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

migrate();
