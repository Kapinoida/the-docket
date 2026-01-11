import pool from '../src/lib/db';

async function migrate() {
  const client = await pool.connect();
  
  try {
    console.log('Starting migration: Unifying Notes and Pages...');
    await client.query('BEGIN');

    // 1. Add folder_id to pages table
    console.log('Adding folder_id to pages table...');
    await client.query(`
      ALTER TABLE pages 
      ADD COLUMN IF NOT EXISTS folder_id INTEGER REFERENCES folders(id);
    `);

    // 2. Migrate existing notes to pages
    // We assume 'notes' table has: id, title, content (text), folder_id, created_at
    // We assume 'pages' table has: id, title, content (jsonb), created_at
    console.log('Migrating notes to pages...');
    
    // Fetch all notes
    const notesRes = await client.query('SELECT * FROM notes');
    const notes = notesRes.rows;
    
    console.log(`Found ${notes.length} notes to migrate.`);

    for (const note of notes) {
      // Convert plain text content to simple TipTap JSON structure
      const tiptapContent = {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              {
                type: 'text',
                text: note.content || ''
              }
            ]
          }
        ]
      };

      await client.query(`
        INSERT INTO pages (title, content, folder_id, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5)
      `, [note.title, JSON.stringify(tiptapContent), note.folder_id, note.created_at, note.updated_at || new Date()]);
    }

    console.log('Migration complete.');
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    client.release();
    // Close pool to allow script to exit
    await pool.end();
  }
}

migrate();
