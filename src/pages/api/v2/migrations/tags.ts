import { NextApiRequest, NextApiResponse } from 'next';
import pool from '@/lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Create tags table
      await client.query(`
        CREATE TABLE IF NOT EXISTS tags (
          id SERIAL PRIMARY KEY,
          name VARCHAR(50) UNIQUE NOT NULL,
          color VARCHAR(20) DEFAULT 'blue',
          created_at TIMESTAMP DEFAULT NOW()
        );
      `);

      // Create assignments table
      await client.query(`
        CREATE TABLE IF NOT EXISTS tag_assignments (
          id SERIAL PRIMARY KEY,
          tag_id INTEGER REFERENCES tags(id) ON DELETE CASCADE,
          item_id INTEGER NOT NULL,
          item_type VARCHAR(20) NOT NULL CHECK (item_type IN ('page', 'task')),
          created_at TIMESTAMP DEFAULT NOW(),
          UNIQUE(tag_id, item_id, item_type)
        );
      `);

      // Add indexes for performance
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_tag_assignments_item ON tag_assignments(item_id, item_type);
        CREATE INDEX IF NOT EXISTS idx_tag_assignments_tag ON tag_assignments(tag_id);
      `);

      await client.query('COMMIT');
      res.status(200).json({ message: 'Migration successful' });
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error('Migration failed', error);
    res.status(500).json({ error: error.message });
  }
}
