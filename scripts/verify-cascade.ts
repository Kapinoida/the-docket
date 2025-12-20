
import pool from '../src/lib/db';
import { createNote, deleteNote, updateTask } from '../src/lib/api';

async function verifyCascade() {
  const client = await pool.connect();
  try {
    console.log('1. Creating Note...');
    const result = await client.query('INSERT INTO notes (title, folder_id) VALUES ($1, $2) RETURNING *', ['Cascade Test Note', 1]);
    const note = result.rows[0];
    console.log('Note created:', note.id);

    console.log('2. Creating Task linked to note...');
    const taskResult = await client.query('INSERT INTO tasks (content, source_note_id) VALUES ($1, $2) RETURNING *', ['Cascade Task', note.id]);
    const task = taskResult.rows[0];
    console.log('Task created:', task.id);

    console.log('3. Deleting Note...');
    await deleteNote(note.id.toString());
    console.log('Note deleted.');

    console.log('4. Verifying Task Deletion...');
    const checkTask = await client.query('SELECT * FROM tasks WHERE id = $1', [task.id]);
    
    if (checkTask.rows.length === 0) {
      console.log('SUCCESS: Task was deleted!');
    } else {
      console.error('FAILURE: Task still exists!', checkTask.rows[0]);
      process.exit(1);
    }

  } catch (error) {
    console.error('Error during verification:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

verifyCascade();
